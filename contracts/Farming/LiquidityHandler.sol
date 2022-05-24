// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/IIbAlluo.sol";
import "../interfaces/IAdapter.sol";
import "hardhat/console.sol";

contract LiquidityHandler is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable {

    using Address for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    //flag for upgrades availability
    bool public upgradeStatus;

    // full info about adapter
    struct AdapterInfo {
        string name; // USD Curve-Aave
        uint256 percentage; //500 == 5.00%
        address adapterAddress; // 0x..
        bool status; // active
    }

    mapping(address => uint256) public ibAlluoToAdapterId;
    mapping(uint256 => AdapterInfo) public adapterIdsToAdapterInfo;

    struct Withdrawal {
        // address of user that did withdrawal
        address user;
        // address of token that user chose to receive
        address token;
        // amount to recieve
        uint256 amount;
        // withdrawal time
        uint256 time;
    }

    struct WithdrawalSystem {
        mapping(uint256 => Withdrawal) withdrawals;
        uint256 lastWithdrawalRequest;
        uint256 lastSatisfiedWithdrawal;
        uint256 totalWithdrawalAmount;
        bool resolverTrigger;
    }

    mapping(address => WithdrawalSystem) public ibAlluoToWithdrawalSystems;

    //info about what adapter or iballuo
    event EnoughToSatisfy(
        uint256 inPoolAfterDeposit, 
        uint256 totalAmountInWithdrawals
    );

    event WithdrawalSatisfied(
        address indexed user, 
        address token, 
        uint256 amount, 
        uint256 queueIndex,
        uint256 satisfiedTime
    );

    event AddedToQueue(
        address indexed user, 
        address token, 
        uint256 amount,
        uint256 queueIndex,
        uint256 requestTime
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "Handler: Not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
    }

    /** @notice Called by ibAlluo, deposits tokens into the adapter.
     * @dev Deposits funds, checks whether adapter is filled or insufficient, and then acts accordingly.
     ** @param _token Address of token (USDC, DAI, USDT...)
     ** @param _amount Amount of tokens in correct deimals (10**18 for DAI, 10**6 for USDT)
     */
    function deposit(address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount18 = _amount * 10 ** (18 - ERC20(_token).decimals());

        uint256 inAdapter = getAdapterAmount(msg.sender);
        uint256 expectedAdapterAmount = getExpectedAdapterAmount(msg.sender, amount18);

        uint256 adapterId = ibAlluoToAdapterId[msg.sender];
        address adapter = adapterIdsToAdapterInfo[adapterId].adapterAddress;

        IERC20Upgradeable(_token).safeTransfer(adapter, _amount);

        if (inAdapter < expectedAdapterAmount) {
            if (expectedAdapterAmount < inAdapter + amount18) {
                uint256 toWallet = inAdapter + amount18 - expectedAdapterAmount;
                uint256 leaveInPool = amount18 - toWallet;

                IAdapter(adapter).deposit(_token, amount18, leaveInPool);

            } else {
                IAdapter(adapter).deposit(_token, amount18, amount18);
            }

        } else {
            IAdapter(adapter).deposit(_token, amount18, 0);
        }

        WithdrawalSystem storage withdrawalSystem = ibAlluoToWithdrawalSystems[msg.sender];

        if(withdrawalSystem.totalWithdrawalAmount > 0 && !withdrawalSystem.resolverTrigger){
            uint256 inAdapterAfterDeposit = getAdapterAmount(msg.sender);
            uint256 firstInQueueAmount = withdrawalSystem.withdrawals[withdrawalSystem.lastSatisfiedWithdrawal + 1].amount;
            if(firstInQueueAmount <= inAdapterAfterDeposit){
                withdrawalSystem.resolverTrigger = true;
                emit EnoughToSatisfy(inAdapterAfterDeposit, withdrawalSystem.totalWithdrawalAmount);
            }
        }
    }

    /** @notice Called by ibAlluo, withdraws tokens from the adapter.
    * @dev Attempt to withdraw. If there are insufficient funds, you are added to the queue.
    ** @param _user Address of depositor 
    ** @param _token Address of token (USDC, DAI, USDT...)
    ** @param _amount Amount of tokens in 10**18
    */
    function withdraw(address _user, address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        uint256 inAdapter = getAdapterAmount(msg.sender);

        WithdrawalSystem storage withdrawalSystem = ibAlluoToWithdrawalSystems[msg.sender];

        if (inAdapter >= _amount && withdrawalSystem.totalWithdrawalAmount == 0) {
            uint256 adapterId = ibAlluoToAdapterId[msg.sender];
            address adapter = adapterIdsToAdapterInfo[adapterId].adapterAddress;
            IAdapter(adapter).withdraw(_user, _token, _amount);
            emit WithdrawalSatisfied(_user, _token, _amount, 0, block.timestamp);

        } else {
            uint256 lastWithdrawalRequest = withdrawalSystem.lastWithdrawalRequest;
            withdrawalSystem.lastWithdrawalRequest++;
            withdrawalSystem.withdrawals[lastWithdrawalRequest] = Withdrawal({
                user: _user,
                token: _token,
                amount: _amount,
                time: block.timestamp
            });
            withdrawalSystem.totalWithdrawalAmount += _amount;
            emit AddedToQueue(_user, _token, _amount, lastWithdrawalRequest, block.timestamp);
        }
    }

    function satisfyAdapterWithdrawals(address _ibAlluo) public whenNotPaused{
        WithdrawalSystem storage withdrawalSystem = ibAlluoToWithdrawalSystems[_ibAlluo];
        uint256 lastWithdrawalRequest =  withdrawalSystem.lastWithdrawalRequest;
        uint256 lastSatisfiedWithdrawal = withdrawalSystem.lastSatisfiedWithdrawal;

        if (lastWithdrawalRequest != lastSatisfiedWithdrawal) {
            uint256 inAdapter = getAdapterAmount(_ibAlluo);
            while (lastSatisfiedWithdrawal != lastWithdrawalRequest) {
                Withdrawal memory withdrawal = withdrawalSystem.withdrawals[lastSatisfiedWithdrawal+1];

                if (withdrawal.amount <= inAdapter) {
                    uint adapterId = ibAlluoToAdapterId[_ibAlluo];
                    address adapter = adapterIdsToAdapterInfo[adapterId].adapterAddress;
                    IAdapter(adapter).withdraw(withdrawal.user, withdrawal.token, withdrawal.amount);
                    
                    inAdapter -= withdrawal.amount;
                    withdrawalSystem.totalWithdrawalAmount -= withdrawal.amount;
                    withdrawalSystem.lastSatisfiedWithdrawal++;
                    lastSatisfiedWithdrawal++;

                    withdrawalSystem.resolverTrigger = false;
                    
                    emit WithdrawalSatisfied(
                        withdrawal.user, 
                        withdrawal.token, 
                        withdrawal.amount, 
                        lastSatisfiedWithdrawal,
                        block.timestamp
                    );
                } else {
                    break;
                }
            }
        }
    }

    function getAdapterAmount(address _ibAlluo) public view returns(uint256) {
        uint256 adapterId = ibAlluoToAdapterId[_ibAlluo];
        address adapter = adapterIdsToAdapterInfo[adapterId].adapterAddress;

        return IAdapter(adapter).getAdapterAmount();
    }

    function getExpectedAdapterAmount(address _ibAlluo, uint256 _newAmount) public view returns(uint256) {

        uint256 adapterId = ibAlluoToAdapterId[_ibAlluo];
        uint256 percentage = adapterIdsToAdapterInfo[adapterId].percentage;

        uint256 totalWithdrawalAmount = ibAlluoToWithdrawalSystems[_ibAlluo].totalWithdrawalAmount;
        
        return (_newAmount + IIbAlluo(_ibAlluo).totalAssetSupply()) * percentage / 10000 + totalWithdrawalAmount;
    }

    ////////////

    function setIbAlluoToAdapterId(address _ibAlluo, uint256 _adapterId) external onlyRole(DEFAULT_ADMIN_ROLE){
        ibAlluoToAdapterId[_ibAlluo] = _adapterId;
    }

    function setAdapter(
        uint256 _id, 
        string memory _name, 
        uint256 _percentage,
        address _adapterAddress,
        bool _status
    )external onlyRole(DEFAULT_ADMIN_ROLE){
        AdapterInfo storage adapter = adapterIdsToAdapterInfo[_id];

        adapter.name = _name;
        adapter.percentage = _percentage;
        adapter.adapterAddress = _adapterAddress;
        adapter.status = _status;
    }

    function changeAdapterStatus(
        uint256 _id, 
        bool _status
    )external onlyRole(DEFAULT_ADMIN_ROLE){
        adapterIdsToAdapterInfo[_id].status = _status;
    }


    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function grantRole(bytes32 role, address account)
    public
    override
    onlyRole(getRoleAdmin(role)) {
        if (role == DEFAULT_ADMIN_ROLE) {
            require(account.isContract(), "Handler: Not contract");
        }
        _grantRole(role, account);
    }

    /**
     * @dev admin function for removing funds from contract
     * @param _address address of the token being removed
     * @param _amount amount of the token being removed
     */
    function removeTokenByAddress(address _address, address _to, uint256 _amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        IERC20Upgradeable(_address).safeTransfer(_to, _amount);
    }

    function changeUpgradeStatus(bool _status)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override {
        require(upgradeStatus, "Handler: Upgrade not allowed");
        upgradeStatus = false;
    }
}

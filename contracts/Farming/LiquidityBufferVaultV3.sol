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
import "../interfaces/IBuffer.sol";
import "./IbAlluoV2.sol";
import "hardhat/console.sol";

contract LiquidityBufferVaultV3 is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable 
{
    
    using Address for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // admin and reserves address
    address public wallet;

    // size of the acceptable slippage with 2 decimals
    // 125 = 1.25%
    uint32 public slippage;

    // address of main contract with which users will interact  
    address public alluoLp;

    //flag for upgrades availability
    bool public upgradeStatus;

    //flag for chainlink keepers that withdrawal can be satisfied 
    bool public keepersTrigger;

    // percent of total alluoLp value which will go to curve pool
    // 525 = 5.25%
    uint32 public bufferPercentage;

    // amount which needed to satisfy all users in withdrawal list
    uint256 public totalWithdrawalAmount;

    // max waiting withdrawals time after which them should be satisfyed
    uint256 public maxWaitingTime;

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

    // list of Withdrawals in queue
    mapping(uint256 => Withdrawal) public withdrawals;

    // index of last withdrawal in queue
    uint256 public lastWithdrawalRequest;
    // index of last satisfied withdrawal in queue
    uint256 public lastSatisfiedWithdrawal;


    event EnoughToSatisfy(
        uint256 inBufferAfterDeposit, 
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

    // full info about Adapter
    struct AdapterInfo {
        string name; // USD Curve-Aave
        address AdapterAddress; // 0x..
        uint256 percentage; //500 == 5.00%
        bool status; // active
        address ibAlluo;
    }
    // all will be stored here
    mapping(uint256 => AdapterInfo) public AdapterIdsToAdapterInfo;
    mapping(address => uint256) public inputTokenToAdapterId;
    uint256[] public AdapterIds;
    address[] public TokenAddresses;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet, address _alluoLp) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "Buffer: Not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _alluoLp);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        wallet = _multiSigWallet;
        bufferPercentage = 500;
        slippage = 200;

        alluoLp = _alluoLp;
        maxWaitingTime = 3600 * 23;
    }

    /** @notice Allow multisig wallet to take out funds. This is when there is no Adapter/pool used.
     ** @param _token Address of the token input
     ** @param _amount Amount of tokens (correct decimals, 10**18 DAI, 10**6 USDC)
     */
    function sendFundsToMultiSig(address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        IERC20Upgradeable(_token).transfer(wallet, _amount);
    }


    /** @notice Check withdrawal queue and satsify all withdrawals possible.
    * @dev Checks if there are outstanding withdrawal and if there are, loops around until there are not enough funds to satisfy anymore 
    **     or until all withdrawals ar satisfied.
    */
    function satisfyWithdrawals() public whenNotPaused{
        if (lastWithdrawalRequest != lastSatisfiedWithdrawal) {
            uint256 inBuffer = getBufferAmount();
            while (lastSatisfiedWithdrawal != lastWithdrawalRequest) {
                Withdrawal memory withdrawal = withdrawals[lastSatisfiedWithdrawal + 1];
                if (withdrawal.amount <= inBuffer) {
                    uint256 _AdapterId = inputTokenToAdapterId[withdrawal.token];
                    // Amount is in 10**18
                    uint256 _amountCorrectDecimals = withdrawal.amount / 10 ** (18 - ERC20(withdrawal.token).decimals());
                    _withdraw(_AdapterId, withdrawal.user, withdrawal.token, _amountCorrectDecimals);
    
                    inBuffer -= withdrawal.amount;
                    totalWithdrawalAmount -= withdrawal.amount;
                    lastSatisfiedWithdrawal++;
                    keepersTrigger = false;
                    
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

    /** @notice Called by ibAlluo, deposits tokens into the buffer.
    * @dev Deposits funds, checks whether buffer is filled or insufficient, and then acts accordingly.
    ** @param _user Address of depositor (msg.sender)
    ** @param _token Address of token (USDC, DAI, USDT...)
    ** @param _amount Amount of tokens in correct deimals (10**18 for DAI, 10**6 for USDT)
    */
    function deposit(address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 inBuffer = getBufferAmount();
        uint256 _amount18 = _amount * 10** (18 - ERC20(_token).decimals());
        uint256 expectedBufferAmount = getExpectedBufferAmount(_amount18);
        uint256 _AdapterId = inputTokenToAdapterId[_token];
        require(_AdapterId != 0, "Token is not accepted");

        if (inBuffer < expectedBufferAmount) {
            if (expectedBufferAmount < inBuffer + _amount18) {
                // Only deposit the amount exceeding the min buffer into the Adapter
                // Convert/Keep remainder input tokens to primary token
                uint256 toBeDeposited = inBuffer + _amount - expectedBufferAmount;
                uint256 _leaveInPool = _amount - toBeDeposited;
                if (_AdapterId != type(uint256).max) {
                    AdapterInfo memory _AdapterInfo = AdapterIdsToAdapterInfo[_AdapterId];
                    address Adapter = _AdapterInfo.AdapterAddress;
                    IAdapter(Adapter).deposit(_token, _amount, _leaveInPool);
                }
                // Else, if Adapter is not active, just hold in the liquidity buffer.


            } else {
                // Else, if ,after the deposit, the buffer is not filled, just hold funds, but convert to primary token. (do nothing)
                // This includes if outstanding withdrawals exist. Therefore, convert and satisfyWithdrawals() to confirm.
                if (_AdapterId != type(uint256).max) {
                    AdapterInfo memory _AdapterInfo = AdapterIdsToAdapterInfo[_AdapterId];
                    address Adapter = _AdapterInfo.AdapterAddress;
                    IAdapter(Adapter).deposit(_token, _amount, _amount);
                }
                // Else, if Adapter is not active, just hold in the liquidity buffer.
            }
          
        } else {
            // If there is sufficient funds in the buffer, immediately send all funds to Adapter
            // Now do delegate call and deposit funds in a LP using an LP
            if (_AdapterId != type(uint256).max) {
                AdapterInfo memory _AdapterInfo = AdapterIdsToAdapterInfo[_AdapterId];
                address Adapter = _AdapterInfo.AdapterAddress;
                IAdapter(Adapter).deposit(_token, _amount, 0);
            }
        }
    }

    // Amount is in 10**18
    function _withdraw(
        uint256 _AdapterId,
        address _user,
        address _tokenFrom,
        uint256 _amount
    ) internal whenNotPaused {
        if (_AdapterId == type(uint256).max) {
            IERC20Upgradeable(_tokenFrom).safeTransfer(_user, _amount);
        } else {
            AdapterInfo memory _AdapterInfo = AdapterIdsToAdapterInfo[_AdapterId];
            address Adapter = _AdapterInfo.AdapterAddress;
            IAdapter(Adapter).withdraw(_user, _tokenFrom, _amount);
        }
    } 

    /** @notice Called by ibAlluo, withdraws otkens form the buffer.
    * @dev Attempt to withdraw. If there are insufficient funds, you are added to the queue.
    ** @param _user Address of depositor (msg.sender)
    ** @param _token Address of token (USDC, DAI, USDT...)
    ** @param _amount Amount of tokens in 10**18
    */
    function withdraw(address _user, address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        uint256 inBuffer = getBufferAmount();
        uint256 _AdapterId = inputTokenToAdapterId[_token];
        require(_AdapterId != 0, "Token is not accepted");

        if (inBuffer >= _amount && lastWithdrawalRequest == lastSatisfiedWithdrawal) {
            // If there are enough funds to payout + all requests are satisfied,
            _withdraw(_AdapterId, _user, _token, _amount);
            emit WithdrawalSatisfied(_user, _token, _amount, 0, block.timestamp);

        } else {
            // Else, if there aren't enough funds, add to queue.
            lastWithdrawalRequest++;
            uint256 timeNow = block.timestamp;
            withdrawals[lastWithdrawalRequest] = Withdrawal({
                user: _user,
                token: _token,
                amount: _amount,
                time: timeNow
            });
            totalWithdrawalAmount += _amount;
            emit AddedToQueue(_user, _token, _amount, lastWithdrawalRequest, timeNow);
        }
    }

    
    function setSlippage(uint32 _newSlippage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippage = _newSlippage;
    }

    function setBufferPercentage(uint32 _newPercentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bufferPercentage = _newPercentage;
    }
    
    function getExpectedBufferAmount(uint256 _newAmount) public view returns(uint256) {
        // Expected buffer amount = 
        //  (newDeposit + totalSupply ibAlluo * index) * bufferPercentage + outstanding withdrawals
        // This is in 10**18.
        return (_newAmount + IERC20Upgradeable(alluoLp).totalSupply()* IbAlluoV2(alluoLp).growingRatio()/10**18) * bufferPercentage / 10000 + totalWithdrawalAmount;
    }

    function getBufferAmount() public view returns(uint256) {
        uint256 bufferAmount;
        
        for (uint256 i = 0; i < TokenAddresses.length; i++) {
            address _tokenAddress = TokenAddresses[i];
            uint256 _adapterId = inputTokenToAdapterId[_tokenAddress];
            if (_adapterId == type(uint256).max) {
                bufferAmount += IERC20(_tokenAddress).balanceOf(address(this));
            } else {
                address Adapter = AdapterIdsToAdapterInfo[_adapterId].AdapterAddress;
                uint256 _AdapterAmount = IAdapter(Adapter).getAdapterAmount();
                bufferAmount += _AdapterAmount;
            }
        }
        return bufferAmount;
    }



    function registerAdapter(
        string calldata _name,
        address _AdapterAddress, 
        uint256 _percentage,
        bool _status,
        address _ibAlluo,
        uint256 _AdapterId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        AdapterIds.push(_AdapterId);

        AdapterInfo memory _AdapterInfo = AdapterInfo(
            _name,
            _AdapterAddress,
            _percentage,
            _status,
            _ibAlluo
        );
        AdapterIdsToAdapterInfo[_AdapterId] = _AdapterInfo;
    }


    function unregisterAdapter(
        uint256 AdapterId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        delete AdapterIdsToAdapterInfo[AdapterId];
        for (uint256 i = 0; i < AdapterIds.length; i++) {
            if (AdapterId == AdapterIds[i]) {

                delete AdapterIds[i];
            }
        }
    }

    function setTokenToAdapter (
        address _token,
        uint256 _AdapterId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        inputTokenToAdapterId[_token] = _AdapterId;
        TokenAddresses.push(_token);
    }
    
   
    function setWallet(address newWallet)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newWallet.isContract(), "Buffer: Not contract");

        wallet = newWallet;
    }

    function setAlluoLp(address newAlluoLp)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newAlluoLp.isContract(), "Buffer: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, newAlluoLp);
        if (alluoLp != wallet) {
            _revokeRole(DEFAULT_ADMIN_ROLE, alluoLp);
        }
        alluoLp = newAlluoLp;
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
        onlyRole(getRoleAdmin(role))
    {
        if(role == DEFAULT_ADMIN_ROLE){
            require(account.isContract(), "Buffer: Not contract");
        }
        _grantRole(role, account);
    }


    function changeUpgradeStatus(bool _status)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function getWithdrawalPosition(uint256 _index) external view returns(uint256){
        if(_index != 0 && _index <= lastWithdrawalRequest && _index > lastSatisfiedWithdrawal ){
            return _index - lastSatisfiedWithdrawal;
        }
        else{
            return 0;
        }
    }

    function isUserWaiting(address _user) external view returns(bool){
        if(lastWithdrawalRequest != lastSatisfiedWithdrawal){
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].user == _user){
                    return true;
                }
            }
        }
        return false;
    }

    function getUserActiveWithdrawals(address _user) external view returns(uint256[] memory){
        if(lastWithdrawalRequest != lastSatisfiedWithdrawal){
            uint256 userRequestAmount;
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].user == _user){
                    userRequestAmount++;
                }
            }
            uint256[] memory indexes = new uint256[](userRequestAmount);
            uint256 counter;
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].user == _user){
                    indexes[counter] = i;
                    counter++;
                }
            }
            return indexes;
        }
        uint256[] memory empty;
        return empty;
    }

    function getCloseToLimitWithdrawals()external view returns(uint256[] memory, uint256 amount){
        if(lastWithdrawalRequest != lastSatisfiedWithdrawal){
            uint256 counter;
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].time >= maxWaitingTime){
                    amount += withdrawals[i].amount;
                    counter++;
                }
            }
            uint256[] memory indexes = new uint256[](counter);
            if(counter !=0){
                uint256 newCounter;
                for(uint i = lastSatisfiedWithdrawal + 1; i <= lastSatisfiedWithdrawal + counter; i++){
                    indexes[newCounter] = i;
                    newCounter++;
                }
            }
            return (indexes, amount);
        }
        uint256[] memory empty;
        return (empty, 0);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override {
        require(upgradeStatus, "Buffer: Upgrade not allowed");
        upgradeStatus = false;
    }
}

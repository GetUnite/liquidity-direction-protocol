// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./AlluoERC20Upgradable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "hardhat/console.sol";
contract AlluoLpV4 is 
    Initializable, 
    PausableUpgradeable, 
    AlluoERC20Upgradable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable 
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // time limit for using update
    uint256 public updateTimeLimit;

    // list of tokens from which deposit available
    EnumerableSetUpgradeable.AddressSet private supportedTokens;

    // admin and reserves address
    address public wallet;

    //flag for upgrades availability
    bool public upgradeStatus;

    // Interest is a 10^12 uint that is a daily APR
    // x^365 = 8% APY
    //  x = 0.02108743983 % ==> Stored as 100021087439
    // Divide by interest factor to get 1.00021087439
    uint interestRate;
    uint interestRateFactor;
    uint interestIndexFactor;
    uint interestIndex;
    uint lastInterestCompound;

    event BurnedForWithdraw(address indexed user, uint256 amount);
    event Deposited(address indexed user, address token, uint256 amount);
    event InterestChanged(uint oldInterest, uint newInterest);
    event NewWalletSet(address oldWallet, address newWallet);
    event UpdateTimeLimitSet(uint256 oldValue, uint256 newValue);
    event DepositTokenStatusChanged(address token, bool status);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet, address[] memory _supportedTokens) public initializer {
        __ERC20_init("ALLUO LP", "LPALL");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "AlluoLpUpgradable: not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);

        updateTimeLimit = 3600;
        wallet = _multiSigWallet;

        interestRate = 100021087;
        interestRateFactor = 10**8;
        interestIndexFactor = 10**18;
        interestIndex = 10**18;

        lastInterestCompound = block.timestamp;

        for(uint256 i = 0; i < _supportedTokens.length; i++){
            supportedTokens.add(_supportedTokens[i]);
        }

        emit NewWalletSet(address(0), wallet);

    }

    /// @notice  Updates the interestIndex
    /// @dev If more than 1 day has passed, find number of periods and calculate correct index. 
    ///      Then update the index and set the lastInterestCompound date.

    function updateInterestIndex() public whenNotPaused {
        if (block.timestamp >= lastInterestCompound + 1 days) {
            uint compoundingPeriods = (block.timestamp - lastInterestCompound)/ 1 days;
            interestIndex = _calculateCompoundedIndex(compoundingPeriods, interestIndex);
            lastInterestCompound = block.timestamp;
        }
    }

    /// @notice  Gas saving view loop to calculate compounding interest
    /// @dev Just loops through and compounds the index.
    /// @param _periods Number of compounding periods
    /// @param _index Current InterestIndex.
    function _calculateCompoundedIndex(uint _periods, uint _index) internal view returns (uint) {
            for (uint i=0; i< _periods; i++) {
                _index = _index * interestRate / interestRateFactor;
            }
            return _index;
    }
    /// @notice  Allows deposits and compounding old balances accurately upon additional deposits
    /// @dev When called, stablecoin is transferred to multisig wallet. 
    ///      Updates the interest index
    ///      Mints adjusted amount of tokens
    /// @param _token Deposit token address (eg. USDC)
    /// @param _amount Amount (parsed 10**18) 

    function deposit(address _token, uint _amount) public whenNotPaused {
        require(supportedTokens.contains(_token), "This token is not supported");
        IERC20Upgradeable(_token).transferFrom(msg.sender, wallet, _amount);
        updateInterestIndex();
        uint adjustedAmount = _amount * interestIndexFactor / interestIndex;
        _mint(msg.sender, adjustedAmount);
        emit Deposited(msg.sender, _token, _amount);
    }

    /// @notice  Withdraws accurately: Allows compounding on withdrawal and burns ERC20
    /// @dev When called, immediately check for accurate compoundde balance. Then mint/burn accordingly to withdrawal amount
    ///      Then adjust deposits array with updated balance and then safeTransfer to the caller.
    /// @param _targetToken Stablecoin desired (eg. USDC)
    /// @param _amount Amount (parsed 10**18) in stablecoins

    function withdraw(address _targetToken, uint256 _amount ) external whenNotPaused {
        require(supportedTokens.contains(_targetToken), "This token is not supported");
        updateInterestIndex();
        uint adjustedAmount = _amount * interestIndexFactor / interestIndex;
        _burn(msg.sender, adjustedAmount);
        IERC20Upgradeable(_targetToken).safeTransfer(msg.sender, _amount);
        emit BurnedForWithdraw(msg.sender, adjustedAmount);
    }

   
    /// @notice  Returns balance in USDC
    /// @param _address address of user

    function getBalance(address _address) public view returns (uint256) {
        uint compoundingPeriods = (block.timestamp - lastInterestCompound)/ 1 days;
        uint _interestIndex = _calculateCompoundedIndex(compoundingPeriods, interestIndex);
        return balanceOf(_address) * _interestIndex / interestIndexFactor;
    }

    function mint(address _user, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        _mint(_user, _amount);
    }

    /// @notice  Sets the new interest rate 
    /// @dev When called, it sets the new interest rate by after updating the index
    /// @param _newInterest New interest rate (100021087 = 0.021087% daily)
  
    function setInterest(uint _newInterest)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint oldValue = interestIndex;
        updateInterestIndex();
        interestRate = _newInterest;
        emit InterestChanged(oldValue, _newInterest);
    }

    /// @notice Migrates balances from old AlluoLP contract 
    /// @dev Matches old balances in the new contract
    /// @param _oldContract Address of old contract
    /// @param _users Array of all user addresses from old contract
    function migrate(address _oldContract, address[] memory _users) external onlyRole(DEFAULT_ADMIN_ROLE){
        updateInterestIndex();
        for(uint i = 0; i < _users.length; i++){
            uint256 oldBalanceIn18 = AlluoLpV4(_oldContract).getBalance(_users[i]) * 10**12;
            uint adjustedAmount = oldBalanceIn18 * interestIndexFactor / interestIndex;
            _mint(_users[i], adjustedAmount);
        }
    }
    function changeTokenStatus(address _token, bool _status) external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if(_status){
            supportedTokens.add(_token);
        }
        else{
            supportedTokens.remove(_token);
        }
        emit DepositTokenStatusChanged(_token, _status);
    }

    function setUpdateTimeLimit(uint256 _newLimit)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldValue = updateTimeLimit;
        updateTimeLimit = _newLimit;

        emit UpdateTimeLimitSet(oldValue, _newLimit);
    }

    function setWallet(address newWallet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newWallet.isContract(), "UrgentAlluoLp: not contract");

        address oldValue = wallet;
        wallet = newWallet;

        emit NewWalletSet(oldValue, newWallet);
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
            require(account.isContract(), "UrgentAlluoLp: not contract");
        }
        _grantRole(role, account);
    }

    function changeUpgradeStatus(bool _status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        upgradeStatus = _status;
    }

    function getListSupportedTokens() public view returns (address[] memory) {
        return supportedTokens.values();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
        view
    {require(upgradeStatus, "Upgrade not allowed");}
}

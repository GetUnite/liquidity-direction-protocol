// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./AlluoERC20Upgradable.sol";
import "./LiquidityBufferVault.sol";
import "hardhat/console.sol";
import "./interestHelper/compound.sol";


import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract AlluoLpV4 is 
    Initializable, 
    PausableUpgradeable, 
    AlluoERC20Upgradable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable ,
    Interest
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Debt factor: variable which grow after any action from user
    // based on current interest rate and time from last update call
    // this is a large number for a more accurate calculation
    uint256 public DF;

    // time of last DF update
    uint256 public lastDFUpdate;

    // time limit for using update
    uint256 public updateTimeLimit;

    // DF of user from last user action on contract
    mapping(address => uint256) public userDF;

    // list of tokens from which deposit available
    EnumerableSetUpgradeable.AddressSet private supportedTokens;

    // constant for percent calculation
    uint256 public DENOMINATOR;

    // admin and reserves address
    address public wallet;

    // current interest rate
    uint8 public interest;
    
    //flag for upgrades availability
    bool public upgradeStatus;

    // contract that will distribute money between curve pool and wallet
    LiquidityBufferVault public liquidityBuffer; 

    // InterestRate = 10**27
    uint interestRate;
    uint interestIndexFactor;
    uint interestIndex;
    uint lastInterestCompound;
    bool migrated;

    event BurnedForWithdraw(address indexed user, uint256 amount);
    event Deposited(address indexed user, address token, uint256 amount);
    event InterestChanged(uint8 oldInterest, uint8 newInterest);
    event NewWalletSet(address oldWallet, address newWallet);
    event ApyClaimed(address indexed user, uint256 apyAmount);
    event UpdateTimeLimitSet(uint256 oldValue, uint256 newValue);
    event DepositTokenStatusChanged(address token, bool status);
    event V4InterestChanged(uint oldInterest, uint newInterest);
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

        updateTimeLimit = 60;
        wallet = _multiSigWallet;

        interestRate = 100000000244041*10**13;
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
        if (block.timestamp >= lastInterestCompound + updateTimeLimit) {
            interestIndex = chargeInterest(interestIndex, interestRate, lastInterestCompound);
            lastInterestCompound = block.timestamp;
        }
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
        uint _interestIndex = chargeInterest(interestIndex, interestRate, lastInterestCompound);
        return balanceOf(_address) * _interestIndex / interestIndexFactor;
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
        emit V4InterestChanged(oldValue, _newInterest);
    }

    /// @notice migrates by setting new interest variables.
    /// @dev Only call this after all balances are claimed (before upgrade is initiated)
    ///  So 1. Claim all balances --> 2. Upgrade the contract  3. Call migrate()

    function migrate() external onlyRole(DEFAULT_ADMIN_ROLE){
        require(!migrated, "Already migrated");
        interestRate = 100000000244041*10**13;
        interestIndexFactor = 10**18;
        interestIndex = 10**18;
        lastInterestCompound = block.timestamp;
        migrated = true;
    }


    function mint(address _user, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        _mint(_user, _amount);
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
        require(newWallet.isContract(), "AlluoLp: Not contract");

        address oldValue = wallet;
        wallet = newWallet;

        emit NewWalletSet(oldValue, newWallet);
    }

    function setLiquidityBuffer(address newBuffer)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newBuffer.isContract(), "AlluoLp: Not contract");

        liquidityBuffer = LiquidityBufferVault(newBuffer);

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
            require(account.isContract(), "AlluoLp: Not contract");
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
    {
        require(upgradeStatus, "AlluoLp: Upgrade not allowed");
        upgradeStatus = false;
    }
}

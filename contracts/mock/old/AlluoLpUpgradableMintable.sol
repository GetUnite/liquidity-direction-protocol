// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../Farming/AlluoERC20Upgradable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "hardhat/console.sol";
contract AlluoLpUpgradableMintable is 
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

    // Epoch contains timestamps that indicate interest rate regime changes.
    // Interest is a 10^12 uint that is a daily APR
    // x^365 = 8% APY
    //  x = 0.02108743983 % ==> Stored as 100021087439
    // Divide by interest factor to get 1.00021087439

    uint interestFactor;
    struct Epoch {
        uint number;
        uint interest;
        uint timestamp;
    }

    struct DepositData {
        uint deposit;
        bool lock;
        uint timestamp;
        Epoch epoch;
    }

    struct PeriodsPerEpoch {
        Epoch epoch;
        uint periods;
    }

    mapping(address => DepositData) public deposits;
    Epoch[] public epochs;

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

        Epoch memory newEpoch = Epoch(0, 100021087, block.timestamp);
        epochs.push(newEpoch);
        updateTimeLimit = 3600;
        wallet = _multiSigWallet;
        interestFactor = 10**8;

        for(uint256 i = 0; i < _supportedTokens.length; i++){
            supportedTokens.add(_supportedTokens[i]);
        }

        emit NewWalletSet(address(0), wallet);

    }

    /// @notice  Allows deposits and compounding old balances accurately upon additional deposits
    /// @dev When called, stablecoin is transferred to multisig wallet. 
    ///      If deposits are empty, simply add to deposit data + mint new tokens
    ///      If there is an existing balance, compound the balance and mint new coins  accordingly
    /// @param _token Deposit token address (eg. USDC)
    /// @param _amount Amount (parsed 10**18) 

    function deposit(address _token, uint _amount) public whenNotPaused {
        require(supportedTokens.contains(_token), "This token is not supported");
        IERC20Upgradeable(_token).transferFrom(msg.sender, wallet, _amount);
        if (deposits[msg.sender].deposit == 0) {
            deposits[msg.sender] = DepositData(_amount, false, block.timestamp, epochs[epochs.length-1]);
            _mint(msg.sender, _amount);
        } else {
            // Compound existing balance first, then set DepositData
            uint compoundedBalance =_getCompoundedBalance(msg.sender);
            _mint(msg.sender, compoundedBalance+_amount - deposits[msg.sender].deposit);
            deposits[msg.sender] = DepositData(compoundedBalance+_amount, false, block.timestamp, epochs[epochs.length-1]);
        }
        emit Deposited(msg.sender, _token, _amount);
    }

    /// @notice  Withdraws accurately: Allows compounding on withdrawal and burns ERC20
    /// @dev When called, immediately check for accurate compoundde balance. Then mint/burn accordingly to withdrawal amount
    ///      Then adjust deposits array with updated balance and then safeTransfer to the caller.
    /// @param _targetToken Stablecoin desired (eg. USDC)
    /// @param _amount Amount (parsed 10**18) 

    function withdraw(address _targetToken, uint256 _amount ) external whenNotPaused {
        require(supportedTokens.contains(_targetToken), "This token is not supported");
        uint compoundedBalance =_getCompoundedBalance(msg.sender);
        if (compoundedBalance - _amount > deposits[msg.sender].deposit) {
            _mint(msg.sender, compoundedBalance - deposits[msg.sender].deposit - _amount);
        } else {
            _burn(msg.sender, deposits[msg.sender].deposit + _amount- compoundedBalance );
        }
        deposits[msg.sender] = DepositData(compoundedBalance-_amount, false, block.timestamp, epochs[epochs.length-1]);
        IERC20Upgradeable(_targetToken).safeTransfer(msg.sender, _amount);

    }


    /// @notice  Calculates accurate compounded balance (even across multiple rate changes)
    /// @dev When called, if insufficient time has passed or never has deposited, return current amount. 
    /// @dev Then call _getPeriodsPerEpoch to get accurate info of how many periods to compound at respective rates
    ///      For example: 6 days at 5%, 30 days at 7%,  13 days at 3% --> in periodsPerEpoch
    ///      Run loop to calculate final compouded depositValue
    /// @param user User's address
    /// @return depositValue Accurate compounded balance.
    function _getCompoundedBalance(address user) internal view returns (uint) {
        // Assume daily compounding:
        if (block.timestamp < deposits[user].timestamp + 1 days || deposits[user].timestamp == 0) {
            return deposits[user].deposit;
        }
        uint currentEpochNumber = epochs[epochs.length-1].number;
        uint depositedEpochNumber = deposits[user].epoch.number;
        uint depositValue = deposits[user].deposit;
        PeriodsPerEpoch[] memory periodsPerEpoch =_getPeriodsPerEpoch(user, currentEpochNumber - depositedEpochNumber + 1);
        for (uint i=0; i < periodsPerEpoch.length; i++) {
            for (uint y=0; y< periodsPerEpoch[i].periods; y++) {
                depositValue = depositValue * periodsPerEpoch[i].epoch.interest / interestFactor;
            }
        }
        return depositValue;
    }

    /// @notice  Finds how many periods have passed under each interest rate change
    /// @dev When called, it compares the current epoch to the epoch when depositdata was last updated
    ///      Then it finds how many compounding periods have passed in each epoch
    ///      For example: 6 days at 5%, 30 days at 7%,  13 days at 3% --> in _periodsPerEpoch
    /// @param user User's address
    /// @param numberofEpochs Current Epoch Number
    /// @return _periodsPerEpoch Array of {Epoch, periods} where Epoch contains epoch data.

    function _getPeriodsPerEpoch(address user, uint numberofEpochs) internal view returns (PeriodsPerEpoch[] memory) {
        uint periods;
        PeriodsPerEpoch[] memory _periodsPerEpoch = new PeriodsPerEpoch[](numberofEpochs);
        for (uint i=0; i < numberofEpochs; i++) {
            Epoch memory currentEpoch = epochs[deposits[user].epoch.number + i];
            uint epochStartTime = currentEpoch.timestamp;
            uint epochEndTime;
            if (i == numberofEpochs -1) {
                epochEndTime = block.timestamp;
            } else {
                epochEndTime = epochs[deposits[user].epoch.number + i+1].timestamp;
            }
            periods = (epochEndTime - epochStartTime) / 1 days;
            PeriodsPerEpoch memory epochData = PeriodsPerEpoch(currentEpoch, periods);
            _periodsPerEpoch[i] = epochData;
        }
        return _periodsPerEpoch;

    }

    function getBalance(address _address) public view returns (uint256) {
        return _getCompoundedBalance(_address);
    }

    function mint(address _user, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
    
        _mint(_user, _amount);
    }

    /// @notice  Sets the new interest rate and pushes a new epoch
    /// @dev When called, it sets the new interest rate by pushing a new epoch
    /// @param _newInterest New interest rate (100021087 = 0.021087% daily)
  
    function setInterest(uint _newInterest)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint oldValue = epochs[epochs.length-1].interest;
        Epoch memory newEpoch = Epoch(epochs.length, _newInterest, block.timestamp);
        epochs.push(newEpoch);
        emit InterestChanged(oldValue, _newInterest);
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

    /// @notice  When any transfer is called, compounds balances appropriately and adjusts balances / mints
    /// @dev When called, it simply updates both to and from balances, mints any difference.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        uint compoundedBalance =_getCompoundedBalance(from);
        if (compoundedBalance > deposits[from].deposit) {
            _mint(from, compoundedBalance - deposits[from].deposit);
        }
        deposits[from] = DepositData(compoundedBalance-amount, false, block.timestamp, epochs[epochs.length-1]);

        uint toCompoundedBalance = _getCompoundedBalance(to);
        if (toCompoundedBalance > deposits[to].deposit) {
            _mint(to, toCompoundedBalance - deposits[to].deposit);
        }
        deposits[to] = DepositData(toCompoundedBalance + amount, false, block.timestamp, epochs[epochs.length-1]);
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {require(upgradeStatus, "Upgrade not allowed");}
}

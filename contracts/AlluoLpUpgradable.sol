// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AlluoERC20Upgradable.sol";

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
        view
    {require(upgradeStatus, "Upgrade not allowed");}
}

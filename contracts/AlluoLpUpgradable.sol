// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./AlluoERC20Upgradable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AlluoLpUpgradable is 
    Initializable, 
    PausableUpgradeable, 
    AlluoERC20Upgradable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable 
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;

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

    // flag for tokens from which deposit available
    mapping(address => bool) public supportedTokens;

    // constant for percent calculation
    uint256 public DENOMINATOR;

    address public wallet;

    // year in seconds
    uint32 public YEAR;
    // current interest rate
    uint8 public interest;

    event BurnedForWithdraw(address indexed user, uint256 amount);
    event Deposited(address indexed user, address token, uint256 amount);
    event InterestChanged(uint8 oldInterest, uint8 newInterest);
    event NewWalletSet(address oldWallet, address newWallet);
    event ApyClaimed(address indexed user, uint256 apyAmount);
    event UpdateTimeLimitSet(uint256 oldValue, uint256 newValue);


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address multiSigWallet, address firstTokenAddress) initializer public {
        __ERC20_init("ALLUO LP", "LPALL");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(multiSigWallet.isContract(), "AlluoLpUpgradable: not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, multiSigWallet);
        _grantRole(UPGRADER_ROLE, multiSigWallet);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);

        DF = 10**20;
        updateTimeLimit = 3600;
        DENOMINATOR = 10**20;
        YEAR = 31536000;
        interest = 8;

        wallet = multiSigWallet;

        supportedTokens[firstTokenAddress] = true;

        lastDFUpdate = block.timestamp;
        update();

        emit InterestChanged(0, interest);
        emit NewWalletSet(address(0), wallet);

    }

    function update() public whenNotPaused {
        uint256 timeFromLastUpdate = block.timestamp - lastDFUpdate;
        if (timeFromLastUpdate >= updateTimeLimit) {
            DF =
                ((DF *
                    (((interest * DENOMINATOR * timeFromLastUpdate) / YEAR) +
                        (100 * DENOMINATOR))) / DENOMINATOR) /
                100;
            lastDFUpdate = block.timestamp;
        }
    }

    function claim(address _address) public whenNotPaused {
        update();
        if (userDF[_address] != 0) {
            uint256 userBalance = balanceOf(_address);
            uint256 userNewBalance = ((DF * userBalance) / userDF[_address]);
            uint256 newAmount = userNewBalance - userBalance;
            if (newAmount != 0) {
                _mint(_address, newAmount);
                emit ApyClaimed(_address, newAmount);
            }
        }
        userDF[_address] = DF;
    }
    
    function withdraw(uint256 _amount) external whenNotPaused {
        claim(msg.sender);
        _burn(msg.sender, _amount);

        emit BurnedForWithdraw(msg.sender, _amount);
    }

    function deposit(address _token, uint256 _amount) external whenNotPaused {
        require(supportedTokens[_token], "this token is not supported");
        
        IERC20Upgradeable(_token).safeTransferFrom(msg.sender, wallet, _amount);

        uint256 amountIn18 = _amount * 10**(18 - AlluoERC20Upgradable(_token).decimals());
        claim(msg.sender);
        _mint(msg.sender, amountIn18);

        emit Deposited(msg.sender, _token, amountIn18);
    }

    function changeTokenStatus(address _token, bool _status) external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        supportedTokens[_token] = _status;
    }

    function setInterest(uint8 _newInterest)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        update();
        uint8 oldValue = interest;
        interest = _newInterest;

        emit InterestChanged(oldValue, _newInterest);
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
        require(account.isContract(), "UrgentAlluoLp: not contract");
        _grantRole(role, account);
    }

    function migrate(address _oldContract, address[] memory _users) external onlyRole(DEFAULT_ADMIN_ROLE){
        for(uint i = 0; i < _users.length; i++){
            uint256 oldBalanceIn18 = AlluoLpUpgradable(_oldContract).getBalance(_users[i]) * 10**12;
            _mint(_users[i], oldBalanceIn18);
        }
    }

    function getBalance(address _address) public view returns (uint256) {
        if (userDF[_address] != 0) {
            uint256 timeFromLastUpdate = block.timestamp - lastDFUpdate;
            uint256 localDF;
            if (timeFromLastUpdate >= updateTimeLimit) {
                localDF =
                    ((DF *
                        (((interest * DENOMINATOR * timeFromLastUpdate) /
                            YEAR) + (100 * DENOMINATOR))) / DENOMINATOR) /
                    100;
            } else {
                localDF = DF;
            }
            return ((localDF * balanceOf(_address)) / userDF[_address]);
        } else {
            return 0;
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        claim(from);
        claim(to);
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}

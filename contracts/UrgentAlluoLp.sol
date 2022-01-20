// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./AlluoERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract UrgentAlluoLp is AlluoERC20, AccessControl {
    using ECDSA for bytes32;
    using Address for address;
    using SafeERC20 for IERC20;

    // Debt factor: variable which grow after any action from user
    // based on current interest rate and time from last update call
    // this is a large number for a more accurate calculation
    uint256 public DF = 10**20;

    // time of last DF update
    uint256 public lastDFUpdate;

    // time limit for using update
    uint256 public updateTimeLimit = 3600;

    // DF of user from last user action on contract
    mapping(address => uint256) public userDF;

    // constant for percent calculation
    uint256 public constant DENOMINATOR = 10**20;

    IERC20 public immutable acceptedToken;

    address public wallet;

    // year in seconds
    uint32 public constant YEAR = 31536000;
    // current interest rate
    uint8 public interest = 8;

    event BurnedForWithdraw(address indexed user, uint256 amount);
    event Deposited(address indexed user, uint256 amount);
    event InterestChanged(uint8 oldInterest, uint8 newInterest);
    event NewWalletSet(address oldWallet, address newWallet);
    event ApyClaimed(address indexed user, uint256 apyAmount);
    event UpdateTimeLimitSet(uint256 oldValue, uint256 newValue);

    constructor(address multiSigWallet, address usdcAddress)
        AlluoERC20("ALLUO LP", "LPALL")
    {
        require(multiSigWallet.isContract(), "UrgentAlluoLp: not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, multiSigWallet);
        wallet = multiSigWallet;

        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);

        acceptedToken = IERC20(usdcAddress);
        lastDFUpdate = block.timestamp;
        update();

        emit InterestChanged(0, interest);
        emit NewWalletSet(address(0), wallet);
    }

    function decimals() public pure virtual override returns (uint8) {
        return 6;
    }

    function update() public {
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

    function claim(address _address) public {
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

    function deposit(uint256 amount) external {
        acceptedToken.safeTransferFrom(msg.sender, wallet, amount);

        claim(msg.sender);
        _mint(msg.sender, amount);

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        claim(msg.sender);
        _burn(msg.sender, amount);

        emit BurnedForWithdraw(msg.sender, amount);
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

    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        require(account.isContract(), "UrgentAlluoLp: not contract");
        _grantRole(role, account);
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

    function withdrawBulk(uint256[] memory _amounts, address[] memory _users)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        for (uint256 i = 0; i < _users.length; i++) {
            require(
                getBalance(_users[i]) >= _amounts[i],
                "UrgentAlluoLp: not enough"
            );

            claim(_users[i]);
            _burn(_users[i], _amounts[i]);

            emit BurnedForWithdraw(_users[i], _amounts[i]);
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
}

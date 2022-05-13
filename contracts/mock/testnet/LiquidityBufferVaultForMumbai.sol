// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./FakeCurve.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LiquidityBufferVaultForMumbai is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // admin and reserves address
    address public wallet;

    // address of main contract with which users will interact
    address public alluoLp;

    //
    FakeCurve public curvePool;

    //
    uint256 private inPoolAmount;

    //flag for upgrades availability
    bool public upgradeStatus;

    // size of the acceptable slippage with 2 decimals
    uint32 public slippage;

    // percent of total alluoLp value which will go to curve pool
    uint32 public bufferPercentage;

    // amount which needed to satisfy all users in withdrawal list
    uint256 public totalWithdrawalAmount;

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
    // list of withrawals in queue
    mapping(uint256 => Withdrawal) public withdrawals;

    // index of last withdrawal in queue
    uint256 public lastWithdrawalRequest;
    // index of last satisfied withdrawal in queue
    uint256 public lastSatisfiedWithdrawal;

    IERC20Upgradeable public DAI;
    IERC20Upgradeable public USDC;
    IERC20Upgradeable public USDT;

    //flag for chainlink keepers that withdrawal can be satisfied
    bool public keepersTrigger;

    event EnoughToSatisfy(
        uint256 inPoolAfterDeposit,
        uint256 totalAmountInWithdrawals
    );

    event WithrawalSatisfied(
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

    function initialize(
        address _multiSigWallet,
        address _alluoLp,
        address _curvePool,
        address _dai,
        address _usdc,
        address _usdt
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _alluoLp);

        wallet = _multiSigWallet;
        bufferPercentage = 500;
        slippage = 200;
        curvePool = FakeCurve(_curvePool);
        alluoLp = _alluoLp;

        DAI = IERC20Upgradeable(_dai);
        USDC = IERC20Upgradeable(_usdc);
        USDT = IERC20Upgradeable(_usdt);

        DAI.safeApprove(_curvePool, type(uint256).max);
        USDC.safeApprove(_curvePool, type(uint256).max);
        USDT.safeApprove(_curvePool, type(uint256).max);
    }

    function deposit(address _token, uint256 _amount)
        external
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 inPool = getBufferAmount();
        if (IERC20Upgradeable(_token) == USDT) {
            uint256 amountIn18 = _amount * 10**12;
            uint256 shouldBeInPool = getExpectedBufferAmount(amountIn18);
            if (inPool < shouldBeInPool) {
                if (shouldBeInPool < inPool + amountIn18) {
                    uint256 toPoolIn18 = shouldBeInPool - inPool;
                    curvePool.add_liquidity(_token, toPoolIn18 / 10**12);
                    uint256 toWalletIn18 = amountIn18 - toPoolIn18;
                    USDT.safeTransfer(wallet, toWalletIn18 / 10**12);
                } else {
                    curvePool.add_liquidity(_token, _amount);
                }
            } else {
                USDT.safeTransfer(wallet, _amount);
            }
        } else if (IERC20Upgradeable(_token) == DAI) {
            uint256 shouldBeInPool = getExpectedBufferAmount(_amount);
            if (inPool < shouldBeInPool) {
                if (shouldBeInPool < inPool + _amount) {
                    uint256 toPoolIn18 = shouldBeInPool - inPool;
                    curvePool.add_liquidity(_token, toPoolIn18);
                    uint256 toWalletIn18 = _amount - toPoolIn18;
                    DAI.safeTransfer(wallet, toWalletIn18);
                } else {
                    curvePool.add_liquidity(_token, _amount);
                }
            } else {
                DAI.safeTransfer(wallet, _amount);
            }
        } else if (IERC20Upgradeable(_token) == USDC) {
            uint256 amountIn18 = _amount * 10**12;
            uint256 shouldBeInPool = getExpectedBufferAmount(amountIn18);
            if (inPool < shouldBeInPool) {
                if (shouldBeInPool < inPool + amountIn18) {
                    uint256 toPoolIn18 = shouldBeInPool - inPool;
                    curvePool.add_liquidity(_token, toPoolIn18 / 10**12);
                    uint256 toWalletIn18 = amountIn18 - toPoolIn18;
                    USDC.safeTransfer(wallet, toWalletIn18 / 10**12);
                } else {
                    curvePool.add_liquidity(_token, _amount);
                }
            } else {
                USDC.safeTransfer(wallet, _amount);
            }
        }

        if (
            lastWithdrawalRequest != lastSatisfiedWithdrawal && !keepersTrigger
        ) {
            uint256 inPoolNow = getBufferAmount();
            if (withdrawals[lastSatisfiedWithdrawal + 1].amount <= inPoolNow) {
                keepersTrigger = true;
                emit EnoughToSatisfy(inPoolNow, totalWithdrawalAmount);
            }
        }
    }

    function withdraw(
        address _user,
        address _token,
        uint256 _amount
    ) external whenNotPaused {
        uint256 inPool = getBufferAmount();
        if (
            inPool > _amount && lastWithdrawalRequest == lastSatisfiedWithdrawal
        ) {
            uint256 returned;
            if (IERC20Upgradeable(_token) == USDC) {
                returned = curvePool.remove_liquidity(_token, _amount);
                USDC.safeTransfer(_user, returned);
            } else if (IERC20Upgradeable(_token) == USDT) {
                returned = curvePool.remove_liquidity(_token, _amount);
                USDT.safeTransfer(_user, returned);
            } else if (IERC20Upgradeable(_token) == DAI) {
                returned = curvePool.remove_liquidity(_token, _amount);
                DAI.safeTransfer(_user, returned);
            }
            emit WithrawalSatisfied(
                _user,
                _token,
                returned,
                0,
                block.timestamp
            );
        } else {
            lastWithdrawalRequest++;
            uint256 timeNow = block.timestamp;
            withdrawals[lastWithdrawalRequest] = Withdrawal({
                user: _user,
                token: _token,
                amount: _amount,
                time: timeNow
            });
            totalWithdrawalAmount += _amount;
            emit AddedToQueue(
                _user,
                _token,
                _amount,
                lastWithdrawalRequest,
                timeNow
            );
        }
    }

    function satisfyWithdrawals() external whenNotPaused {
        if (lastWithdrawalRequest != lastSatisfiedWithdrawal) {
            uint256 inPool = getBufferAmount();
            while (lastSatisfiedWithdrawal != lastWithdrawalRequest) {
                Withdrawal memory withdrawal = withdrawals[
                    lastSatisfiedWithdrawal + 1
                ];
                uint256 amount = withdrawal.amount;
                if (amount <= inPool) {
                    uint256 returned;
                    if (IERC20Upgradeable(withdrawal.token) == USDC) {
                        returned = curvePool.remove_liquidity(
                            withdrawal.token,
                            withdrawal.amount
                        );
                        USDC.safeTransfer(withdrawal.user, returned);
                    } else if (IERC20Upgradeable(withdrawal.token) == USDT) {
                        returned = curvePool.remove_liquidity(
                            withdrawal.token,
                            withdrawal.amount
                        );
                        USDT.safeTransfer(withdrawal.user, returned);
                    } else if (IERC20Upgradeable(withdrawal.token) == DAI) {
                        returned = curvePool.remove_liquidity(
                            withdrawal.token,
                            withdrawal.amount
                        );
                        DAI.safeTransfer(withdrawal.user, returned);
                    }
                    inPool -= amount;
                    totalWithdrawalAmount -= amount;
                    lastSatisfiedWithdrawal++;
                    keepersTrigger = false;

                    emit WithrawalSatisfied(
                        withdrawal.user,
                        withdrawal.token,
                        returned,
                        lastSatisfiedWithdrawal,
                        block.timestamp
                    );
                } else {
                    break;
                }
            }
        }
    }

    function setSlippage(uint32 _newSlippage)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        slippage = _newSlippage;
    }

    function setBufferPersentage(uint32 _newPercentage)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bufferPercentage = _newPercentage;
    }

    function getExpectedBufferAmount(uint256 _newAmount)
        public
        view
        returns (uint256)
    {
        return
            ((_newAmount + ERC20(alluoLp).totalSupply()) * bufferPercentage) /
            10000 +
            totalWithdrawalAmount;
    }

    function getBufferAmount() public view returns (uint256) {
        return ERC20(address(curvePool)).balanceOf(address(this));
    }

    function setWallet(address newWallet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newWallet.isContract(), "LiquidityBufferVault: not contract");

        address oldValue = wallet;
        wallet = newWallet;
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
        if (role == DEFAULT_ADMIN_ROLE) {
            require(account.isContract(), "LiquidityBufferVault: Not contract");
        }
        _grantRole(role, account);
    }

    function changeUpgradeStatus(bool _status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        upgradeStatus = _status;
    }

    function getWithdrawalPosition(uint256 _index)
        external
        view
        returns (uint256)
    {
        if (
            _index != 0 &&
            _index <= lastWithdrawalRequest &&
            _index > lastSatisfiedWithdrawal
        ) {
            return _index - lastSatisfiedWithdrawal;
        } else {
            return 0;
        }
    }

    function isUserWaiting(address _user) external view returns (bool) {
        if (lastWithdrawalRequest != lastSatisfiedWithdrawal) {
            for (
                uint256 i = lastSatisfiedWithdrawal + 1;
                i <= lastWithdrawalRequest;
                i++
            ) {
                if (withdrawals[i].user == _user) {
                    return true;
                }
            }
        }
        return false;
    }

    function getUserActiveWithdrawals(address _user)
        external
        view
        returns (uint256[] memory)
    {
        if (lastWithdrawalRequest != lastSatisfiedWithdrawal) {
            uint256 userRequestAmount;
            for (
                uint256 i = lastSatisfiedWithdrawal + 1;
                i <= lastWithdrawalRequest;
                i++
            ) {
                if (withdrawals[i].user == _user) {
                    userRequestAmount++;
                }
            }
            uint256[] memory indexes = new uint256[](userRequestAmount);
            uint256 counter;
            for (
                uint256 i = lastSatisfiedWithdrawal + 1;
                i <= lastWithdrawalRequest;
                i++
            ) {
                if (withdrawals[i].user == _user) {
                    indexes[counter] = i;
                    counter++;
                }
            }
            return indexes;
        }
        uint256[] memory empty;
        return empty;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        require(upgradeStatus, "LiquidityBufferVault: Upgrade not allowed");
        upgradeStatus = false;
    }
}

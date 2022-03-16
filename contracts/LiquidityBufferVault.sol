// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./interfaces/ICurvePool.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract LiquidityBufferVault is
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

    // AAVE curve pool
    ICurvePool public curvePool;

    //flag for upgrades availability
    bool public upgradeStatus;

    // size of the acceptable slippage with 2 decimals
    // 125 = 1.25%
    uint32 public slippage;

    // percent of total alluoLp value which will go to curve pool
    // 525 = 5.25%
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
    }

    // list of withrawals in queue
    mapping(uint256 => Withdrawal) public withdrawals;

    // index of last withdrawal in queue
    uint256 public lastWithdrawalRequest;
    // index of last satisfied withdrawal in queue
    uint256 public lastSatisfiedWithdrawal;

    // acceptable by alluoLp and curve tokens as deposit
    IERC20Upgradeable public constant DAI =
        IERC20Upgradeable(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063);
    IERC20Upgradeable public constant USDC =
        IERC20Upgradeable(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174);
    IERC20Upgradeable public constant USDT =
        IERC20Upgradeable(0xc2132D05D31c914a87C6611C10748AEb04B58e8F);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet, address _alluoLp, address _curvePool) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "LiquidityBufferVault: not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _alluoLp);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        wallet = _multiSigWallet;
        bufferPercentage = 500;
        slippage = 200;
        curvePool = ICurvePool(_curvePool);
        alluoLp = _alluoLp;

        DAI.safeApprove(_curvePool, type(uint256).max);
        USDC.safeApprove(_curvePool, type(uint256).max);
        USDT.safeApprove(_curvePool, type(uint256).max);
    }

    // function checks how much in buffer now and hom much should be
    // fill buffer and send to wallet what left (conveting it to usdc)
    function deposit(address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){

        uint256 inPool = getBufferAmount();
        if (IERC20Upgradeable(_token) == USDT) {
            uint256 amountIn18 = _amount * 10 ** 12;
            uint256 lpAmount = curvePool.add_liquidity([0, 0, _amount], 0, true);
            uint256 shouldBeInPool = getExpectedBufferAmount(amountIn18);
            if (inPool < shouldBeInPool) {

                if (shouldBeInPool < inPool + amountIn18) {
                    uint256 toWallet = inPool + amountIn18 - shouldBeInPool;
                    uint256 toWalletIn6 = toWallet / 10 ** 12;
                    curvePool.remove_liquidity_imbalance(
                        [0, toWalletIn6, 0], 
                        toWallet * (10000 + slippage) / 10000, 
                        true
                    );
                    USDC.safeTransfer(wallet, toWalletIn6);
                }
            } else {
                uint256 toWallet = curvePool.remove_liquidity_one_coin(
                    lpAmount, 
                    1, 
                    lpAmount * (10000 - slippage) / 10000, 
                    true
                );
                USDC.safeTransfer(wallet, toWallet);
            }
        } else if (IERC20Upgradeable(_token) == DAI) {
            uint256 lpAmount = curvePool.add_liquidity([_amount, 0, 0], 0, true);
            uint256 shouldBeInPool = getExpectedBufferAmount(_amount);
            if (inPool < shouldBeInPool) {
                if (shouldBeInPool < inPool + _amount) {
                    uint256 toWallet = inPool + _amount - shouldBeInPool;

                    uint256 toWalletIn6 = toWallet / 10 ** 12;
                    curvePool.remove_liquidity_imbalance(
                        [0, toWalletIn6, 0], 
                        toWallet * (10000 + slippage) / 10000, 
                        true
                    );
                    USDC.safeTransfer(wallet, toWalletIn6);
                }
            } else {
                uint256 toWallet = curvePool.remove_liquidity_one_coin(
                    lpAmount, 
                    1, 
                    lpAmount * (10000 - slippage) / 10000, 
                    true
                );
                USDC.safeTransfer(wallet, toWallet);
            }
        } else if (IERC20Upgradeable(_token) == USDC) {
            uint256 amountIn18 = _amount * 10 ** 12;
            uint256 shouldBeInPool = getExpectedBufferAmount(amountIn18);
            if (inPool < shouldBeInPool) {

                if (shouldBeInPool < inPool + amountIn18) {
                    uint256 toPoolIn18 = shouldBeInPool - inPool;
                    curvePool.add_liquidity(
                        [0, toPoolIn18 / 10 ** 12, 0], 
                        0, 
                        true
                    );
                    USDC.safeTransfer(wallet, (amountIn18 - toPoolIn18) / 10 ** 12);
                } else {
                    curvePool.add_liquidity([0, _amount, 0], 0, true);
                }
            } else {
                USDC.safeTransfer(wallet, _amount);
            }
        }

    }


    // function checks is in buffer enoght tokens to satisfy withdraw
    // or is queue empty, if so sending chosen tokens
    // if not adding withdrawal in queue
    function withdraw(address _user, address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){

        uint256 inPool = getBufferAmount();
        if (inPool > _amount && lastWithdrawalRequest == lastSatisfiedWithdrawal) {

            if (IERC20Upgradeable(_token) == USDC) {
                // We want to be safe agains arbitragers so at any withraw of USDT/USDC
                // contract checks how much will be burned curveLp by withrawing this amount in DAI
                // and passes this burned amount to get USDC/USDT
                uint256 toBurn = curvePool.calc_token_amount([_amount, 0, 0], false);
                uint256 amountIn6 = _amount / 10 ** 12;
                uint256 toUser = curvePool.remove_liquidity_one_coin(
                    toBurn, 
                    1, 
                    amountIn6 * (10000 - slippage) / 10000, 
                    true
                );
                USDC.safeTransfer(_user, toUser);
            } else if (IERC20Upgradeable(_token) == USDT) {
                uint256 toBurn = curvePool.calc_token_amount([_amount, 0, 0], false);
                uint256 amountIn6 = _amount / 10 ** 12;
                uint256 toUser = curvePool.remove_liquidity_one_coin(
                    toBurn, 
                    2, 
                    amountIn6 * (10000 - slippage) / 10000, 
                    true
                );
                USDT.safeTransfer(_user, toUser);
            } else if (IERC20Upgradeable(_token) == DAI) {
                curvePool.remove_liquidity_imbalance(
                    [_amount, 0, 0], 
                    _amount * (10000 + slippage) / 10000, 
                    true
                );
                DAI.safeTransfer(_user, _amount);
            }
        } else {
            withdrawals[lastWithdrawalRequest] = Withdrawal({
                user: _user,
                token: _token,
                amount: _amount
            });
            totalWithdrawalAmount += _amount;
            lastWithdrawalRequest++;
        }
    }

    // function for satisfaction withdrawals in queue
    // triggered by BE or chainlink keepers  
    function satisfyWithdrawals() external whenNotPaused{
        if (lastWithdrawalRequest != lastSatisfiedWithdrawal) {

            uint256 inPool = getBufferAmount();
            while (lastSatisfiedWithdrawal != lastWithdrawalRequest) {
                Withdrawal memory withdrawal = withdrawals[lastSatisfiedWithdrawal];
                uint256 amount = withdrawal.amount;
                if (amount <= inPool) {
                    if (IERC20Upgradeable(withdrawal.token) == USDC) {
                        uint256 toBurn = curvePool.calc_token_amount([amount, 0, 0], false);
                        uint256 amountIn6 = amount / 10 ** 12;
                        uint256 toUser = curvePool.remove_liquidity_one_coin(
                            toBurn, 
                            1, 
                            amountIn6 * (10000 - slippage) / 10000, 
                            true
                        );
                        USDC.safeTransfer(withdrawal.user, toUser);
                    } 
                    else if (IERC20Upgradeable(withdrawal.token) == USDT) {
                        uint256 toBurn = curvePool.calc_token_amount([amount, 0, 0], false);
                        uint256 amountIn6 = amount / 10 ** 12;
                        uint256 toUser = curvePool.remove_liquidity_one_coin(
                            toBurn, 
                            2, 
                            amountIn6 * (10000 - slippage) / 10000, 
                            true
                        );
                        USDT.safeTransfer(withdrawal.user, toUser);
                    }
                    else if (IERC20Upgradeable(withdrawal.token) == DAI) {

                        curvePool.remove_liquidity_imbalance(
                            [amount, 0, 0], 
                            amount * (10000 + slippage) / 10000, 
                            true
                        );

                        DAI.safeTransfer(withdrawal.user, amount);
                    }
                    inPool -= amount;
                    totalWithdrawalAmount -= amount;
                    lastSatisfiedWithdrawal++;
                } else {
                    break;
                }
            }
        }
    }

    function setSlippage(uint32 _newSlippage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippage = _newSlippage;
    }

    function setBufferPersentage(uint32 _newPercentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bufferPercentage = _newPercentage;
    }

    function getExpectedBufferAmount(uint256 _newAmount) public view returns(uint256) {
        return (_newAmount + ERC20(alluoLp).totalSupply()) * bufferPercentage / 10000 + totalWithdrawalAmount;
    }

    function getBufferAmount() public view returns(uint256) {
        uint256 curveLp = IERC20(curvePool.lp_token()).balanceOf(address(this));

        if(curveLp != 0){
            return curvePool.calc_withdraw_one_coin(curveLp, 0);
        }
        return 0;
    }

    function setWallet(address newWallet)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newWallet.isContract(), "LiquidityBufferVault: not contract");

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
        if(role == DEFAULT_ADMIN_ROLE){
            require(account.isContract(), "LiquidityBufferVault: Not contract");
        }
        _grantRole(role, account);
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
        require(upgradeStatus, "LiquidityBufferVault: Upgrade not allowed");
    }
}

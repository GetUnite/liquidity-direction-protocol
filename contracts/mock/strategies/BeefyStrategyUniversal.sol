// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IAlluoStrategyV3} from "./interfaces/IAlluoStrategyV3.sol";
import {IExchange} from "./interfaces/IExchange.sol";
import {IPriceFeedRouterV2} from "./interfaces/IPriceFeedRouterV2.sol";
import {IWrappedEther} from "./interfaces/IWrappedEther.sol";
import {IBeefyVaultV6} from "./interfaces/IBeefyVaultV6.sol";
import {IBeefyBoost} from "./interfaces/IBeefyBoost.sol";

import {IERC20MetadataUpgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {ExchangePriceOracle} from "./../../automatedCrosschain/priceOracle/ExchangePriceOracle.sol";

import "hardhat/console.sol";

contract BeefyStrategyUniversal is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IAlluoStrategyV3
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    EnumerableSetUpgradeable.AddressSet private expectedRewards;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    bool public upgradeStatus;
    IPriceFeedRouterV2 public priceFeed;
    IExchange public exchange;
    IWrappedEther public weth;
    ExchangePriceOracle public oracle;
    uint32 public priceDeadline;

    // 10000 max - 10%
    // 1000 - 1%
    // 100 - 0.1%
    // 10 - 0.01%
    // 1 - 0.001%
    // minOut = (out * (100000 - acceptableSlippage)) / 100000
    uint16 public acceptableSlippage;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _multiSigWallet,
        address _voteExecutor,
        address _strategyHandler,
        address _priceFeed,
        address _exchange,
        address _wrappedEther
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        priceFeed = IPriceFeedRouterV2(_priceFeed);
        exchange = IExchange(_exchange);
        weth = IWrappedEther(_wrappedEther);

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _voteExecutor);
        _grantRole(DEFAULT_ADMIN_ROLE, _strategyHandler);

        _grantRole(UPGRADER_ROLE, _multiSigWallet);
    }

    function getExpectedRewards() external view returns (address[] memory) {
        return expectedRewards.values();
    }

    function getExpectedEntryExchangeRequests(
        bytes calldata data
    ) external pure returns (ExchangeRequest[] memory) {
        (address beefyVaultAddress, , , address entryToken) = decodeData(data);

        ExchangeRequest[] memory request = new ExchangeRequest[](1);
        request[0] = ExchangeRequest(entryToken, beefyVaultAddress);

        return request;
    }

    function getExpectedExitExchangeRequests(
        bytes calldata data,
        address outputCoin,
        bool swapRewards
    ) external view returns (ExchangeRequest[] memory) {
        (address beefyVaultAddress, , , ) = decodeData(data);

        if (!swapRewards) {
            ExchangeRequest[] memory requestSingle = new ExchangeRequest[](1);
            requestSingle[0] = ExchangeRequest(beefyVaultAddress, outputCoin);

            return requestSingle;
        }

        uint256 len = expectedRewards.length();
        ExchangeRequest[] memory request = new ExchangeRequest[](len + 1);
        request[0] = ExchangeRequest(beefyVaultAddress, outputCoin);

        for (uint256 i = 1; i <= len; i++) {
            address reward = expectedRewards.at(i);
            request[i] = ExchangeRequest(reward, outputCoin);
        }

        return request;
    }

    function getExpectedRewardsExchangeRequests(
        bytes calldata data,
        address outputCoin,
        bool swapRewards
    ) external view returns (ExchangeRequest[] memory) {
        (, address beefyBoostAddress, , ) = decodeData(data);

        if (beefyBoostAddress == address(0) && !swapRewards) {
            ExchangeRequest[] memory requestEmpty = new ExchangeRequest[](0);
            return requestEmpty;
        }

        uint256 len = expectedRewards.length();
        ExchangeRequest[] memory request = new ExchangeRequest[](len);

        for (uint256 i = 0; i < len; i++) {
            address reward = expectedRewards.at(i);
            request[i] = ExchangeRequest(reward, outputCoin);
        }

        return request;
    }

    function changeExpectedRewardStatus(
        address token,
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (status) {
            expectedRewards.add(token);
        } else {
            expectedRewards.remove(token);
        }
    }

    /// @notice Invest tokens transferred to this contract.
    /// @dev Amount of tokens specified in `amount` is guranteed to be
    /// transferred to strategy by vote executor.
    /// @param data whatever data you want to pass to strategy from vote extry.
    /// @param amount amount of your tokens that will be invested.
    function invest(
        bytes calldata data,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount == 0) return;

        (
            address beefyVaultAddress,
            address beefyBoostAddress,
            ,
            address entryToken
        ) = decodeData(data);
        IERC20Upgradeable(entryToken).safeIncreaseAllowance(
            address(exchange),
            amount
        );
        console.log("Entry token", entryToken);
        console.log("Beefy vault", beefyVaultAddress);
        console.log("Amount", amount);
        uint256 mooTokensAmount = exchange.exchange(
            entryToken,
            beefyVaultAddress,
            amount,
            getExchangeMinOutputAmount(entryToken, beefyVaultAddress, amount)
        );
        console.log(mooTokensAmount);

        if (beefyBoostAddress != address(0)) {
            IERC20Upgradeable(beefyVaultAddress).safeIncreaseAllowance(
                beefyBoostAddress,
                mooTokensAmount
            );

            IBeefyBoost(beefyBoostAddress).stake(mooTokensAmount);
        }
    }

    /// @notice Uninvest value and tranfer exchanged value to receiver.
    /// @param data whatever data you want to pass to strategy from vote extry.
    /// @param unwindPercent percentage of available assets to be released with 2 decimal points.
    /// @param outputCoin address of token that strategy MUST return.
    /// @param receiver address where tokens should go.
    /// @param swapRewards true if rewards are needed to swap to `outputCoin`, false otherwise.
    function exitAll(
        bytes calldata data,
        uint256 unwindPercent,
        IERC20 outputCoin,
        address receiver,
        bool _withdrawRewards,
        bool swapRewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (address beefyVaultAddress, address beefyBoostAddress, , ) = decodeData(
            data
        );
        IERC20Upgradeable vaultToken = IERC20Upgradeable(beefyVaultAddress);

        if (beefyBoostAddress != address(0)) {
            uint256 unboostAmount = (IBeefyBoost(beefyBoostAddress).balanceOf(
                address(this)
            ) * unwindPercent) / 10000;
            if (_withdrawRewards) {
                IBeefyBoost(beefyBoostAddress).getReward();
            }
            IBeefyBoost(beefyBoostAddress).withdraw(unboostAmount);
        }

        uint256 lpAmountToSwap = (vaultToken.balanceOf(address(this)) *
            unwindPercent) / 10000;
        // execute exchanges and transfer all tokens to receiver
        vaultToken.safeIncreaseAllowance(address(exchange), lpAmountToSwap);
        exchange.exchange(
            address(vaultToken),
            address(outputCoin),
            lpAmountToSwap,
            getExchangeMinOutputAmount(
                address(vaultToken),
                address(outputCoin),
                lpAmountToSwap
            )
        );
        if (_withdrawRewards) {
            _manageRewardsAndWithdraw(
                swapRewards,
                IERC20Upgradeable(address(outputCoin)),
                receiver
            );
        } else {
            IERC20Upgradeable(address(outputCoin)).safeTransfer(
                receiver,
                outputCoin.balanceOf(address(this))
            );
        }
    }

    // function getDeployedAmountAndRewards(
    //     bytes calldata data
    // ) external returns (uint256) {
    //     (
    //         address beefyVaultAddress,
    //         address beefyBoostAddress,
    //         uint256 assetId
    //     ) = decodeData(data);

    //     uint256 lpAmount;
    //     if (beefyBoostAddress != address(0)) {
    //         lpAmount = IBeefyBoost(beefyBoostAddress).balanceOf(address(this));
    //         IBeefyBoost(beefyBoostAddress).getReward();
    //     } else {
    //         lpAmount = IBeefyVaultV6(beefyVaultAddress).balanceOf(
    //             address(this)
    //         );
    //     }

    //     if (lpAmount == 0) {
    //         return 0;
    //     }

    //     lpAmount =
    //         (lpAmount *
    //             IBeefyVaultV6(beefyVaultAddress).getPricePerFullShare()) /
    //         1e18;
    //     address tokenInvested = IBeefyVaultV6(beefyVaultAddress).want();

    //     (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
    //         .getPriceOfAmount(tokenInvested, lpAmount, assetId);

    //     return
    //         IPriceFeedRouterV2(priceFeed).decimalsConverter(
    //             fiatPrice,
    //             fiatDecimals,
    //             18
    //         );
    // }

    /// @notice Claim available rewards.
    /// @param data whatever data you want to pass to strategy from vote extry.
    /// @param outputCoin address of token that strategy MUST return (if swapRewards is true).
    /// @param receiver address where tokens should go.
    /// @param swapRewards true if rewards are needed to swap to `outputCoin`, false otherwise.
    function exitOnlyRewards(
        bytes calldata data,
        address outputCoin,
        address receiver,
        bool swapRewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (, address beefyBoostAddress, , ) = decodeData(data);

        if (beefyBoostAddress != address(0)) {
            IBeefyBoost(beefyBoostAddress).getReward();

            _manageRewardsAndWithdraw(
                swapRewards,
                IERC20Upgradeable(outputCoin),
                receiver
            );
        }
    }

    function withdrawRewards(
        address _token
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _manageRewardsAndWithdraw(true, IERC20Upgradeable(_token), msg.sender);
    }

    function getDeployedAmount(
        bytes calldata data
    ) external view returns (uint256) {
        (
            address beefyVaultAddress,
            address beefyBoostAddress,
            uint256 assetId,
            address entryToken
        ) = decodeData(data);

        uint256 lpAmount;
        if (beefyBoostAddress != address(0)) {
            lpAmount = IBeefyBoost(beefyBoostAddress).balanceOf(address(this));
        } else {
            lpAmount = IBeefyVaultV6(beefyVaultAddress).balanceOf(
                address(this)
            );
        }

        if (lpAmount == 0) {
            return 0;
        }

        (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
            .getPriceOfAmount(beefyVaultAddress, lpAmount, assetId);

        return
            IPriceFeedRouterV2(priceFeed).decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );
    }

    // Temp function
    function getDeployedAmountAndRewards(
        bytes calldata data
    ) external view returns (uint256) {
        (
            address beefyVaultAddress,
            address beefyBoostAddress,
            uint256 assetId,
            address entryToken
        ) = decodeData(data);

        uint256 lpAmount;
        if (beefyBoostAddress != address(0)) {
            lpAmount = IBeefyBoost(beefyBoostAddress).balanceOf(address(this));
        } else {
            lpAmount = IBeefyVaultV6(beefyVaultAddress).balanceOf(
                address(this)
            );
        }

        if (lpAmount == 0) {
            return 0;
        }

        (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(priceFeed)
            .getPriceOfAmount(beefyVaultAddress, lpAmount, assetId);

        return
            IPriceFeedRouterV2(priceFeed).decimalsConverter(
                fiatPrice,
                fiatDecimals,
                18
            );
    }

    function decodeData(
        bytes calldata data
    )
        public
        pure
        returns (
            address beefyVaultAddress,
            address beefyBoostAddress,
            uint256 assetId,
            address entryToken
        )
    {
        (beefyVaultAddress, beefyBoostAddress, assetId, entryToken) = abi
            .decode(data, (address, address, uint256, address));
    }

    function encodeData(
        address beefyVaultAddress,
        address beefyBoostAddress,
        uint256 assetId,
        address entryToken
    ) public pure returns (bytes memory data) {
        data = abi.encode(
            beefyVaultAddress,
            beefyBoostAddress,
            assetId,
            entryToken
        );
    }

    function setAddresses(
        address _priceFeed,
        address _exchange
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceFeed = IPriceFeedRouterV2(_priceFeed);
        exchange = IExchange(_exchange);
    }

    function setOracle(address _oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        oracle = ExchangePriceOracle(_oracle);
    }

    function setPriceDeadline(
        uint32 _deadline
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceDeadline = _deadline;
    }

    function setAcceptableSlippage(
        uint16 _acceptableSlippage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        acceptableSlippage = _acceptableSlippage;
    }

    /// @notice Execute any action on behalf of strategy.
    /// @dev Regular call is executed. If any of extcall fails, transaction should revert.
    /// @param destinations addresses to call
    /// @param calldatas calldatas to execute
    function multicall(
        address[] calldata destinations,
        bytes[] calldata calldatas
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = destinations.length;
        require(length == calldatas.length, "BeefyStrategy: lengths");
        for (uint256 i = 0; i < length; i++) {
            destinations[i].functionCall(calldatas[i]);
        }
    }

    function changeUpgradeStatus(
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(UPGRADER_ROLE) {
        require(upgradeStatus, "Executor: Upgrade not allowed");
        upgradeStatus = false;
    }

    /// @notice Swaps all rewards if instructed to the output coin and sends the funds to the receiver
    /// @dev Explain to a developer any extra details
    /// @param swapRewards bool to swap or not
    /// @param outputCoin IERC20
    /// @param receiver receiver of the funds
    function _manageRewardsAndWithdraw(
        bool swapRewards,
        IERC20Upgradeable outputCoin,
        address receiver
    ) private {
        uint256 len = expectedRewards.length();
        if (swapRewards) {
            for (uint256 i = 0; i < len; i++) {
                IERC20Upgradeable token = IERC20Upgradeable(
                    expectedRewards.at(i)
                );
                _exchangeAll(token, outputCoin);
            }
        } else {
            for (uint256 i = 0; i < len; i++) {
                IERC20Upgradeable token = IERC20Upgradeable(
                    expectedRewards.at(i)
                );
                token.safeTransfer(receiver, token.balanceOf(address(this)));
            }
        }
        outputCoin.safeTransfer(receiver, outputCoin.balanceOf(address(this)));
    }

    /// @notice Exchanges the fromCoin to the toCoin
    /// @dev Explain to a developer any extra details
    /// @param fromCoin IERC20
    /// @param toCoin  IERC20
    function _exchangeAll(
        IERC20Upgradeable fromCoin,
        IERC20Upgradeable toCoin
    ) internal {
        if (fromCoin == toCoin) return;
        uint256 amount = fromCoin.balanceOf(address(this));
        if (amount == 0) return;
        console.log("FromCoin address", address(fromCoin));
        console.log("ToCoin address", address(toCoin));
        console.log("Amount", amount);
        fromCoin.safeApprove(address(exchange), amount);
        exchange.exchange(
            address(fromCoin),
            address(toCoin),
            amount,
            getExchangeMinOutputAmount(
                address(fromCoin),
                address(toCoin),
                amount
            )
        );
    }

    function getExchangeMinOutputAmount(
        address fromToken,
        address toToken,
        uint256 amount
    ) internal view returns (uint256) {
        if (address(oracle) == address(0)) {
            console.log("WARN: Exchange price oracle is not set!");
            return 0;
        }

        console.log("Looking for exchange price on exchange oracle");
        console.log("from", fromToken);
        console.log("to", toToken);
        console.log("amount", amount);

        (uint216 result, uint8 decimals, uint32 timestamp) = oracle
            .priceRequests(fromToken, toToken);

        uint256 fromTokenOne = 10 ** decimals;

        console.log("result", result);
        console.log("timestamp", timestamp);

        require(
            timestamp + priceDeadline <= block.timestamp,
            "Oracle: Price too old"
        );

        uint256 minOutPricePerToken = (result * (100000 - acceptableSlippage)) /
            100000;
        return (amount * minOutPricePerToken) / fromTokenOne;
    }
}

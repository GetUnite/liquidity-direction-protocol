
[<img width="200" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>



# Solidity Metrics for GetAlluo/liquidity-direction-protocol

## Table of contents

- [Scope](#t-scope)
    - [Source Units in Scope](#t-source-Units-in-Scope)
    - [Out of Scope](#t-out-of-scope)
        - [Excluded Source Units](#t-out-of-scope-excluded-source-units)
        - [Duplicate Source Units](#t-out-of-scope-duplicate-source-units)
        - [Doppelganger Contracts](#t-out-of-scope-doppelganger-contracts)
- [Report Overview](#t-report)
    - [Risk Summary](#t-risk)
    - [Source Lines](#t-source-lines)
    - [Inline Documentation](#t-inline-documentation)
    - [Components](#t-components)
    - [Exposed Functions](#t-exposed-functions)
    - [StateVariables](#t-statevariables)
    - [Capabilities](#t-capabilities)
    - [Dependencies](#t-package-imports)
    - [Totals](#t-totals)

## <span id=t-scope>Scope</span>

This section lists files that are in scope for the metrics report. 

- **Project:** `metricsContainerName`
- **Included Files:** 
    - ``
- **Excluded Paths:** 
    - ``
- **File Limit:** `undefined`
    - **Exclude File list Limit:** `undefined`

- **Workspace Repository:** `unknown` (`undefined`@`undefined`)

### <span id=t-source-Units-in-Scope>Source Units in Scope</span>

Source Units Analyzed: **`130`**<br>
Source Units in Scope: **`130`** (**100%**)

| Type | File   | Logic Contracts | Interfaces | Lines | nLines | nSLOC | Comment Lines | Complex. Score | Capabilities |
|========|=================|============|=======|=======|===============|==============|  
| 📝 | contracts\Farming\LiquidityHandler.sol | 1 | **** | 600 | 531 | 433 | 38 | 293 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🔍 | contracts\interfaces\IAlluoLockedV3.sol | **** | 1 | 154 | 5 | 3 | 1 | 109 | **** |
| 🔍 | contracts\interfaces\IAlluoStrategy.sol | **** | 1 | 50 | 11 | 3 | 22 | 9 | **** |
| 🔍 | contracts\interfaces\IAlluoStrategyNew.sol | **** | 1 | 42 | 10 | 3 | 19 | 9 | **** |
| 🔍 | contracts\interfaces\IAlluoStrategyV2.sol | **** | 1 | 57 | 10 | 3 | 21 | 15 | **** |
| 🔍 | contracts\interfaces\IAlluoToken.sol | **** | 1 | 119 | 8 | 5 | 1 | 79 | **** |
| 🔍 | contracts\interfaces\IAlluoVault.sol | **** | 1 | 224 | 51 | 47 | 1 | 130 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IBalancer.sol | **** | 1 | 38 | 7 | 4 | 1 | 17 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IBalancerStructs.sol | **** | 1 | 53 | 53 | 45 | 2 | 1 | **** |
| 🔍 | contracts\interfaces\IChainlinkPriceFeed.sol | **** | 1 | 109 | 20 | 16 | 6 | 47 | **** |
| 🔍 | contracts\interfaces\ICvxDistributor.sol | **** | 2 | 189 | 48 | 39 | 6 | 103 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IEntry.sol | **** | 1 | 25 | 25 | 13 | 11 | 1 | **** |
| 🔍 | contracts\interfaces\IExchange.sol | **** | 1 | 23 | 12 | 9 | 5 | 8 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IGnosis.sol | **** | 1 | 147 | 5 | 3 | 1 | 61 | **** |
| 🔍 | contracts\interfaces\IHandlerAdapter.sol | **** | 1 | 23 | 5 | 3 | 1 | 13 | **** |
| 🔍 | contracts\interfaces\IIbAlluo.sol | **** | 1 | 95 | 8 | 5 | 1 | 71 | **** |
| 🔍 | contracts\interfaces\ILiquidityHandler.sol | **** | 2 | 145 | 21 | 17 | 1 | 60 | **** |
| 🔍 | contracts\interfaces\ILocker.sol | **** | 1 | 154 | 5 | 3 | 1 | 109 | **** |
| 🔍 | contracts\interfaces\IMultichain.sol | **** | 1 | 14 | 8 | 3 | 4 | 3 | **** |
| 🔍 | contracts\interfaces\IPriceFeedRouterV2.sol | **** | 1 | 106 | 27 | 23 | 6 | 52 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IStrategyHandler.sol | **** | 1 | 190 | 16 | 13 | 1 | 105 | **** |
| 🔍 | contracts\interfaces\ISuperfluidEndResolver.sol | **** | 1 | 12 | 5 | 3 | 1 | 5 | **** |
| 🔍 | contracts\interfaces\ISuperfluidResolver.sol | **** | 1 | 8 | 5 | 3 | 1 | 5 | **** |
| 🔍 | contracts\interfaces\IUniversalCurveConvexStrategy.sol | **** | 1 | 46 | 9 | 6 | 1 | 21 | **** |
| 🔍 | contracts\interfaces\IVoteExecutor.sol | **** | 1 | 14 | 13 | 5 | 6 | 7 | **** |
| 🔍 | contracts\interfaces\IVoteExecutorMaster.sol | **** | 1 | 163 | 33 | 28 | 1 | 82 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IWrappedEther.sol | **** | 1 | 30 | 5 | 3 | 1 | 26 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝 | contracts\Locking\AlluoLockedV4.sol | 1 | **** | 679 | 636 | 380 | 156 | 211 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Locking\CvxDistributorV2.sol | 1 | **** | 464 | 410 | 266 | 84 | 209 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝🔍 | contracts\mock\AnycallProxy.sol | 2 | 1 | 924 | 827 | 597 | 115 | 362 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Uses Hash-Functions'>🧮</abbr><abbr title='create/create2'>🌀</abbr><abbr title='TryCatch Blocks'>♻️</abbr>** |
| 📝 | contracts\Voting\VoteExecutorV2.sol | 1 | **** | 366 | 332 | 221 | 68 | 150 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝🔍 | contracts\VotingAutomated\VoteExecutorMasterLog.sol | 1 | 1 | 658 | 569 | 483 | 19 | 334 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\VotingAutomated\VoteExecutorResolver.sol | 1 | **** | 59 | 55 | 47 | 2 | 21 | **<abbr title='TryCatch Blocks'>♻️</abbr>** |
| 📝🔍 | contracts\VotingAutomated\VoteExecutorSlaveFinal.sol | 1 | 2 | 326 | 271 | 202 | 34 | 152 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Mainnet\AlluoERC20Upgradable.sol | 1 | **** | 440 | 393 | 138 | 213 | 94 | **<abbr title='Unchecked Blocks'>Σ</abbr>** |
| 📝 | contracts\Farming\Mainnet\IbAlluo.sol | 1 | **** | 620 | 548 | 380 | 98 | 246 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Polygon\AlluoERC20Upgradable.sol | 1 | **** | 436 | 389 | 135 | 213 | 94 | **<abbr title='Unchecked Blocks'>Σ</abbr>** |
| 📝 | contracts\Farming\Polygon\IbAlluo.sol | 1 | **** | 979 | 857 | 625 | 132 | 471 | **<abbr title='Uses Assembly'>🖥</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Polygon\StIbAlluo.sol | 1 | **** | 829 | 653 | 402 | 147 | 279 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🔍 | contracts\Farming\priceFeeds\IFeedStrategy.sol | **** | 1 | 6 | 5 | 3 | 1 | 3 | **** |
| 📝 | contracts\Farming\priceFeeds\PriceFeedRouter.sol | 1 | **** | 95 | 79 | 61 | 2 | 47 | **** |
| 🔍 | contracts\Farming\priceFeedsV2\IFeedStrategy.sol | **** | 1 | 10 | 5 | 3 | 1 | 5 | **** |
| 📝 | contracts\Farming\priceFeedsV2\PriceFeedRouterV2.sol | 1 | **** | 194 | 155 | 122 | 3 | 89 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🔍 | contracts\interfaces\curve\ICurvePoolBTC.sol | **** | 1 | 111 | 6 | 3 | 2 | 61 | **** |
| 🔍 | contracts\interfaces\curve\ICurvePoolEUR.sol | **** | 1 | 172 | 7 | 3 | 3 | 109 | **** |
| 🔍 | contracts\interfaces\curve\ICurvePoolUSD.sol | **** | 1 | 172 | 7 | 3 | 3 | 109 | **** |
| 🎨 | contracts\interfaces\superfluid\CustomSuperTokenBase.sol | 1 | **** | 20 | 20 | 5 | 13 | 2 | **** |
| 📚 | contracts\interfaces\superfluid\Definitions.sol | 5 | **** | 268 | 246 | 128 | 94 | 82 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🎨 | contracts\interfaces\superfluid\ERC20WithTokenInfo.sol | 1 | **** | 18 | 18 | 5 | 10 | 5 | **** |
| 🔍 | contracts\interfaces\superfluid\IAlluoSuperToken.sol | **** | 1 | 18 | 7 | 4 | 1 | 11 | **** |
| 🎨 | contracts\interfaces\superfluid\IConstantFlowAgreementV1.sol | 1 | **** | 403 | 26 | 11 | 210 | 44 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🎨 | contracts\interfaces\superfluid\IInstantDistributionAgreementV1.sol | 1 | **** | 505 | 57 | 11 | 278 | 32 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🔍 | contracts\interfaces\superfluid\IRelayRecipient.sol | **** | 1 | 28 | 18 | 3 | 20 | 5 | **** |
| 🔍 | contracts\interfaces\superfluid\ISuperAgreement.sol | **** | 1 | 32 | 14 | 4 | 16 | 5 | **** |
| 🔍 | contracts\interfaces\superfluid\ISuperApp.sol | **** | 1 | 145 | 26 | 4 | 89 | 13 | **** |
| 🔍 | contracts\interfaces\superfluid\ISuperfluid.sol | **** | 1 | 609 | 82 | 31 | 356 | 77 | **** |
| 🔍 | contracts\interfaces\superfluid\ISuperfluidGovernance.sol | **** | 1 | 94 | 17 | 7 | 35 | 19 | **** |
| 🔍 | contracts\interfaces\superfluid\ISuperfluidToken.sol | **** | 1 | 391 | 35 | 8 | 242 | 33 | **** |
| 🔍 | contracts\interfaces\superfluid\ISuperToken.sol | **** | 1 | 516 | 118 | 108 | 332 | 77 | **** |
| 🔍 | contracts\interfaces\superfluid\ISuperTokenFactory.sol | **** | 1 | 95 | 33 | 9 | 57 | 11 | **** |
| 🔍 | contracts\interfaces\superfluid\TokenInfo.sol | **** | 1 | 36 | 21 | 10 | 27 | 7 | **** |
| 📝 | contracts\mock\interestHelper\Interest.sol | 1 | **** | 129 | 115 | 92 | 17 | 161 | **<abbr title='Uses Assembly'>🖥</abbr>** |
| 📝 | contracts\mock\interestHelper\Math.sol | 1 | **** | 38 | 38 | 27 | 3 | 13 | **** |
| 📝 | contracts\mock\old\AlluoLockedV2Final.sol | 1 | **** | 212 | 197 | 111 | 60 | 68 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\old\AlluoLockedV3.sol | 1 | **** | 696 | 659 | 406 | 153 | 248 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\old\CvxDistributor.sol | 1 | **** | 445 | 413 | 256 | 91 | 189 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\old\VoteExecutor.sol | 1 | **** | 296 | 280 | 181 | 70 | 125 | **** |
| 📝 | contracts\mock\strategies\CurveConvexStrategyV2.sol | 1 | **** | 407 | 326 | 265 | 17 | 193 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\strategies\CurveConvexStrategyV2Native.sol | 1 | **** | 457 | 375 | 309 | 17 | 240 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\strategies\StrategyHandler.sol | 1 | **** | 532 | 457 | 392 | 5 | 305 | **<abbr title='Initiates ETH Value Transfer'>📤</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\testnet\AlluoLockedV3ForTest.sol | 1 | **** | 643 | 603 | 355 | 155 | 188 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝🔍 | contracts\mock\testnet\CurveConvexStrategyTest.sol | 1 | 4 | 607 | 253 | 210 | 33 | 347 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝 | contracts\mock\testnet\FakeBalancer.sol | 1 | **** | 92 | 87 | 66 | 3 | 58 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝📚🔍🎨 | contracts\mock\testnet\MetaTxERC20Token.sol | 23 | 1 | 2993 | 2409 | 1105 | 1134 | 667 | **<abbr title='Uses Assembly'>🖥</abbr><abbr title='Payable Functions'>💰</abbr><abbr title='Uses Hash-Functions'>🧮</abbr><abbr title='Handles Signatures: ecrecover'>🔖</abbr><abbr title='doppelganger(SafeMath)'>🔆</abbr>** |
| 📝 | contracts\mock\tools\AlluoLockedCleanup.sol | 1 | **** | 702 | 665 | 411 | 153 | 258 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\tools\BadPriceStrategy.sol | 1 | **** | 23 | 23 | 17 | 1 | 9 | **** |
| 📝 | contracts\mock\tools\ForceSender.sol | 1 | **** | 12 | 12 | 9 | 1 | 7 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Destroyable Contract'>💣</abbr>** |
| 📝 | contracts\mock\tools\PseudoMultisigWallet.sol | 1 | **** | 55 | 47 | 36 | 3 | 31 | **<abbr title='Uses Assembly'>🖥</abbr><abbr title='Payable Functions'>💰</abbr>** |
| 📝 | contracts\mock\tools\TestERC20.sol | 1 | **** | 49 | 49 | 37 | 3 | 28 | **<abbr title='Uses Assembly'>🖥</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Mainnet\adapters\BtcNoPoolAdapter.sol | 1 | **** | 108 | 83 | 60 | 7 | 58 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Mainnet\adapters\EthNoPoolAdapter.sol | 1 | **** | 107 | 82 | 60 | 7 | 58 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Mainnet\adapters\EurCurveAdapter.sol | 1 | **** | 246 | 214 | 167 | 20 | 138 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Mainnet\adapters\UsdCurveAdapter.sol | 1 | **** | 250 | 218 | 171 | 19 | 151 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Mainnet\resolvers\IbAlluoPriceResolver.sol | 1 | **** | 40 | 40 | 34 | 1 | 23 | **** |
| 📝 | contracts\Farming\Mainnet\resolvers\WithdrawalRequestResolver.sol | 1 | **** | 55 | 51 | 42 | 2 | 31 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Initiates ETH Value Transfer'>📤</abbr>** |
| 📝 | contracts\Farming\Polygon\adapters\BtcCurveAdapter.sol | 1 | **** | 218 | 194 | 154 | 19 | 111 | **** |
| 📝 | contracts\Farming\Polygon\adapters\BtcNoPoolAdapter.sol | 1 | **** | 73 | 55 | 39 | 6 | 37 | **** |
| 📝 | contracts\Farming\Polygon\adapters\EthNoPoolAdapter.sol | 1 | **** | 73 | 55 | 39 | 6 | 37 | **** |
| 📝 | contracts\Farming\Polygon\adapters\EurCurveAdapter.sol | 1 | **** | 217 | 193 | 154 | 19 | 121 | **** |
| 📝 | contracts\Farming\Polygon\adapters\UsdCurveAdapter.sol | 1 | **** | 223 | 199 | 159 | 19 | 118 | **** |
| 📝 | contracts\Farming\Polygon\resolvers\IbAlluoPriceResolver.sol | 1 | **** | 40 | 40 | 34 | 1 | 23 | **** |
| 📝 | contracts\Farming\Polygon\resolvers\SuperfluidEndResolver.sol | 1 | **** | 129 | 110 | 99 | 1 | 67 | **<abbr title='Uses Hash-Functions'>🧮</abbr><abbr title='TryCatch Blocks'>♻️</abbr>** |
| 📝 | contracts\Farming\Polygon\resolvers\SuperfluidResolver.sol | 1 | **** | 159 | 139 | 127 | 2 | 91 | **<abbr title='Uses Hash-Functions'>🧮</abbr><abbr title='TryCatch Blocks'>♻️</abbr>** |
| 📝 | contracts\Farming\Polygon\resolvers\WithdrawalRequestResolver.sol | 1 | **** | 54 | 50 | 42 | 1 | 31 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Initiates ETH Value Transfer'>📤</abbr>** |
| 🎨 | contracts\Farming\Polygon\superfluid\AlluoSuperfluidToken.sol | 1 | **** | 396 | 334 | 238 | 60 | 134 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Polygon\superfluid\FullUpgradableSuperTokenProxy.sol | 1 | **** | 39 | 39 | 26 | 9 | 34 | **<abbr title='Uses Assembly'>🖥</abbr>** |
| 🎨 | contracts\Farming\Polygon\superfluid\SuperAppBase.sol | 1 | **** | 69 | 30 | 22 | 1 | 21 | **** |
| 📝 | contracts\Farming\Polygon\superfluid\Superfluid.sol | 1 | **** | 1190 | 987 | 748 | 133 | 520 | **<abbr title='Uses Assembly'>🖥</abbr><abbr title='Uses Hash-Functions'>🧮</abbr><abbr title='create/create2'>🌀</abbr>** |
| 🎨 | contracts\Farming\Polygon\superfluid\SuperfluidToken.sol | 1 | **** | 386 | 319 | 233 | 50 | 133 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\Farming\Polygon\superfluid\SuperToken.sol | 1 | **** | 773 | 617 | 383 | 139 | 254 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝🎨 | contracts\Farming\Polygon\superfluid\SuperTokenFactory.sol | 3 | **** | 171 | 143 | 102 | 17 | 107 | **<abbr title='Uses Hash-Functions'>🧮</abbr><abbr title='create/create2'>🌀</abbr>** |
| 📝 | contracts\Farming\priceFeeds\priceFeedStrategies\ChainlinkFeedStrategy.sol | 1 | **** | 17 | 17 | 12 | 1 | 9 | **** |
| 📝🔍 | contracts\Farming\priceFeeds\priceFeedStrategies\CurvePoolReferenceFeedStrategy.sol | 1 | 1 | 50 | 43 | 36 | 7 | 20 | **** |
| 📝 | contracts\Farming\priceFeedsV2\priceFeedStrategies\ChainlinkFeedStrategyV2.sol | 1 | **** | 55 | 47 | 35 | 2 | 33 | **** |
| 📝 | contracts\Farming\priceFeedsV2\priceFeedStrategies\CurveLpReferenceFeedStrategyV2.sol | 1 | **** | 109 | 74 | 59 | 7 | 44 | **** |
| 📝🔍 | contracts\Farming\priceFeedsV2\priceFeedStrategies\CurvePoolReferenceFeedStrategyV2.sol | 1 | 1 | 91 | 63 | 50 | 8 | 40 | **** |
| 🔍 | contracts\interfaces\curve\mainnet\ICurveCVXETH.sol | **** | 1 | 194 | 5 | 3 | 1 | 131 | **** |
| 🔍 | contracts\interfaces\curve\mainnet\ICurvePoolEUR.sol | **** | 1 | 149 | 7 | 3 | 3 | 79 | **** |
| 🔍 | contracts\interfaces\curve\mainnet\ICurvePoolUSD.sol | **** | 1 | 109 | 7 | 3 | 3 | 77 | **** |
| 🔍 | contracts\interfaces\curve\mainnet\ICvxBaseRewardPool.sol | **** | 1 | 86 | 9 | 3 | 4 | 73 | **** |
| 🔍 | contracts\interfaces\curve\mainnet\ICvxBooster.sol | **** | 1 | 169 | 11 | 3 | 5 | 113 | **** |
| 🔍 | contracts\mock\strategies\interfaces\ICvxBaseRewardPool.sol | **** | 1 | 86 | 9 | 3 | 4 | 73 | **** |
| 🔍 | contracts\mock\strategies\interfaces\ICvxBooster.sol | **** | 1 | 169 | 11 | 3 | 5 | 113 | **** |
| 📝 | contracts\mock\testnet\adapters\EurCurveAdapterMumbai.sol | 1 | **** | 155 | 136 | 105 | 16 | 96 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\testnet\adapters\UsdCurveAdapterMumbai.sol | 1 | **** | 155 | 136 | 105 | 16 | 96 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\testnet\curve\FakeCurveEur.sol | 1 | **** | 126 | 113 | 89 | 4 | 84 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\testnet\curve\FakeCurveUsd.sol | 1 | **** | 125 | 112 | 89 | 3 | 84 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\mock\tools\imports\CurveConvexStrategy.sol | 1 | **** | 12 | 12 | 9 | 1 | 4 | **** |
| 📝 | contracts\mock\tools\imports\Exchange.sol | 1 | **** | 8 | 8 | 5 | 1 | 4 | **** |
| 🎨 | contracts\Farming\Polygon\superfluid\libs\BaseRelayRecipient.sol | 1 | **** | 45 | 29 | 13 | 21 | 17 | **<abbr title='Uses Assembly'>🖥</abbr>** |
| 📚 | contracts\Farming\Polygon\superfluid\libs\CallUtils.sol | 1 | **** | 108 | 102 | 62 | 38 | 103 | **<abbr title='Uses Assembly'>🖥</abbr>** |
| 📚 | contracts\Farming\Polygon\superfluid\libs\CFAv1Library.sol | 1 | **** | 841 | 658 | 367 | 266 | 445 | **** |
| 📚 | contracts\Farming\Polygon\superfluid\libs\ERC1820RegistryCompiled.sol | 1 | **** | 14 | 14 | 9 | 4 | 7 | **** |
| 📚 | contracts\Farming\Polygon\superfluid\libs\ERC777Helper.sol | 1 | **** | 105 | 88 | 67 | 9 | 22 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📚 | contracts\Farming\Polygon\superfluid\libs\EventsEmitter.sol | 1 | **** | 16 | 16 | 7 | 7 | 2 | **** |
| 📚 | contracts\Farming\Polygon\superfluid\libs\FixedSizeData.sol | 1 | **** | 71 | 65 | 38 | 23 | 76 | **<abbr title='Uses Assembly'>🖥</abbr>** |
| 📚 | contracts\Farming\Polygon\superfluid\libs\SlotsBitmapLibrary.sol | 1 | **** | 118 | 102 | 76 | 20 | 101 | **<abbr title='Uses Assembly'>🖥</abbr>** |
| 🎨 | contracts\Farming\Polygon\superfluid\upgradability\UUPSProxiable.sol | 1 | **** | 49 | 34 | 22 | 19 | 22 | **** |
| 📝 | contracts\Farming\Polygon\superfluid\upgradability\UUPSProxy.sol | 1 | **** | 42 | 36 | 16 | 17 | 12 | **** |
| 📚 | contracts\Farming\Polygon\superfluid\upgradability\UUPSUtils.sol | 1 | **** | 32 | 32 | 15 | 14 | 16 | **<abbr title='Uses Assembly'>🖥</abbr>** |
| 📝📚🔍🎨 | **Totals** | **111** | **61** | **30258**  | **21094** | **13888** | **6224** | **12339** | **<abbr title='Uses Assembly'>🖥</abbr><abbr title='Payable Functions'>💰</abbr><abbr title='Destroyable Contract'>💣</abbr><abbr title='Initiates ETH Value Transfer'>📤</abbr><abbr title='Uses Hash-Functions'>🧮</abbr><abbr title='Handles Signatures: ecrecover'>🔖</abbr><abbr title='create/create2'>🌀</abbr><abbr title='doppelganger'>🔆</abbr><abbr title='TryCatch Blocks'>♻️</abbr><abbr title='Unchecked Blocks'>Σ</abbr>** |

<sub>
Legend: <a onclick="toggleVisibility('table-legend', this)">[➕]</a>
<div id="table-legend" style="display:none">

<ul>
<li> <b>Lines</b>: total lines of the source unit </li>
<li> <b>nLines</b>: normalized lines of the source unit (e.g. normalizes functions spanning multiple lines) </li>
<li> <b>nSLOC</b>: normalized source lines of code (only source-code lines; no comments, no blank lines) </li>
<li> <b>Comment Lines</b>: lines containing single or block comments </li>
<li> <b>Complexity Score</b>: a custom complexity score derived from code statements that are known to introduce code complexity (branches, loops, calls, external interfaces, ...) </li>
</ul>

</div>
</sub>


#### <span id=t-out-of-scope>Out of Scope</span>

##### <span id=t-out-of-scope-excluded-source-units>Excluded Source Units</span>

Source Units Excluded: **`0`**

<a onclick="toggleVisibility('excluded-files', this)">[➕]</a>
<div id="excluded-files" style="display:none">
| File   |
|========|
| None |

</div>


##### <span id=t-out-of-scope-duplicate-source-units>Duplicate Source Units</span>

Duplicate Source Units Excluded: **`3`** 

<a onclick="toggleVisibility('duplicate-files', this)">[➕]</a>
<div id="duplicate-files" style="display:none">
| File   |
|========|
|contracts\Farming\Polygon\resolvers\IbAlluoPriceResolver.sol|
|contracts\mock\strategies\interfaces\ICvxBaseRewardPool.sol|
|contracts\mock\strategies\interfaces\ICvxBooster.sol|

</div>

##### <span id=t-out-of-scope-doppelganger-contracts>Doppelganger Contracts</span>

Doppelganger Contracts: **`1`** 

<a onclick="toggleVisibility('doppelganger-contracts', this)">[➕]</a>
<div id="doppelganger-contracts" style="display:none">
| File   | Contract | Doppelganger | 
|========|==========|==============|
| contracts\mock\testnet\MetaTxERC20Token.sol | SafeMath | (exact) [0](https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v2.5.0/contracts/math/SafeMath.sol), [1](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0/contracts/math/SafeMath.sol), [2](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0-beta.0/contracts/math/SafeMath.sol), [3](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0-beta.1/contracts/math/SafeMath.sol), [4](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.4.0-beta.2/contracts/math/SafeMath.sol), [5](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.0/contracts/math/SafeMath.sol), [6](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.0-rc.0/contracts/math/SafeMath.sol), [7](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.1/contracts/math/SafeMath.sol), [8](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0/contracts/math/SafeMath.sol), [9](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0-beta.0/contracts/math/SafeMath.sol), [10](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0-rc.0/contracts/math/SafeMath.sol), [11](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.0-rc.1/contracts/math/SafeMath.sol), [12](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.1/contracts/math/SafeMath.sol), [13](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.2/contracts/math/SafeMath.sol), [14](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0/contracts/math/SafeMath.sol), [15](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.1.0-rc.0/contracts/math/SafeMath.sol), [16](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.0/contracts/math/SafeMath.sol), [17](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.0-rc.0/contracts/math/SafeMath.sol), [18](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.1-solc-0.7/contracts/math/SafeMath.sol), [19](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.2.2-solc-0.7/contracts/math/SafeMath.sol) |

</div>


## <span id=t-report>Report</span>

### Overview

The analysis finished with **`0`** errors and **`3`** duplicate files.





#### <span id=t-risk>Risk</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
			<canvas id="chart-risk-summary"></canvas>
</div>

#### <span id=t-source-lines>Source Lines (sloc vs. nsloc)</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
    <canvas id="chart-nsloc-total"></canvas>
</div>

#### <span id=t-inline-documentation>Inline Documentation</span>

- **Comment-to-Source Ratio:** On average there are`3.23` code lines per comment (lower=better).
- **ToDo's:** `3` 

#### <span id=t-components>Components</span>

| 📝Contracts   | 📚Libraries | 🔍Interfaces | 🎨Abstract |
|=============|===========|============|============|
| 69 | 19  | 61  | 23 |

#### <span id=t-exposed-functions>Exposed Functions</span>

This section lists functions that are explicitly declared public or payable. Please note that getter methods for public stateVars are not included.  

| 🌐Public   | 💰Payable |
|============|===========|
| 2099 | 18  | 

| External   | Internal | Private | Pure | View |
|============|==========|=========|======|======|
| 1833 | 1611  | 63 | 89 | 981 |

#### <span id=t-statevariables>StateVariables</span>

| Total      | 🌐Public  |
|============|===========|
| 623  | 425 |

#### <span id=t-capabilities>Capabilities</span>

| Solidity Versions observed | 🧪 Experimental Features | 💰 Can Receive Funds | 🖥 Uses Assembly | 💣 Has Destroyable Contracts | 
|============|===========|===========|===========|
| `^0.8.11`<br/>`^0.8.4`<br/>`0.8.11`<br/>`^0.8.6`<br/>`^0.8.0`<br/>`^0.8.9`<br/>`>=0.8.0`<br/>`>=0.8.2`<br/>`>=0.5.15`<br/>`^0.8.2` |  | `yes` | `yes` <br/>(30 asm blocks) | `yes` | 

| 📤 Transfers ETH | ⚡ Low-Level Calls | 👥 DelegateCall | 🧮 Uses Hash Functions | 🔖 ECRecover | 🌀 New/Create/Create2 |
|============|===========|===========|===========|===========|
| `yes` | **** | **** | `yes` | `yes` | `yes`<br>→ `NewContract:AnyCallExecutor`<br/>→ `NewContract:UUPSProxy`<br/>→ `NewContract:FullUpgradableSuperTokenProxy`<br/>→ `NewContract:SuperToken` | 

| ♻️ TryCatch | Σ Unchecked |
|============|===========|
| `yes` | `yes` |

#### <span id=t-package-imports>Dependencies / External Imports</span>

| Dependency / Import Path | Count  | 
|==========================|========|
| @openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol | 30 |
| @openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol | 31 |
| @openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol | 31 |
| @openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol | 17 |
| @openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol | 1 |
| @openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol | 5 |
| @openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol | 15 |
| @openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol | 9 |
| @openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol | 20 |
| @openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol | 6 |
| @openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol | 2 |
| @openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol | 1 |
| @openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol | 1 |
| @openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol | 11 |
| @openzeppelin/contracts/access/AccessControl.sol | 14 |
| @openzeppelin/contracts/access/IAccessControl.sol | 5 |
| @openzeppelin/contracts/access/Ownable.sol | 1 |
| @openzeppelin/contracts/interfaces/IERC20.sol | 7 |
| @openzeppelin/contracts/interfaces/IERC20Metadata.sol | 3 |
| @openzeppelin/contracts/proxy/Proxy.sol | 2 |
| @openzeppelin/contracts/proxy/utils/Initializable.sol | 1 |
| @openzeppelin/contracts/security/Pausable.sol | 1 |
| @openzeppelin/contracts/security/ReentrancyGuard.sol | 1 |
| @openzeppelin/contracts/token/ERC20/ERC20.sol | 9 |
| @openzeppelin/contracts/token/ERC20/IERC20.sol | 13 |
| @openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol | 1 |
| @openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol | 1 |
| @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol | 15 |
| @openzeppelin/contracts/token/ERC777/IERC777.sol | 2 |
| @openzeppelin/contracts/token/ERC777/IERC777Recipient.sol | 2 |
| @openzeppelin/contracts/token/ERC777/IERC777Sender.sol | 2 |
| @openzeppelin/contracts/utils/Address.sol | 18 |
| @openzeppelin/contracts/utils/Create2.sol | 1 |
| @openzeppelin/contracts/utils/Strings.sol | 1 |
| @openzeppelin/contracts/utils/cryptography/ECDSA.sol | 1 |
| @openzeppelin/contracts/utils/introspection/IERC1820Registry.sol | 1 |
| @openzeppelin/contracts/utils/math/SafeCast.sol | 5 |
| @openzeppelin/contracts/utils/math/SafeMath.sol | 2 |
| @openzeppelin/contracts/utils/structs/EnumerableSet.sol | 4 |
| alluo-exchange/contracts/Exchange.sol | 1 |
| alluo-strategies/contracts/deprecated/ethereum/CurveConvex/CurveConvexStrategy.sol | 1 |
| alluo-strategies/contracts/interfaces/ICvxBaseRewardPool.sol | 1 |
| hardhat/console.sol | 18 |

#### <span id=t-totals>Totals</span>

##### Summary

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar"></canvas>
</div>

##### AST Node Statistics

###### Function Calls

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast-funccalls"></canvas>
</div>

###### Assembly Calls

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast-asmcalls"></canvas>
</div>

###### AST Total

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast"></canvas>
</div>

##### Inheritance Graph

<a onclick="toggleVisibility('surya-inherit', this)">[➕]</a>
<div id="surya-inherit" style="display:none">
<div class="wrapper" style="max-width: 512px; margin: auto">
    <div id="surya-inheritance" style="text-align: center;"></div> 
</div>
</div>

##### CallGraph

<a onclick="toggleVisibility('surya-call', this)">[➕]</a>
<div id="surya-call" style="display:none">
<div class="wrapper" style="max-width: 512px; margin: auto">
    <div id="surya-callgraph" style="text-align: center;"></div>
</div>
</div>

###### Contract Summary

<a onclick="toggleVisibility('surya-mdreport', this)">[➕]</a>
<div id="surya-mdreport" style="display:none">
 Sūrya's Description Report

 Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| contracts\Farming\LiquidityHandler.sol | 44b00c98b921286c0ed81d7254a7170dca05244b |
| contracts\interfaces\IAlluoLockedV3.sol | 1c0f52ba18060f329a938e3ca3a3f37a5bc3ecb5 |
| contracts\interfaces\IAlluoStrategy.sol | 0b8f676d8030a44e4665456c4b1b3ca400a92fac |
| contracts\interfaces\IAlluoStrategyNew.sol | 09de0424b51dca30d4ae9edf678fbc1c5e83132f |
| contracts\interfaces\IAlluoStrategyV2.sol | 0756ab3b8ba6b094c872add17672a725af948d1e |
| contracts\interfaces\IAlluoToken.sol | 16bfe9431fc35e4291ab0eebf782c7ff35991501 |
| contracts\interfaces\IAlluoVault.sol | c185f80333322696fe631633b88693fb0b0e49eb |
| contracts\interfaces\IBalancer.sol | 2f8087b128bb59b8aa830419e78bc4a06b0eccd8 |
| contracts\interfaces\IBalancerStructs.sol | fed67c845b0d1a94bac2cb967d89eec4daafc3c3 |
| contracts\interfaces\IChainlinkPriceFeed.sol | 2dd8e8a963cf05a4bf7065c78b2cb7c9fd4e808f |
| contracts\interfaces\ICvxDistributor.sol | 7a8b47f17ffe94e8c734e7e7b849450bdd6f5025 |
| contracts\interfaces\IEntry.sol | 8e5b4c06676d5d643c6f184f8587727c704765dc |
| contracts\interfaces\IExchange.sol | 47abb358bbb471748c5ec4362718868e8b25caae |
| contracts\interfaces\IGnosis.sol | 43d81b35c99f63b2a6ceff19831a836ee501ee06 |
| contracts\interfaces\IHandlerAdapter.sol | c1abf69a8efebf80718987a2aa6f02b172b2516d |
| contracts\interfaces\IIbAlluo.sol | bb8673152fceb4711bf926bb9f86037202d4980e |
| contracts\interfaces\ILiquidityHandler.sol | 3f27b28c5a286e6ae338084d2bff38a28a628502 |
| contracts\interfaces\ILocker.sol | 49072fd0e859b7f7f0759df2500b3c5a4f238a34 |
| contracts\interfaces\IMultichain.sol | f5a338602c0291a9702040d1852497cee15e7629 |
| contracts\interfaces\IPriceFeedRouterV2.sol | e8534887c807513f5c651a21710e80cd01f53e9a |
| contracts\interfaces\IStrategyHandler.sol | cc8f698a3a459d8a357cd437d0660e70f4f4b149 |
| contracts\interfaces\ISuperfluidEndResolver.sol | 99f82cca779ec5f8e2665d0d642154684fc18ed4 |
| contracts\interfaces\ISuperfluidResolver.sol | 489d811860d3c56077d80206fff4a3a2b3e1859e |
| contracts\interfaces\IUniversalCurveConvexStrategy.sol | 357c2658c7ceee829c1a1b603e7ec3b076926ba3 |
| contracts\interfaces\IVoteExecutor.sol | 3795ae8d2bdb06b9b140615773ef382410feae25 |
| contracts\interfaces\IVoteExecutorMaster.sol | 30e03b093ca7e6db5c09deaf089c3a7f87be5ed8 |
| contracts\interfaces\IWrappedEther.sol | 6ae7b4bf98e5a2d004f1ccd39060faf3457d8f29 |
| contracts\Locking\AlluoLockedV4.sol | e163e65cdcaf16bfb2f743fcf6e5b6ec4123a5da |
| contracts\Locking\CvxDistributorV2.sol | a730de1ed56c1e64ac6478c58f2f18072c23a855 |
| contracts\mock\AnycallProxy.sol | 0794f15da4dfefc154209bdc5a8f4c3840721057 |
| contracts\Voting\VoteExecutorV2.sol | 36ab5a3466b6d348d9990874f516bddd75d34b01 |
| contracts\VotingAutomated\VoteExecutorMasterLog.sol | 3ca1b330d0218fe4e854a244918e07d0656df027 |
| contracts\VotingAutomated\VoteExecutorResolver.sol | 478b1a4edab35c19fad0e33cee311f8c1b39cafe |
| contracts\VotingAutomated\VoteExecutorSlaveFinal.sol | 8dea90ada534c2228f47bd8c2c71aab95e0b068c |
| contracts\Farming\Mainnet\AlluoERC20Upgradable.sol | 7414280747b75ed6964c51403c0e5512ae38e564 |
| contracts\Farming\Mainnet\IbAlluo.sol | 3394d50ff3e4709354643eca7c0fe8bc59b48389 |
| contracts\Farming\Polygon\AlluoERC20Upgradable.sol | b5627c9976135af2c945ef3422a8f615101737a1 |
| contracts\Farming\Polygon\IbAlluo.sol | 0ce24f2fdb73bf2e44d7a055d0a4555a6389d2b1 |
| contracts\Farming\Polygon\StIbAlluo.sol | 206b4057df6cd7595deb5136e2afd4c62bece234 |
| contracts\Farming\priceFeeds\IFeedStrategy.sol | dca0beaea70a72c5176b8c9998896386365caced |
| contracts\Farming\priceFeeds\PriceFeedRouter.sol | 2f45e5a583fea88bc517f2e43e03774c2a9ae44d |
| contracts\Farming\priceFeedsV2\IFeedStrategy.sol | fcb37ca38b76e91f58aa883fec3d8b1caa4fa7ed |
| contracts\Farming\priceFeedsV2\PriceFeedRouterV2.sol | 7217c69910010792d7db308f76d18357d7ff99df |
| contracts\interfaces\curve\ICurvePoolBTC.sol | f45a8deddb247af8877af52bd62d06a511b44379 |
| contracts\interfaces\curve\ICurvePoolEUR.sol | 058da72a555b2523dab60c438f3e186e4b3a2f92 |
| contracts\interfaces\curve\ICurvePoolUSD.sol | 2acec5caa1d00d1490ab195c0e1b773cb7e21786 |
| contracts\interfaces\superfluid\CustomSuperTokenBase.sol | 2b90a0d784f3787c373cfd3021b96979a5f37138 |
| contracts\interfaces\superfluid\Definitions.sol | 656cf691a5c004c3c5037e73dfe73ded04e21ea7 |
| contracts\interfaces\superfluid\ERC20WithTokenInfo.sol | d17c531efb06e3d038015b862a7035d2f2757015 |
| contracts\interfaces\superfluid\IAlluoSuperToken.sol | 26d302a0af71cb2a570d00ccbcba774a507662c7 |
| contracts\interfaces\superfluid\IConstantFlowAgreementV1.sol | 43a4fb59d178ae4bf65d1c4a83a68e81dd84522a |
| contracts\interfaces\superfluid\IInstantDistributionAgreementV1.sol | 1b1a71b0627f1ff8550182dd77e83764d106c4f7 |
| contracts\interfaces\superfluid\IRelayRecipient.sol | 83a01648fe868e4141cd20cb5bf836afabb17f5a |
| contracts\interfaces\superfluid\ISuperAgreement.sol | 7b3a3568b903437f5169dc611ce3f868185733e9 |
| contracts\interfaces\superfluid\ISuperApp.sol | ad0ec4ecab1a2e044464c0fd99d1b5fb19e62157 |
| contracts\interfaces\superfluid\ISuperfluid.sol | 4f0cb5f6dd7db49ce83b1332d6c58f689470153d |
| contracts\interfaces\superfluid\ISuperfluidGovernance.sol | 773f422275986fba84e53589aabbd7cc6589d9fd |
| contracts\interfaces\superfluid\ISuperfluidToken.sol | 0716b09057bfe12697daba6260fab060e7dd4792 |
| contracts\interfaces\superfluid\ISuperToken.sol | 271247483f2a340059beea0eeb6cbd6627a4ef2e |
| contracts\interfaces\superfluid\ISuperTokenFactory.sol | 51b872683309a72cddb1a8afc91d7b0392daa754 |
| contracts\interfaces\superfluid\TokenInfo.sol | d11d5ad2f15b1a3837c542f0e9e774dd9b790de4 |
| contracts\mock\interestHelper\Interest.sol | 64f56c2bda0554996ed6dd0ddd5d90d389bc29c8 |
| contracts\mock\interestHelper\Math.sol | 684b6f8f814542b34bba4b1914beddf3b1705582 |
| contracts\mock\old\AlluoLockedV2Final.sol | 229829c75e797bc7af8b0752cc5072b8c944bac5 |
| contracts\mock\old\AlluoLockedV3.sol | f7a10dff08a6ec3fb2bdd24dc21a64b56e9ad8f0 |
| contracts\mock\old\CvxDistributor.sol | 22e90a48eb15df66e404e4fe8368d02aca449fed |
| contracts\mock\old\VoteExecutor.sol | 480e952b3041e5a58214e33fa7052a1e851f668f |
| contracts\mock\strategies\CurveConvexStrategyV2.sol | 3be8cb5d9bce69c75706c32892422314fd67a26e |
| contracts\mock\strategies\CurveConvexStrategyV2Native.sol | d50bd11754615263ec48145d8ed32d1aee0544f8 |
| contracts\mock\strategies\StrategyHandler.sol | 8d2a60a4a7bf078ccf3ff1e4ba780414bcbf8f04 |
| contracts\mock\testnet\AlluoLockedV3ForTest.sol | d0f5f49ec085b891df0e828dd02a7f9a0fb251d7 |
| contracts\mock\testnet\CurveConvexStrategyTest.sol | c9b3fd5baa46e0aab4ee524b97e9fe67f2ea7eab |
| contracts\mock\testnet\FakeBalancer.sol | 5e274bdd5fdab324ae8802d0b64f58bd84b721ed |
| contracts\mock\testnet\MetaTxERC20Token.sol | 5207a43013057e1d3a887eff51e7b6f72aec2574 |
| contracts\mock\tools\AlluoLockedCleanup.sol | 7ffe1fe4d00faead1164925e7d80e324b2c35b10 |
| contracts\mock\tools\BadPriceStrategy.sol | b550be9c617a006ed1c8a66efafc02830c7264cb |
| contracts\mock\tools\ForceSender.sol | 763f9876ffdad48aa4485c382dd2120aea116934 |
| contracts\mock\tools\PseudoMultisigWallet.sol | 0cde182a810e0759a2bf5eebdc137235f0b7d663 |
| contracts\mock\tools\TestERC20.sol | 6c433aafa662c17519d4fd6a05a8d953c953b1c1 |
| contracts\Farming\Mainnet\adapters\BtcNoPoolAdapter.sol | 4e476a97c60a37a4b8ac96d64ba0d93234e0779f |
| contracts\Farming\Mainnet\adapters\EthNoPoolAdapter.sol | 916d65af91debbfa735ea78235427d97b1a068d7 |
| contracts\Farming\Mainnet\adapters\EurCurveAdapter.sol | 2e5fef18856df731bb437d2e4cd0d4702b8451b2 |
| contracts\Farming\Mainnet\adapters\UsdCurveAdapter.sol | e3b507b5dba7144bb6fe1096f5fb9b372d9cd1ab |
| contracts\Farming\Mainnet\resolvers\IbAlluoPriceResolver.sol | 4a59e5bb31fb281333f9cbd6d671ad3f3bc69019 |
| contracts\Farming\Mainnet\resolvers\WithdrawalRequestResolver.sol | 83cbbf6838bfc03b7ab816763cd5bdbcdc6f5f9f |
| contracts\Farming\Polygon\adapters\BtcCurveAdapter.sol | c3fe9283543b2616940c0bd4afca785dcbe1a8e6 |
| contracts\Farming\Polygon\adapters\BtcNoPoolAdapter.sol | 53e6a799314faaad337600046ce13bc7ce316b41 |
| contracts\Farming\Polygon\adapters\EthNoPoolAdapter.sol | d4e04185ce0b7fb39f18f80d43e2c8116b8c6f3c |
| contracts\Farming\Polygon\adapters\EurCurveAdapter.sol | 6c4bf1a832f3268a10d4a3476d650fb91190b1ab |
| contracts\Farming\Polygon\adapters\UsdCurveAdapter.sol | 9cc91cc2b21aca513923233525f1c46fb0b6b9fb |
| contracts\Farming\Polygon\resolvers\IbAlluoPriceResolver.sol | 4a59e5bb31fb281333f9cbd6d671ad3f3bc69019 |
| contracts\Farming\Polygon\resolvers\SuperfluidEndResolver.sol | 5f61272c10d24d65282e089df306b4c67e7cfed3 |
| contracts\Farming\Polygon\resolvers\SuperfluidResolver.sol | 0e1219335d111694aff9a4c984bbf10b23f467b2 |
| contracts\Farming\Polygon\resolvers\WithdrawalRequestResolver.sol | c6209a4c3439225c6ed185570fe27c8ddca33032 |
| contracts\Farming\Polygon\superfluid\AlluoSuperfluidToken.sol | 7df712ca6237f517e85302dfb9f6e95c6ad7aef8 |
| contracts\Farming\Polygon\superfluid\FullUpgradableSuperTokenProxy.sol | d41ff614a68e9a5de4d13b3912b294b321a32657 |
| contracts\Farming\Polygon\superfluid\SuperAppBase.sol | b55a08647770535e44f8a13499ba09b380f1357d |
| contracts\Farming\Polygon\superfluid\Superfluid.sol | 8011390057c8d0718468f6a1be2731bf153ba2e6 |
| contracts\Farming\Polygon\superfluid\SuperfluidToken.sol | dd3da350627b0a0d4c397e11e4ddddd6d5550652 |
| contracts\Farming\Polygon\superfluid\SuperToken.sol | 7235f8e9f186166352869822e57122aedf2c4ce9 |
| contracts\Farming\Polygon\superfluid\SuperTokenFactory.sol | 9fe23dcb22c5c8e53cb30fc66cd7e40f87386951 |
| contracts\Farming\priceFeeds\priceFeedStrategies\ChainlinkFeedStrategy.sol | 52f4cd77be2ea7442b0f2405b8997c467e308fb5 |
| contracts\Farming\priceFeeds\priceFeedStrategies\CurvePoolReferenceFeedStrategy.sol | b454f90fd237feb78ea00d9c6740aee7d1db037d |
| contracts\Farming\priceFeedsV2\priceFeedStrategies\ChainlinkFeedStrategyV2.sol | 39e01db458d604bccea45b4562517108c51d58d2 |
| contracts\Farming\priceFeedsV2\priceFeedStrategies\CurveLpReferenceFeedStrategyV2.sol | 1fad4c8f7d5ff102f5987bd854046214c49e797b |
| contracts\Farming\priceFeedsV2\priceFeedStrategies\CurvePoolReferenceFeedStrategyV2.sol | a32b8e6e84b006594f0f7d45813f29a34a6ede43 |
| contracts\interfaces\curve\mainnet\ICurveCVXETH.sol | c5daf59dfd5c4d7fe08b3fd58ed595d4945bb96a |
| contracts\interfaces\curve\mainnet\ICurvePoolEUR.sol | a3b972d82ec15abf0beda7b9a76a9f0c691ce7ab |
| contracts\interfaces\curve\mainnet\ICurvePoolUSD.sol | a8025421877f147e03d2249e15187fdeb93c4d3a |
| contracts\interfaces\curve\mainnet\ICvxBaseRewardPool.sol | 7fc1044001a1413850c9916d99a0d8e7051fc777 |
| contracts\interfaces\curve\mainnet\ICvxBooster.sol | 264b9034753cfc5f840ed96b5ff0900c743e6ed7 |
| contracts\mock\strategies\interfaces\ICvxBaseRewardPool.sol | 7fc1044001a1413850c9916d99a0d8e7051fc777 |
| contracts\mock\strategies\interfaces\ICvxBooster.sol | 264b9034753cfc5f840ed96b5ff0900c743e6ed7 |
| contracts\mock\testnet\adapters\EurCurveAdapterMumbai.sol | 88267b59ed846bc0f86045cc72e4a309544eed04 |
| contracts\mock\testnet\adapters\UsdCurveAdapterMumbai.sol | 960109b828d21a0db2bdffe8974192660cfe4d2d |
| contracts\mock\testnet\curve\FakeCurveEur.sol | 150916d53fed7b255f182852cae39fccebfe438f |
| contracts\mock\testnet\curve\FakeCurveUsd.sol | f7b170f93b629ffcb704b26fe38884d625af2dc1 |
| contracts\mock\tools\imports\CurveConvexStrategy.sol | 68991c17f63b0fa8cd29e0282ea2cf84092279f2 |
| contracts\mock\tools\imports\Exchange.sol | d11e7bcb6b267281ff12c366ff5dc60737c53042 |
| contracts\Farming\Polygon\superfluid\libs\BaseRelayRecipient.sol | da98b307ddfef7fb29183e8145e93527cc8436bb |
| contracts\Farming\Polygon\superfluid\libs\CallUtils.sol | e963f11000106e206ee2e777bcd160344609ffaf |
| contracts\Farming\Polygon\superfluid\libs\CFAv1Library.sol | 825599a4e8f9d3756a3ccc3430b92cde0443b14b |
| contracts\Farming\Polygon\superfluid\libs\ERC1820RegistryCompiled.sol | da8053cc69f46cd4fe87787a4c80fac4f5eaa6cc |
| contracts\Farming\Polygon\superfluid\libs\ERC777Helper.sol | 525434f8de2da8449017ad09f207844660a10d69 |
| contracts\Farming\Polygon\superfluid\libs\EventsEmitter.sol | 6ebc5944186a768b17c9d0fe6168bab984e9724d |
| contracts\Farming\Polygon\superfluid\libs\FixedSizeData.sol | 911222d211cdd9aca419392582cd8c5514b85a18 |
| contracts\Farming\Polygon\superfluid\libs\SlotsBitmapLibrary.sol | 36b38480c71eb90c4cef9c2ef81bf37a1af10415 |
| contracts\Farming\Polygon\superfluid\upgradability\UUPSProxiable.sol | 9fd95ffe85385cff95c5af95b2ebe2ec5fb5f520 |
| contracts\Farming\Polygon\superfluid\upgradability\UUPSProxy.sol | 97926489de48952cacf686e903629b74dfd045d5 |
| contracts\Farming\Polygon\superfluid\upgradability\UUPSUtils.sol | 62a14d9dcfb38ec40c5044683972a90aea8ca009 |


 Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **LiquidityHandler** | Implementation | Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | deposit | External ❗️ | 🛑  | whenNotPaused onlyRole |
| └ | withdraw | External ❗️ | 🛑  | whenNotPaused onlyRole |
| └ | withdraw | External ❗️ | 🛑  | whenNotPaused onlyRole |
| └ | _withdrawThroughExchange | Internal 🔒 | 🛑  | |
| └ | satisfyAdapterWithdrawals | Public ❗️ | 🛑  | whenNotPaused |
| └ | satisfyAllWithdrawals | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawalInDifferentTokenPossible | Public ❗️ |   |NO❗️ |
| └ | getAdapterAmount | Public ❗️ |   |NO❗️ |
| └ | getExpectedAdapterAmount | Public ❗️ |   |NO❗️ |
| └ | getAdapterId | External ❗️ |   |NO❗️ |
| └ | getIbAlluoByAdapterId | Public ❗️ |   |NO❗️ |
| └ | getListOfIbAlluos | External ❗️ |   |NO❗️ |
| └ | getLastAdapterIndex | Public ❗️ |   |NO❗️ |
| └ | getActiveAdapters | External ❗️ |   |NO❗️ |
| └ | getAllAdapters | External ❗️ |   |NO❗️ |
| └ | getAdapterCoreTokensFromIbAlluo | Public ❗️ |   |NO❗️ |
| └ | getWithdrawal | External ❗️ |   |NO❗️ |
| └ | isUserWaiting | External ❗️ |   |NO❗️ |
| └ | setIbAlluoToAdapterId | External ❗️ | 🛑  | onlyRole |
| └ | setAdapter | External ❗️ | 🛑  | onlyRole |
| └ | changeAdapterStatus | External ❗️ | 🛑  | onlyRole |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | setExchangeAddress | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **IAlluoLockedV3** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | _lockers | External ❗️ |   |NO❗️ |
| └ | addReward | External ❗️ | 🛑  |NO❗️ |
| └ | alluoBalancerLp | External ❗️ |   |NO❗️ |
| └ | alluoToken | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | balancer | External ❗️ |   |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | claim | External ❗️ | 🛑  |NO❗️ |
| └ | convertAlluoToLp | External ❗️ |   |NO❗️ |
| └ | convertLpToAlluo | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | depositLockDuration | External ❗️ |   |NO❗️ |
| └ | distributionTime | External ❗️ |   |NO❗️ |
| └ | exchange | External ❗️ |   |NO❗️ |
| └ | getClaim | External ❗️ |   |NO❗️ |
| └ | getInfoByAddress | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | lock | External ❗️ | 🛑  |NO❗️ |
| └ | lockWETH | External ❗️ | 🛑  |NO❗️ |
| └ | migrationLock | External ❗️ | 🛑  |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | poolId | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | rewardPerDistribution | External ❗️ |   |NO❗️ |
| └ | setReward | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | totalDistributed | External ❗️ |   |NO❗️ |
| └ | totalLocked | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | unlock | External ❗️ | 🛑  |NO❗️ |
| └ | unlockAll | External ❗️ | 🛑  |NO❗️ |
| └ | unlockedBalanceOf | External ❗️ |   |NO❗️ |
| └ | unpause | External ❗️ | 🛑  |NO❗️ |
| └ | update | External ❗️ | 🛑  |NO❗️ |
| └ | updateDepositLockDuration | External ❗️ | 🛑  |NO❗️ |
| └ | updateWithdrawLockDuration | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ | 🛑  |NO❗️ |
| └ | waitingForWithdrawal | External ❗️ |   |NO❗️ |
| └ | weth | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawLockDuration | External ❗️ |   |NO❗️ |
| └ | withdrawTokens | External ❗️ | 🛑  |NO❗️ |
||||||
| **IAlluoStrategy** | Interface |  |||
| └ | invest | External ❗️ | 🛑  |NO❗️ |
| └ | exitAll | External ❗️ | 🛑  |NO❗️ |
| └ | exitOnlyRewards | External ❗️ | 🛑  |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
||||||
| **IAlluoStrategyNew** | Interface |  |||
| └ | invest | External ❗️ | 🛑  |NO❗️ |
| └ | exit | External ❗️ | 🛑  |NO❗️ |
| └ | exitOnlyRewards | External ❗️ | 🛑  |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
||||||
| **IAlluoStrategyV2** | Interface |  |||
| └ | invest | External ❗️ | 🛑  |NO❗️ |
| └ | exitAll | External ❗️ | 🛑  |NO❗️ |
| └ | getDeployedAmountAndRewards | External ❗️ | 🛑  |NO❗️ |
| └ | exitOnlyRewards | External ❗️ | 🛑  |NO❗️ |
| └ | getDeployedAmount | External ❗️ |   |NO❗️ |
| └ | withdrawRewards | External ❗️ | 🛑  |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
||||||
| **IAlluoToken** | Interface | IAccessControl |||
| └ | ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | BURNER_ROLE | External ❗️ |   |NO❗️ |
| └ | CAP_CHANGER_ROLE | External ❗️ |   |NO❗️ |
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | DOMAIN_SEPARATOR | External ❗️ |   |NO❗️ |
| └ | MINTER_ROLE | External ❗️ |   |NO❗️ |
| └ | PAUSER_ROLE | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | blocklist | External ❗️ |   |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | changeCap | External ❗️ | 🛑  |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | delegate | External ❗️ | 🛑  |NO❗️ |
| └ | delegateBySig | External ❗️ | 🛑  |NO❗️ |
| └ | delegates | External ❗️ |   |NO❗️ |
| └ | getPastTotalSupply | External ❗️ |   |NO❗️ |
| └ | getPastVotes | External ❗️ |   |NO❗️ |
| └ | increaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | maxTotalSupply | External ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | nonces | External ❗️ |   |NO❗️ |
| └ | numCheckpoints | External ❗️ |   |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | permit | External ❗️ | 🛑  |NO❗️ |
| └ | setBlockStatus | External ❗️ | 🛑  |NO❗️ |
| └ | setPause | External ❗️ | 🛑  |NO❗️ |
| └ | setWhiteStatus | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | unlockERC20 | External ❗️ | 🛑  |NO❗️ |
| └ | whitelist | External ❗️ |   |NO❗️ |
||||||
| **IAlluoVault** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | alluoPool | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | asset | External ❗️ |   |NO❗️ |
| └ | accruedRewards | External ❗️ |   |NO❗️ |
| └ | shareholderAccruedRewards | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | claimRewards | External ❗️ | 🛑  |NO❗️ |
| └ | claimRewardsFromPool | External ❗️ | 🛑  |NO❗️ |
| └ | convertToAssets | External ❗️ |   |NO❗️ |
| └ | convertToShares | External ❗️ |   |NO❗️ |
| └ | cvxBooster | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | earned | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | increaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | isTrustedForwarder | External ❗️ |   |NO❗️ |
| └ | loopRewards | External ❗️ | 🛑  |NO❗️ |
| └ | maxDeposit | External ❗️ |   |NO❗️ |
| └ | maxMint | External ❗️ |   |NO❗️ |
| └ | maxRedeem | External ❗️ |   |NO❗️ |
| └ | maxWithdraw | External ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | poolId | External ❗️ |   |NO❗️ |
| └ | previewDeposit | External ❗️ |   |NO❗️ |
| └ | previewMint | External ❗️ |   |NO❗️ |
| └ | previewRedeem | External ❗️ |   |NO❗️ |
| └ | previewWithdraw | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | redeem | External ❗️ | 🛑  |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | rewards | External ❗️ |   |NO❗️ |
| └ | rewardsPerShareAccumulated | External ❗️ |   |NO❗️ |
| └ | setPool | External ❗️ | 🛑  |NO❗️ |
| └ | setTrustedForwarder | External ❗️ | 🛑  |NO❗️ |
| └ | stakeUnderlying | External ❗️ | 🛑  |NO❗️ |
| └ | stakedBalanceOf | External ❗️ |   |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | totalAssets | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | trustedForwarder | External ❗️ |   |NO❗️ |
| └ | unpause | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ |  💵 |NO❗️ |
| └ | userRewardPaid | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | claimAndConvertToPoolEntryToken | External ❗️ | 🛑  |NO❗️ |
||||||
| **IBalancer** | Interface | IBalancerStructs |||
| └ | swap | External ❗️ |  💵 |NO❗️ |
| └ | joinPool | External ❗️ |  💵 |NO❗️ |
| └ | getPoolTokens | External ❗️ |   |NO❗️ |
| └ | exitPool | External ❗️ | 🛑  |NO❗️ |
||||||
| **IBalancerStructs** | Interface |  |||
||||||
| **IChainlinkPriceFeed** | Interface |  |||
| └ | acceptOwnership | External ❗️ | 🛑  |NO❗️ |
| └ | accessController | External ❗️ |   |NO❗️ |
| └ | aggregator | External ❗️ |   |NO❗️ |
| └ | confirmAggregator | External ❗️ | 🛑  |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | description | External ❗️ |   |NO❗️ |
| └ | getAnswer | External ❗️ |   |NO❗️ |
| └ | getRoundData | External ❗️ |   |NO❗️ |
| └ | getTimestamp | External ❗️ |   |NO❗️ |
| └ | latestAnswer | External ❗️ |   |NO❗️ |
| └ | latestRound | External ❗️ |   |NO❗️ |
| └ | latestRoundData | External ❗️ |   |NO❗️ |
| └ | latestTimestamp | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | phaseAggregators | External ❗️ |   |NO❗️ |
| └ | phaseId | External ❗️ |   |NO❗️ |
| └ | proposeAggregator | External ❗️ | 🛑  |NO❗️ |
| └ | proposedAggregator | External ❗️ |   |NO❗️ |
| └ | proposedGetRoundData | External ❗️ |   |NO❗️ |
| └ | proposedLatestRoundData | External ❗️ |   |NO❗️ |
| └ | setController | External ❗️ | 🛑  |NO❗️ |
| └ | transferOwnership | External ❗️ | 🛑  |NO❗️ |
| └ | version | External ❗️ |   |NO❗️ |
||||||
| **ICvxDistributor** | Interface |  |||
| └ | CRV_CVX_ETH | External ❗️ |   |NO❗️ |
| └ | CRV_REWARDS | External ❗️ |   |NO❗️ |
| └ | CURVE_CVX_ETH | External ❗️ |   |NO❗️ |
| └ | CVX_REWARDS | External ❗️ |   |NO❗️ |
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | DISTRIBUTION_TIME | External ❗️ |   |NO❗️ |
| └ | PROTOCOL_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | WETH | External ❗️ |   |NO❗️ |
| └ | _stakers | External ❗️ |   |NO❗️ |
| └ | accruedRewards | External ❗️ |   |NO❗️ |
| └ | addCvxVault | External ❗️ | 🛑  |NO❗️ |
| └ | addExchange | External ❗️ | 🛑  |NO❗️ |
| └ | addStrategyHandler | External ❗️ | 🛑  |NO❗️ |
| └ | allProduced | External ❗️ |   |NO❗️ |
| └ | alluoCvxVault | External ❗️ |   |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | claim | External ❗️ | 🛑  |NO❗️ |
| └ | exchangeAddress | External ❗️ |   |NO❗️ |
| └ | exchangePrimaryTokens | External ❗️ | 🛑  |NO❗️ |
| └ | getClaim | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | migrate | External ❗️ | 🛑  |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
| └ | producedTime | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | receiveStakeInfo | External ❗️ | 🛑  |NO❗️ |
| └ | receiveUnstakeInfo | External ❗️ | 🛑  |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | rewardProduced | External ❗️ |   |NO❗️ |
| └ | rewardToken | External ❗️ |   |NO❗️ |
| └ | rewardTotal | External ❗️ |   |NO❗️ |
| └ | rewards | External ❗️ |   |NO❗️ |
| └ | stakerAccruedRewards | External ❗️ |   |NO❗️ |
| └ | strategyHandler | External ❗️ |   |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | tokensPerStake | External ❗️ |   |NO❗️ |
| └ | totalDistributed | External ❗️ |   |NO❗️ |
| └ | totalStaked | External ❗️ |   |NO❗️ |
| └ | update | External ❗️ | 🛑  |NO❗️ |
| └ | updateReward | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ |  💵 |NO❗️ |
| └ | withdrawTokens | External ❗️ | 🛑  |NO❗️ |
||||||
| **IAlluoVaultInternal** | Interface |  |||
||||||
| **IEntry** | Interface |  |||
||||||
| **IExchange** | Interface |  |||
| └ | exchange | External ❗️ |  💵 |NO❗️ |
| └ | buildRoute | External ❗️ |   |NO❗️ |
||||||
| **IGnosis** | Interface |  |||
| └ | addOwnerWithThreshold | External ❗️ | 🛑  |NO❗️ |
| └ | approveHash | External ❗️ | 🛑  |NO❗️ |
| └ | approvedHashes | External ❗️ |   |NO❗️ |
| └ | changeThreshold | External ❗️ | 🛑  |NO❗️ |
| └ | checkNSignatures | External ❗️ |   |NO❗️ |
| └ | checkSignatures | External ❗️ |   |NO❗️ |
| └ | disableModule | External ❗️ | 🛑  |NO❗️ |
| └ | domainSeparator | External ❗️ |   |NO❗️ |
| └ | enableModule | External ❗️ | 🛑  |NO❗️ |
| └ | encodeTransactionData | External ❗️ |   |NO❗️ |
| └ | execTransaction | External ❗️ | 🛑  |NO❗️ |
| └ | execTransactionFromModule | External ❗️ | 🛑  |NO❗️ |
| └ | execTransactionFromModuleReturnData | External ❗️ | 🛑  |NO❗️ |
| └ | getChainId | External ❗️ |   |NO❗️ |
| └ | getModulesPaginated | External ❗️ |   |NO❗️ |
| └ | getOwners | External ❗️ |   |NO❗️ |
| └ | getStorageAt | External ❗️ |   |NO❗️ |
| └ | getThreshold | External ❗️ |   |NO❗️ |
| └ | getTransactionHash | External ❗️ |   |NO❗️ |
| └ | isModuleEnabled | External ❗️ |   |NO❗️ |
| └ | isOwner | External ❗️ |   |NO❗️ |
| └ | nonce | External ❗️ |   |NO❗️ |
| └ | removeOwner | External ❗️ | 🛑  |NO❗️ |
| └ | requiredTxGas | External ❗️ | 🛑  |NO❗️ |
| └ | setFallbackHandler | External ❗️ | 🛑  |NO❗️ |
| └ | setGuard | External ❗️ | 🛑  |NO❗️ |
| └ | setup | External ❗️ | 🛑  |NO❗️ |
| └ | signedMessages | External ❗️ |   |NO❗️ |
| └ | simulateAndRevert | External ❗️ | 🛑  |NO❗️ |
| └ | swapOwner | External ❗️ | 🛑  |NO❗️ |
||||||
| **IHandlerAdapter** | Interface |  |||
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | setSlippage | External ❗️ | 🛑  |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  |NO❗️ |
||||||
| **IIbAlluo** | Interface | IERC20, IAccessControl |||
| └ | annualInterest | External ❗️ |   |NO❗️ |
| └ | approveAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | changeTokenStatus | External ❗️ | 🛑  |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | getBalance | External ❗️ |   |NO❗️ |
| └ | getBalanceForTransfer | External ❗️ |   |NO❗️ |
| └ | getListSupportedTokens | External ❗️ |   |NO❗️ |
| └ | growingRatio | External ❗️ |   |NO❗️ |
| └ | interestPerSecond | External ❗️ |   |NO❗️ |
| └ | lastInterestCompound | External ❗️ |   |NO❗️ |
| └ | liquidityBuffer | External ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | unpause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | setInterest | External ❗️ | 🛑  |NO❗️ |
| └ | setLiquidityBuffer | External ❗️ | 🛑  |NO❗️ |
| └ | setUpdateTimeLimit | External ❗️ | 🛑  |NO❗️ |
| └ | totalAssetSupply | External ❗️ |   |NO❗️ |
| └ | transferAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | transferFromAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | updateRatio | External ❗️ | 🛑  |NO❗️ |
| └ | updateTimeLimit | External ❗️ |   |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | External ❗️ | 🛑  |NO❗️ |
| └ | stopFlowWhenCritical | External ❗️ | 🛑  |NO❗️ |
| └ | forceWrap | External ❗️ | 🛑  |NO❗️ |
| └ | superToken | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
||||||
| **ILiquidityHandler** | Interface | IAccessControl |||
| └ | adapterIdsToAdapterInfo | External ❗️ |   |NO❗️ |
| └ | changeAdapterStatus | External ❗️ | 🛑  |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | getActiveAdapters | External ❗️ |   |NO❗️ |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getAdapterId | External ❗️ |   |NO❗️ |
| └ | getAllAdapters | External ❗️ |   |NO❗️ |
| └ | getExpectedAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getIbAlluoByAdapterId | External ❗️ |   |NO❗️ |
| └ | getLastAdapterIndex | External ❗️ |   |NO❗️ |
| └ | getListOfIbAlluos | External ❗️ |   |NO❗️ |
| └ | getWithdrawal | External ❗️ |   |NO❗️ |
| └ | ibAlluoToWithdrawalSystems | External ❗️ |   |NO❗️ |
| └ | isUserWaiting | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | removeTokenByAddress | External ❗️ | 🛑  |NO❗️ |
| └ | satisfyAdapterWithdrawals | External ❗️ | 🛑  |NO❗️ |
| └ | satisfyAllWithdrawals | External ❗️ | 🛑  |NO❗️ |
| └ | setAdapter | External ❗️ | 🛑  |NO❗️ |
| └ | setIbAlluoToAdapterId | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | getAdapterCoreTokensFromIbAlluo | External ❗️ |   |NO❗️ |
||||||
| **ILiquidityHandlerStructs** | Interface |  |||
||||||
| **ILocker** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | _lockers | External ❗️ |   |NO❗️ |
| └ | addReward | External ❗️ | 🛑  |NO❗️ |
| └ | alluoBalancerLp | External ❗️ |   |NO❗️ |
| └ | alluoToken | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | balancer | External ❗️ |   |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | claim | External ❗️ | 🛑  |NO❗️ |
| └ | convertAlluoToLp | External ❗️ |   |NO❗️ |
| └ | convertLpToAlluo | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | depositLockDuration | External ❗️ |   |NO❗️ |
| └ | distributionTime | External ❗️ |   |NO❗️ |
| └ | exchange | External ❗️ |   |NO❗️ |
| └ | getClaim | External ❗️ |   |NO❗️ |
| └ | getInfoByAddress | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | lock | External ❗️ | 🛑  |NO❗️ |
| └ | lockWETH | External ❗️ | 🛑  |NO❗️ |
| └ | migrationLock | External ❗️ | 🛑  |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | poolId | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | rewardPerDistribution | External ❗️ |   |NO❗️ |
| └ | setReward | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | totalDistributed | External ❗️ |   |NO❗️ |
| └ | totalLocked | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | unlock | External ❗️ | 🛑  |NO❗️ |
| └ | unlockAll | External ❗️ | 🛑  |NO❗️ |
| └ | unlockedBalanceOf | External ❗️ |   |NO❗️ |
| └ | unpause | External ❗️ | 🛑  |NO❗️ |
| └ | update | External ❗️ | 🛑  |NO❗️ |
| └ | updateDepositLockDuration | External ❗️ | 🛑  |NO❗️ |
| └ | updateWithdrawLockDuration | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ | 🛑  |NO❗️ |
| └ | waitingForWithdrawal | External ❗️ |   |NO❗️ |
| └ | weth | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawLockDuration | External ❗️ |   |NO❗️ |
| └ | withdrawTokens | External ❗️ | 🛑  |NO❗️ |
||||||
| **IMultichain** | Interface |  |||
| └ | anySwapOutUnderlying | External ❗️ | 🛑  |NO❗️ |
||||||
| **IPriceFeedRouterV2** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | cryptoToUsdStrategies | External ❗️ |   |NO❗️ |
| └ | decimalsConverter | External ❗️ |   |NO❗️ |
| └ | fiatIdToUsdStrategies | External ❗️ |   |NO❗️ |
| └ | fiatNameToFiatId | External ❗️ |   |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | setCryptoStrategy | External ❗️ | 🛑  |NO❗️ |
| └ | setFiatStrategy | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ |  💵 |NO❗️ |
||||||
| **IStrategyHandler** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | addLiquidityDirection | External ❗️ | 🛑  |NO❗️ |
| └ | addToActiveDirections | External ❗️ | 🛑  |NO❗️ |
| └ | adjustTreasury | External ❗️ | 🛑  |NO❗️ |
| └ | booster | External ❗️ |   |NO❗️ |
| └ | calculateAll | External ❗️ | 🛑  |NO❗️ |
| └ | calculateOnlyLp | External ❗️ | 🛑  |NO❗️ |
| └ | changeAssetInfo | External ❗️ | 🛑  |NO❗️ |
| └ | changeNumberOfAssets | External ❗️ | 🛑  |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | directionNameToId | External ❗️ |   |NO❗️ |
| └ | exchangeAddress | External ❗️ |   |NO❗️ |
| └ | executor | External ❗️ |   |NO❗️ |
| └ | getAllAssetActiveIds | External ❗️ |   |NO❗️ |
| └ | getAssetActiveIds | External ❗️ |   |NO❗️ |
| └ | getAssetAmount | External ❗️ |   |NO❗️ |
| └ | getAssetIdByDirectionId | External ❗️ |   |NO❗️ |
| └ | getCurrentDeployed | External ❗️ |   |NO❗️ |
| └ | getDirectionFullInfoById | External ❗️ |   |NO❗️ |
| └ | getDirectionIdByName | External ❗️ |   |NO❗️ |
| └ | getDirectionLatestAmount | External ❗️ |   |NO❗️ |
| └ | getLatestDeployed | External ❗️ |   |NO❗️ |
| └ | getLiquidityDirectionById | External ❗️ |   |NO❗️ |
| └ | getLiquidityDirectionByName | External ❗️ |   |NO❗️ |
| └ | getPrimaryTokenByAssetId | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | gnosis | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | lastDirectionId | External ❗️ |   |NO❗️ |
| └ | lastTimeCalculated | External ❗️ |   |NO❗️ |
| └ | liquidityDirection | External ❗️ |   |NO❗️ |
| └ | numberOfAssets | External ❗️ |   |NO❗️ |
| └ | priceFeed | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | removeFromActiveDirections | External ❗️ | 🛑  |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | setAssetAmount | External ❗️ | 🛑  |NO❗️ |
| └ | setBoosterAddress | External ❗️ | 🛑  |NO❗️ |
| └ | setExchangeAddress | External ❗️ | 🛑  |NO❗️ |
| └ | setExecutorAddress | External ❗️ | 🛑  |NO❗️ |
| └ | setGnosis | External ❗️ | 🛑  |NO❗️ |
| └ | setLastDirectionId | External ❗️ | 🛑  |NO❗️ |
| └ | setLiquidityDirection | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | updateLastTime | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ | 🛑  |NO❗️ |
||||||
| **ISuperfluidEndResolver** | Interface |  |||
| └ | addToChecker | External ❗️ | 🛑  |NO❗️ |
| └ | removeFromChecker | External ❗️ | 🛑  |NO❗️ |
||||||
| **ISuperfluidResolver** | Interface |  |||
| └ | addToChecker | External ❗️ | 🛑  |NO❗️ |
| └ | removeFromChecker | External ❗️ | 🛑  |NO❗️ |
||||||
| **IUniversalCurveConvexStrategy** | Interface | IAccessControl, IERC20 |||
| └ | claimAll | External ❗️ | 🛑  |NO❗️ |
| └ | deployToConvex | External ❗️ | 🛑  |NO❗️ |
| └ | deployToCurve | External ❗️ | 🛑  |NO❗️ |
| └ | exit | External ❗️ | 🛑  |NO❗️ |
| └ | exitOneCoin | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTokens | External ❗️ | 🛑  |NO❗️ |
| └ | executeCall | External ❗️ | 🛑  |NO❗️ |
||||||
| **IVoteExecutor** | Interface | IAccessControl, IEntry |||
| └ | execute | External ❗️ | 🛑  |NO❗️ |
||||||
| **IVoteExecutorMaster** | Interface |  |||
| └ | ALLUO | External ❗️ |   |NO❗️ |
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | approveSubmittedData | External ❗️ | 🛑  |NO❗️ |
| └ | bridgingInfo | External ❗️ |   |NO❗️ |
| └ | changeTimeLock | External ❗️ | 🛑  |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | decodeApyCommand | External ❗️ |   |NO❗️ |
| └ | decodeData | External ❗️ |   |NO❗️ |
| └ | decodeMintCommand | External ❗️ |   |NO❗️ |
| └ | encodeAllMessages | External ❗️ |   |NO❗️ |
| └ | encodeApyCommand | External ❗️ |   |NO❗️ |
| └ | encodeMintCommand | External ❗️ |   |NO❗️ |
| └ | executeSpecificData | External ❗️ | 🛑  |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | getSubmittedData | External ❗️ |   |NO❗️ |
| └ | gnosis | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | hashExecutionTime | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | locker | External ❗️ |   |NO❗️ |
| └ | minSigns | External ❗️ |   |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | setAnyCallAddresses | External ❗️ | 🛑  |NO❗️ |
| └ | setGnosis | External ❗️ | 🛑  |NO❗️ |
| └ | setLocker | External ❗️ | 🛑  |NO❗️ |
| └ | setMinSigns | External ❗️ | 🛑  |NO❗️ |
| └ | setNextChainExecutor | External ❗️ | 🛑  |NO❗️ |
| └ | submitData | External ❗️ | 🛑  |NO❗️ |
| └ | submittedData | External ❗️ |   |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | timeLock | External ❗️ |   |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ |  💵 |NO❗️ |
||||||
| **IWrappedEther** | Interface |  |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ |  💵 |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
||||||
| **AlluoLockedV4** | Implementation | Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable, IBalancerStructs |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | produced | Private 🔐 |   | |
| └ | update | Public ❗️ | 🛑  | whenNotPaused |
| └ | lock | Public ❗️ | 🛑  |NO❗️ |
| └ | migrationLock | External ❗️ | 🛑  | onlyRole |
| └ | migrateWithdrawOrClaimValues | External ❗️ | 🛑  | onlyRole |
| └ | unlock | Public ❗️ | 🛑  |NO❗️ |
| └ | unlockAll | Public ❗️ | 🛑  |NO❗️ |
| └ | withdraw | Public ❗️ | 🛑  | whenNotPaused |
| └ | claim | Public ❗️ | 🛑  |NO❗️ |
| └ | calcReward | Private 🔐 |   | |
| └ | getClaim | Public ❗️ |   |NO❗️ |
| └ | getClaimCvx | Public ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | unlockedBalanceOf | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | getInfoByAddress | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | addReward | External ❗️ | 🛑  |NO❗️ |
| └ | setReward | External ❗️ | 🛑  | onlyRole |
| └ | updateDepositLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | updateWithdrawLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | withdrawTokens | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | setCvxDistributor | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **CvxDistributorV2** | Implementation | Initializable, UUPSUpgradeable, AccessControlUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | receiveStakeInfo | External ❗️ | 🛑  | onlyRole |
| └ | receiveUnstakeInfo | External ❗️ | 🛑  | onlyRole |
| └ | claim | External ❗️ | 🛑  | onlyRole |
| └ | updateReward | External ❗️ | 🛑  | onlyRole |
| └ | exchangePrimaryTokens | Public ❗️ | 🛑  |NO❗️ |
| └ | calcReward | Private 🔐 |   | |
| └ | produced | Private 🔐 |   | |
| └ | getClaim | Public ❗️ |   |NO❗️ |
| └ | update | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | addExchange | External ❗️ | 🛑  | onlyRole |
| └ | addCvxVault | External ❗️ | 🛑  | onlyRole |
| └ | addStrategyHandler | External ❗️ | 🛑  | onlyRole |
| └ | migrate | External ❗️ | 🛑  | onlyRole |
| └ | withdrawTokens | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | accruedRewards | Public ❗️ |   |NO❗️ |
| └ | stakerAccruedRewards | Public ❗️ |   |NO❗️ |
||||||
| **IApp** | Interface |  |||
| └ | anyExecute | External ❗️ | 🛑  |NO❗️ |
| └ | anyFallback | External ❗️ | 🛑  |NO❗️ |
||||||
| **AnyCallExecutor** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | execute | External ❗️ | 🛑  |NO❗️ |
||||||
| **AnyCallV6Proxy** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | setPaused | External ❗️ | 🛑  | onlyAdmin |
| └ | _paySrcFees | Internal 🔒 | 🛑  | |
| └ | anyCall | External ❗️ |  💵 | lock whenNotPaused |
| └ | anyExec | External ❗️ | 🛑  | lock whenNotPaused charge onlyMPC |
| └ | _isSet | Internal 🔒 |   | |
| └ | calcUniqID | Public ❗️ |   |NO❗️ |
| └ | retryExec | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ |  💵 |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAccruedFees | External ❗️ | 🛑  |NO❗️ |
| └ | setBlacklist | External ❗️ | 🛑  | onlyAdmin |
| └ | setBlacklists | External ❗️ | 🛑  | onlyAdmin |
| └ | setPremium | External ❗️ | 🛑  | onlyAdmin |
| └ | setMinReserveBudget | External ❗️ | 🛑  | onlyAdmin |
| └ | setMode | External ❗️ | 🛑  | onlyAdmin |
| └ | changeMPC | External ❗️ | 🛑  | onlyMPC |
| └ | applyMPC | External ❗️ | 🛑  |NO❗️ |
| └ | accruedFees | External ❗️ |   |NO❗️ |
| └ | premium | External ❗️ |   |NO❗️ |
| └ | addAdmin | External ❗️ | 🛑  | onlyMPC |
| └ | removeAdmin | External ❗️ | 🛑  | onlyMPC |
| └ | getAllAdmins | External ❗️ |   |NO❗️ |
| └ | initAppConfig | External ❗️ | 🛑  | onlyAdmin |
| └ | updateAppConfig | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeApp | External ❗️ | 🛑  |NO❗️ |
| └ | addWhitelist | External ❗️ | 🛑  |NO❗️ |
| └ | removeWhitelist | External ❗️ | 🛑  |NO❗️ |
| └ | _setAppWhitelist | Internal 🔒 | 🛑  | |
| └ | getHistoryWhitelistLength | External ❗️ |   |NO❗️ |
| └ | getAllHistoryWhitelist | External ❗️ |   |NO❗️ |
| └ | tidyHistoryWhitelist | External ❗️ | 🛑  |NO❗️ |
| └ | setDefaultSrcFees | External ❗️ | 🛑  | onlyAdmin |
| └ | setCustomSrcFees | External ❗️ | 🛑  | onlyAdmin |
| └ | setAppModes | External ❗️ | 🛑  | onlyAdmin |
| └ | calcSrcFees | External ❗️ |   |NO❗️ |
| └ | calcSrcFees | External ❗️ |   |NO❗️ |
| └ | isUseCustomSrcFees | Public ❗️ |   |NO❗️ |
| └ | _calcSrcFees | Internal 🔒 |   | |
||||||
| **VoteExecutorV2** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | execute | External ❗️ | 🛑  | onlyRole |
| └ | exitStrategyFully | External ❗️ | 🛑  | onlyRole |
| └ | exitStrategyRewards | External ❗️ | 🛑  | onlyRole |
| └ | getTotalBalance | Public ❗️ |   |NO❗️ |
| └ | getListEntryTokens | External ❗️ |   |NO❗️ |
| └ | changeEntryTokenStatus | Public ❗️ | 🛑  | onlyRole |
| └ | changeStrategyStatus | Public ❗️ | 🛑  | onlyRole |
| └ | changeSlippage | External ❗️ | 🛑  | onlyRole |
| └ | addExchange | External ❗️ | 🛑  | onlyRole |
| └ | findBiggest | Internal 🔒 |   | |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **VoteExecutorMasterLog** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | submitData | External ❗️ | 🛑  |NO❗️ |
| └ | approveSubmittedData | External ❗️ | 🛑  |NO❗️ |
| └ | executeSpecificData | External ❗️ | 🛑  |NO❗️ |
| └ | _executeDeposits | Internal 🔒 | 🛑  | |
| └ | executeDeposits | Public ❗️ | 🛑  | onlyRole |
| └ | getSubmittedData | External ❗️ |   |NO❗️ |
| └ | encodeApyCommand | Public ❗️ |   |NO❗️ |
| └ | encodeMintCommand | Public ❗️ |   |NO❗️ |
| └ | encodeLiquidityCommand | Public ❗️ |   |NO❗️ |
| └ | encodeTreasuryAllocationChangeCommand | Public ❗️ |   |NO❗️ |
| └ | encodeAllMessages | Public ❗️ |   |NO❗️ |
| └ | updateAllIbAlluoAddresses | Public ❗️ | 🛑  |NO❗️ |
| └ | cleanDepositList | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | _verify | Internal 🔒 |   | |
| └ | _getSignerAddress | Internal 🔒 |   | |
| └ | _checkUniqueSignature | Internal 🔒 |   | |
| └ | setCrossChainInfo | Public ❗️ | 🛑  | onlyRole |
| └ | setMinSigns | Public ❗️ | 🛑  | onlyRole |
| └ | setGnosis | Public ❗️ | 🛑  | onlyRole |
| └ | setLocker | Public ❗️ | 🛑  | onlyRole |
| └ | setHandler | External ❗️ | 🛑  | onlyRole |
| └ | setExchangeAddress | Public ❗️ | 🛑  | onlyRole |
| └ | setSlippage | Public ❗️ | 🛑  | onlyRole |
| └ | setStrategyHandler | Public ❗️ | 🛑  | onlyRole |
| └ | setPriceFeed | Public ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | changeTimeLock | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
||||||
| **IAnyCall** | Interface |  |||
| └ | anyCall | External ❗️ | 🛑  |NO❗️ |
||||||
| **VoteExecutorResolver** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | VoteExecutorChecker | External ❗️ |   |NO❗️ |
| └ | _checkLastDataId | Internal 🔒 |   | |
||||||
| **IAnyCallExecutor** | Interface |  |||
| └ | context | External ❗️ | 🛑  |NO❗️ |
||||||
| **IAnyCall** | Interface |  |||
| └ | anyCall | External ❗️ | 🛑  |NO❗️ |
||||||
| **VoteExecutorSlaveFinal** | Implementation | Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | anyExecute | External ❗️ | 🛑  |NO❗️ |
| └ | execute | Internal 🔒 | 🛑  | |
| └ | _changeAPY | Internal 🔒 | 🛑  | |
| └ | _checkSignedHashes | Internal 🔒 |   | |
| └ | _checkUniqueSignature | Public ❗️ |   |NO❗️ |
| └ | setGnosis | Public ❗️ | 🛑  | onlyRole |
| └ | setMinSigns | Public ❗️ | 🛑  | onlyRole |
| └ | updateAllIbAlluoAddresses | Public ❗️ | 🛑  |NO❗️ |
| └ | encodeData | Public ❗️ |   |NO❗️ |
| └ | _verify | Internal 🔒 |   | |
| └ | setAnyCallAddresses | Public ❗️ | 🛑  | onlyRole |
| └ | setVoteExecutorMaster | Public ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **AlluoERC20Upgradable** | Implementation | Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, PausableUpgradeable |||
| └ | __ERC20_init | Internal 🔒 | 🛑  | onlyInitializing |
| └ | __ERC20_init_unchained | Internal 🔒 | 🛑  | onlyInitializing |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | _setSymbol | Internal 🔒 | 🛑  | |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  | whenNotPaused |
| └ | allowance | Public ❗️ |   |NO❗️ |
| └ | approve | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferFrom | Public ❗️ | 🛑  | whenNotPaused |
| └ | increaseAllowance | Public ❗️ | 🛑  | whenNotPaused |
| └ | decreaseAllowance | Public ❗️ | 🛑  | whenNotPaused |
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _spendAllowance | Internal 🔒 | 🛑  | |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _afterTokenTransfer | Internal 🔒 | 🛑  | |
||||||
| **IbAlluoMainnet** | Implementation | Initializable, PausableUpgradeable, AlluoERC20Upgradable, AccessControlUpgradeable, UUPSUpgradeable, Interest |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | updateRatio | Public ❗️ | 🛑  | whenNotPaused |
| └ | approveAssetValue | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferAssetValue | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferFromAssetValue | Public ❗️ | 🛑  | whenNotPaused |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | Public ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTokenValueTo | Public ❗️ | 🛑  |NO❗️ |
| └ | withdrawTokenValue | External ❗️ | 🛑  |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferFrom | Public ❗️ | 🛑  | whenNotPaused |
| └ | getBalance | Public ❗️ |   |NO❗️ |
| └ | getBalanceForTransfer | Public ❗️ |   |NO❗️ |
| └ | convertToAssetValue | Public ❗️ |   |NO❗️ |
| └ | totalAssetSupply | Public ❗️ |   |NO❗️ |
| └ | getListSupportedTokens | Public ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  | onlyRole |
| └ | burn | External ❗️ | 🛑  | onlyRole |
| └ | setSymbol | External ❗️ | 🛑  | onlyRole |
| └ | setInterest | Public ❗️ | 🛑  | onlyRole |
| └ | changeTokenStatus | External ❗️ | 🛑  | onlyRole |
| └ | setUpdateTimeLimit | Public ❗️ | 🛑  | onlyRole |
| └ | setLiquidityHandler | External ❗️ | 🛑  | onlyRole |
| └ | setExchangeAddress | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **AlluoERC20Upgradable** | Implementation | Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, PausableUpgradeable |||
| └ | __ERC20_init | Internal 🔒 | 🛑  | onlyInitializing |
| └ | __ERC20_init_unchained | Internal 🔒 | 🛑  | onlyInitializing |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  | whenNotPaused |
| └ | allowance | Public ❗️ |   |NO❗️ |
| └ | approve | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferFrom | Public ❗️ | 🛑  | whenNotPaused |
| └ | increaseAllowance | Public ❗️ | 🛑  | whenNotPaused |
| └ | decreaseAllowance | Public ❗️ | 🛑  | whenNotPaused |
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _spendAllowance | Internal 🔒 | 🛑  | |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _afterTokenTransfer | Internal 🔒 | 🛑  | |
||||||
| **IbAlluo** | Implementation | Initializable, PausableUpgradeable, AlluoERC20Upgradable, AccessControlUpgradeable, UUPSUpgradeable, Interest |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | updateRatio | Public ❗️ | 🛑  | whenNotPaused |
| └ | approveAssetValue | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferAssetValue | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferFromAssetValue | Public ❗️ | 🛑  | whenNotPaused |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | Public ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTokenValueTo | Public ❗️ | 🛑  |NO❗️ |
| └ | withdrawTokenValue | External ❗️ | 🛑  |NO❗️ |
| └ | createFlow | External ❗️ | 🛑  |NO❗️ |
| └ | createFlow | External ❗️ | 🛑  |NO❗️ |
| └ | deleteFlow | External ❗️ | 🛑  |NO❗️ |
| └ | updateFlow | External ❗️ | 🛑  |NO❗️ |
| └ | stopFlowWhenCritical | External ❗️ | 🛑  | onlyRole |
| └ | forceWrap | External ❗️ | 🛑  | onlyRole |
| └ | formatPermissions | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferFrom | Public ❗️ | 🛑  | whenNotPaused |
| └ | getBalance | Public ❗️ |   |NO❗️ |
| └ | combinedBalanceOf | Public ❗️ |   |NO❗️ |
| └ | getBalanceForTransfer | Public ❗️ |   |NO❗️ |
| └ | convertToAssetValue | Public ❗️ |   |NO❗️ |
| └ | convertToTokenValue | Public ❗️ |   |NO❗️ |
| └ | totalAssetSupply | Public ❗️ |   |NO❗️ |
| └ | getListSupportedTokens | Public ❗️ |   |NO❗️ |
| └ | isTrustedForwarder | Public ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  | onlyRole |
| └ | burn | External ❗️ | 🛑  | onlyRole |
| └ | setSuperfluidResolver | External ❗️ | 🛑  | onlyRole |
| └ | setSuperfluidEndResolver | External ❗️ | 🛑  | onlyRole |
| └ | setAutoInvestMarketToSuperToken | External ❗️ | 🛑  | onlyRole |
| └ | setInterest | Public ❗️ | 🛑  | onlyRole |
| └ | changeTokenStatus | External ❗️ | 🛑  | onlyRole |
| └ | setLiquidityHandler | External ❗️ | 🛑  | onlyRole |
| └ | setExchangeAddress | External ❗️ | 🛑  | onlyRole |
| └ | setTrustedForwarder | External ❗️ | 🛑  | onlyRole |
| └ | setSuperToken | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _msgSender | Internal 🔒 |   | |
| └ | _msgData | Internal 🔒 |   | |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **StIbAlluo** | Implementation | PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable, AlluoSuperfluidToken, IAlluoSuperToken |||
| └ | initialize | External ❗️ | 🛑  | initializer |
| └ | alluoInitialize | External ❗️ | 🛑  | initializer |
| └ | proxiableUUID | Public ❗️ |   |NO❗️ |
| └ | alluoWithdraw | External ❗️ | 🛑  | onlyRole |
| └ | emitTransfer | External ❗️ | 🛑  | onlyRole |
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | _transferFrom | Internal 🔒 | 🛑  | |
| └ | _send | Private 🔐 | 🛑  | |
| └ | _move | Private 🔐 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _callTokensToSend | Private 🔐 | 🛑  | |
| └ | _callTokensReceived | Private 🔐 | 🛑  | |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | allowance | Public ❗️ |   |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | granularity | External ❗️ |   |NO❗️ |
| └ | send | External ❗️ | 🛑  |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | isOperatorFor | External ❗️ |   |NO❗️ |
| └ | authorizeOperator | External ❗️ | 🛑  |NO❗️ |
| └ | revokeOperator | External ❗️ | 🛑  |NO❗️ |
| └ | defaultOperators | External ❗️ |   |NO❗️ |
| └ | operatorSend | External ❗️ | 🛑  |NO❗️ |
| └ | operatorBurn | External ❗️ | 🛑  |NO❗️ |
| └ | _setupDefaultOperators | Internal 🔒 | 🛑  | |
| └ | selfMint | External ❗️ | 🛑  | onlySelf |
| └ | selfBurn | External ❗️ | 🛑  | onlySelf |
| └ | selfApproveFor | External ❗️ | 🛑  | onlySelf |
| └ | selfTransferFrom | External ❗️ | 🛑  | onlySelf |
| └ | transferAll | External ❗️ | 🛑  |NO❗️ |
| └ | getUnderlyingToken | External ❗️ |   |NO❗️ |
| └ | upgrade | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | downgrade | External ❗️ | 🛑  |NO❗️ |
| └ | _upgrade | Private 🔐 | 🛑  | |
| └ | _downgrade | Private 🔐 | 🛑  | |
| └ | _toUnderlyingAmount | Private 🔐 |   | |
| └ | operationApprove | External ❗️ | 🛑  | onlyHost |
| └ | operationTransferFrom | External ❗️ | 🛑  | onlyHost |
| └ | operationUpgrade | External ❗️ | 🛑  | onlyHost |
| └ | operationDowngrade | External ❗️ | 🛑  | onlyHost |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
||||||
| **IFeedStrategy** | Interface |  |||
| └ | getPrice | External ❗️ |   |NO❗️ |
||||||
| **PriceFeedRouter** | Implementation | Ownable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | setCrytoStrategy | External ❗️ | 🛑  | onlyOwner |
| └ | setFiatStrategy | External ❗️ | 🛑  | onlyOwner |
| └ | transferOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | _getPrice | Private 🔐 |   | |
||||||
| **IFeedStrategy** | Interface |  |||
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
||||||
| **PriceFeedRouterV2** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | setCryptoStrategy | External ❗️ | 🛑  | onlyRole |
| └ | setFiatStrategy | External ❗️ | 🛑  | onlyRole |
| └ | _getPrice | Private 🔐 |   | |
| └ | _getPriceOfAmount | Private 🔐 |   | |
| └ | decimalsConverter | Public ❗️ |   |NO❗️ |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **ICurvePoolBTC** | Interface |  |||
| └ | balances | External ❗️ |   |NO❗️ |
| └ | get_virtual_price | External ❗️ |   |NO❗️ |
| └ | calc_token_amount | External ❗️ |   |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | exchange_underlying | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | calc_withdraw_one_coin | External ❗️ |   |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | coins | External ❗️ |   |NO❗️ |
| └ | underlying_coins | External ❗️ |   |NO❗️ |
| └ | admin_balances | External ❗️ |   |NO❗️ |
| └ | lp_token | External ❗️ |   |NO❗️ |
| └ | initial_A | External ❗️ |   |NO❗️ |
| └ | future_A | External ❗️ |   |NO❗️ |
| └ | initial_A_time | External ❗️ |   |NO❗️ |
| └ | future_A_time | External ❗️ |   |NO❗️ |
| └ | admin_actions_deadline | External ❗️ |   |NO❗️ |
| └ | transfer_ownership_deadline | External ❗️ |   |NO❗️ |
| └ | future_fee | External ❗️ |   |NO❗️ |
| └ | future_admin_fee | External ❗️ |   |NO❗️ |
| └ | future_offpeg_fee_multiplier | External ❗️ |   |NO❗️ |
| └ | future_owner | External ❗️ |   |NO❗️ |
| └ | reward_receiver | External ❗️ |   |NO❗️ |
| └ | admin_fee_receiver | External ❗️ |   |NO❗️ |
||||||
| **ICurvePoolEUR** | Interface |  |||
| └ | A | External ❗️ |   |NO❗️ |
| └ | A_precise | External ❗️ |   |NO❗️ |
| └ | dynamic_fee | External ❗️ |   |NO❗️ |
| └ | balances | External ❗️ |   |NO❗️ |
| └ | get_virtual_price | External ❗️ |   |NO❗️ |
| └ | calc_token_amount | External ❗️ |   |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | get_dy | External ❗️ |   |NO❗️ |
| └ | get_dy_underlying | External ❗️ |   |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | exchange_underlying | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | calc_withdraw_one_coin | External ❗️ |   |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | stop_ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | commit_new_fee | External ❗️ | 🛑  |NO❗️ |
| └ | apply_new_fee | External ❗️ | 🛑  |NO❗️ |
| └ | revert_new_parameters | External ❗️ | 🛑  |NO❗️ |
| └ | commit_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | apply_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | revert_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | donate_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | kill_me | External ❗️ | 🛑  |NO❗️ |
| └ | unkill_me | External ❗️ | 🛑  |NO❗️ |
| └ | set_aave_referral | External ❗️ | 🛑  |NO❗️ |
| └ | set_reward_receiver | External ❗️ | 🛑  |NO❗️ |
| └ | set_admin_fee_receiver | External ❗️ | 🛑  |NO❗️ |
| └ | coins | External ❗️ |   |NO❗️ |
| └ | underlying_coins | External ❗️ |   |NO❗️ |
| └ | admin_balances | External ❗️ |   |NO❗️ |
| └ | fee | External ❗️ |   |NO❗️ |
| └ | offpeg_fee_multiplier | External ❗️ |   |NO❗️ |
| └ | admin_fee | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | lp_token | External ❗️ |   |NO❗️ |
| └ | initial_A | External ❗️ |   |NO❗️ |
| └ | future_A | External ❗️ |   |NO❗️ |
| └ | initial_A_time | External ❗️ |   |NO❗️ |
| └ | future_A_time | External ❗️ |   |NO❗️ |
| └ | admin_actions_deadline | External ❗️ |   |NO❗️ |
| └ | transfer_ownership_deadline | External ❗️ |   |NO❗️ |
| └ | future_fee | External ❗️ |   |NO❗️ |
| └ | future_admin_fee | External ❗️ |   |NO❗️ |
| └ | future_offpeg_fee_multiplier | External ❗️ |   |NO❗️ |
| └ | future_owner | External ❗️ |   |NO❗️ |
| └ | reward_receiver | External ❗️ |   |NO❗️ |
| └ | admin_fee_receiver | External ❗️ |   |NO❗️ |
||||||
| **ICurvePoolUSD** | Interface |  |||
| └ | A | External ❗️ |   |NO❗️ |
| └ | A_precise | External ❗️ |   |NO❗️ |
| └ | dynamic_fee | External ❗️ |   |NO❗️ |
| └ | balances | External ❗️ |   |NO❗️ |
| └ | get_virtual_price | External ❗️ |   |NO❗️ |
| └ | calc_token_amount | External ❗️ |   |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | get_dy | External ❗️ |   |NO❗️ |
| └ | get_dy_underlying | External ❗️ |   |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | exchange_underlying | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | calc_withdraw_one_coin | External ❗️ |   |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | stop_ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | commit_new_fee | External ❗️ | 🛑  |NO❗️ |
| └ | apply_new_fee | External ❗️ | 🛑  |NO❗️ |
| └ | revert_new_parameters | External ❗️ | 🛑  |NO❗️ |
| └ | commit_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | apply_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | revert_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | donate_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | kill_me | External ❗️ | 🛑  |NO❗️ |
| └ | unkill_me | External ❗️ | 🛑  |NO❗️ |
| └ | set_aave_referral | External ❗️ | 🛑  |NO❗️ |
| └ | set_reward_receiver | External ❗️ | 🛑  |NO❗️ |
| └ | set_admin_fee_receiver | External ❗️ | 🛑  |NO❗️ |
| └ | coins | External ❗️ |   |NO❗️ |
| └ | underlying_coins | External ❗️ |   |NO❗️ |
| └ | admin_balances | External ❗️ |   |NO❗️ |
| └ | fee | External ❗️ |   |NO❗️ |
| └ | offpeg_fee_multiplier | External ❗️ |   |NO❗️ |
| └ | admin_fee | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | lp_token | External ❗️ |   |NO❗️ |
| └ | initial_A | External ❗️ |   |NO❗️ |
| └ | future_A | External ❗️ |   |NO❗️ |
| └ | initial_A_time | External ❗️ |   |NO❗️ |
| └ | future_A_time | External ❗️ |   |NO❗️ |
| └ | admin_actions_deadline | External ❗️ |   |NO❗️ |
| └ | transfer_ownership_deadline | External ❗️ |   |NO❗️ |
| └ | future_fee | External ❗️ |   |NO❗️ |
| └ | future_admin_fee | External ❗️ |   |NO❗️ |
| └ | future_offpeg_fee_multiplier | External ❗️ |   |NO❗️ |
| └ | future_owner | External ❗️ |   |NO❗️ |
| └ | reward_receiver | External ❗️ |   |NO❗️ |
| └ | admin_fee_receiver | External ❗️ |   |NO❗️ |
||||||
| **CustomSuperTokenBase** | Implementation |  |||
||||||
| **SuperAppDefinitions** | Library |  |||
| └ | getAppLevel | Internal 🔒 |   | |
| └ | isAppJailed | Internal 🔒 |   | |
| └ | isConfigWordClean | Internal 🔒 |   | |
||||||
| **ContextDefinitions** | Library |  |||
| └ | decodeCallInfo | Internal 🔒 |   | |
| └ | encodeCallInfo | Internal 🔒 |   | |
||||||
| **FlowOperatorDefinitions** | Library |  |||
| └ | isPermissionsClean | Internal 🔒 |   | |
||||||
| **BatchOperation** | Library |  |||
||||||
| **SuperfluidGovernanceConfigs** | Library |  |||
| └ | getTrustedForwarderConfigKey | Internal 🔒 |   | |
| └ | getAppRegistrationConfigKey | Internal 🔒 |   | |
| └ | getAppFactoryConfigKey | Internal 🔒 |   | |
| └ | decodePPPConfig | Internal 🔒 |   | |
||||||
| **ERC20WithTokenInfo** | Implementation | IERC20, TokenInfo |||
||||||
| **IAlluoSuperToken** | Interface | ISuperToken |||
| └ | alluoWithdraw | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | emitTransfer | External ❗️ | 🛑  |NO❗️ |
||||||
| **IConstantFlowAgreementV1** | Implementation | ISuperAgreement |||
| └ | agreementType | External ❗️ |   |NO❗️ |
| └ | getMaximumFlowRateFromDeposit | External ❗️ |   |NO❗️ |
| └ | getDepositRequiredForFlowRate | External ❗️ |   |NO❗️ |
| └ | isPatricianPeriodNow | Public ❗️ |   |NO❗️ |
| └ | isPatricianPeriod | Public ❗️ |   |NO❗️ |
| └ | updateFlowOperatorPermissions | External ❗️ | 🛑  |NO❗️ |
| └ | authorizeFlowOperatorWithFullControl | External ❗️ | 🛑  |NO❗️ |
| └ | revokeFlowOperatorWithFullControl | External ❗️ | 🛑  |NO❗️ |
| └ | getFlowOperatorData | Public ❗️ |   |NO❗️ |
| └ | getFlowOperatorDataByID | External ❗️ |   |NO❗️ |
| └ | createFlow | External ❗️ | 🛑  |NO❗️ |
| └ | createFlowByOperator | External ❗️ | 🛑  |NO❗️ |
| └ | updateFlow | External ❗️ | 🛑  |NO❗️ |
| └ | updateFlowByOperator | External ❗️ | 🛑  |NO❗️ |
| └ | getFlow | External ❗️ |   |NO❗️ |
| └ | getFlowByID | External ❗️ |   |NO❗️ |
| └ | getAccountFlowInfo | External ❗️ |   |NO❗️ |
| └ | getNetFlow | External ❗️ |   |NO❗️ |
| └ | deleteFlow | External ❗️ | 🛑  |NO❗️ |
| └ | deleteFlowByOperator | External ❗️ | 🛑  |NO❗️ |
||||||
| **IInstantDistributionAgreementV1** | Implementation | ISuperAgreement |||
| └ | agreementType | External ❗️ |   |NO❗️ |
| └ | createIndex | External ❗️ | 🛑  |NO❗️ |
| └ | getIndex | External ❗️ |   |NO❗️ |
| └ | calculateDistribution | External ❗️ |   |NO❗️ |
| └ | updateIndex | External ❗️ | 🛑  |NO❗️ |
| └ | distribute | External ❗️ | 🛑  |NO❗️ |
| └ | approveSubscription | External ❗️ | 🛑  |NO❗️ |
| └ | revokeSubscription | External ❗️ | 🛑  |NO❗️ |
| └ | updateSubscription | External ❗️ | 🛑  |NO❗️ |
| └ | getSubscription | External ❗️ |   |NO❗️ |
| └ | getSubscriptionByID | External ❗️ |   |NO❗️ |
| └ | listSubscriptions | External ❗️ |   |NO❗️ |
| └ | deleteSubscription | External ❗️ | 🛑  |NO❗️ |
| └ | claim | External ❗️ | 🛑  |NO❗️ |
||||||
| **IRelayRecipient** | Interface |  |||
| └ | isTrustedForwarder | External ❗️ |   |NO❗️ |
| └ | versionRecipient | External ❗️ |   |NO❗️ |
||||||
| **ISuperAgreement** | Interface |  |||
| └ | agreementType | External ❗️ |   |NO❗️ |
| └ | realtimeBalanceOf | External ❗️ |   |NO❗️ |
||||||
| **ISuperApp** | Interface |  |||
| └ | beforeAgreementCreated | External ❗️ |   |NO❗️ |
| └ | afterAgreementCreated | External ❗️ | 🛑  |NO❗️ |
| └ | beforeAgreementUpdated | External ❗️ |   |NO❗️ |
| └ | afterAgreementUpdated | External ❗️ | 🛑  |NO❗️ |
| └ | beforeAgreementTerminated | External ❗️ |   |NO❗️ |
| └ | afterAgreementTerminated | External ❗️ | 🛑  |NO❗️ |
||||||
| **ISuperfluid** | Interface |  |||
| └ | getNow | External ❗️ |   |NO❗️ |
| └ | getGovernance | External ❗️ |   |NO❗️ |
| └ | replaceGovernance | External ❗️ | 🛑  |NO❗️ |
| └ | registerAgreementClass | External ❗️ | 🛑  |NO❗️ |
| └ | updateAgreementClass | External ❗️ | 🛑  |NO❗️ |
| └ | isAgreementTypeListed | External ❗️ |   |NO❗️ |
| └ | isAgreementClassListed | External ❗️ |   |NO❗️ |
| └ | getAgreementClass | External ❗️ |   |NO❗️ |
| └ | mapAgreementClasses | External ❗️ |   |NO❗️ |
| └ | addToAgreementClassesBitmap | External ❗️ |   |NO❗️ |
| └ | removeFromAgreementClassesBitmap | External ❗️ |   |NO❗️ |
| └ | getSuperTokenFactory | External ❗️ |   |NO❗️ |
| └ | getSuperTokenFactoryLogic | External ❗️ |   |NO❗️ |
| └ | updateSuperTokenFactory | External ❗️ | 🛑  |NO❗️ |
| └ | updateSuperTokenLogic | External ❗️ | 🛑  |NO❗️ |
| └ | registerApp | External ❗️ | 🛑  |NO❗️ |
| └ | registerAppWithKey | External ❗️ | 🛑  |NO❗️ |
| └ | registerAppByFactory | External ❗️ | 🛑  |NO❗️ |
| └ | isApp | External ❗️ |   |NO❗️ |
| └ | getAppLevel | External ❗️ |   |NO❗️ |
| └ | getAppManifest | External ❗️ |   |NO❗️ |
| └ | isAppJailed | External ❗️ |   |NO❗️ |
| └ | allowCompositeApp | External ❗️ | 🛑  |NO❗️ |
| └ | isCompositeAppAllowed | External ❗️ |   |NO❗️ |
| └ | callAppBeforeCallback | External ❗️ | 🛑  |NO❗️ |
| └ | callAppAfterCallback | External ❗️ | 🛑  |NO❗️ |
| └ | appCallbackPush | External ❗️ | 🛑  |NO❗️ |
| └ | appCallbackPop | External ❗️ | 🛑  |NO❗️ |
| └ | ctxUseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | jailApp | External ❗️ | 🛑  |NO❗️ |
| └ | callAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | callAppAction | External ❗️ | 🛑  |NO❗️ |
| └ | callAgreementWithContext | External ❗️ | 🛑  |NO❗️ |
| └ | callAppActionWithContext | External ❗️ | 🛑  |NO❗️ |
| └ | decodeCtx | External ❗️ |   |NO❗️ |
| └ | isCtxValid | External ❗️ |   |NO❗️ |
| └ | batchCall | External ❗️ | 🛑  |NO❗️ |
| └ | forwardBatchCall | External ❗️ | 🛑  |NO❗️ |
||||||
| **ISuperfluidGovernance** | Interface |  |||
| └ | replaceGovernance | External ❗️ | 🛑  |NO❗️ |
| └ | registerAgreementClass | External ❗️ | 🛑  |NO❗️ |
| └ | updateContracts | External ❗️ | 🛑  |NO❗️ |
| └ | batchUpdateSuperTokenLogic | External ❗️ | 🛑  |NO❗️ |
| └ | setConfig | External ❗️ | 🛑  |NO❗️ |
| └ | setConfig | External ❗️ | 🛑  |NO❗️ |
| └ | clearConfig | External ❗️ | 🛑  |NO❗️ |
| └ | getConfigAsAddress | External ❗️ |   |NO❗️ |
| └ | getConfigAsUint256 | External ❗️ |   |NO❗️ |
||||||
| **ISuperfluidToken** | Interface |  |||
| └ | getHost | External ❗️ |   |NO❗️ |
| └ | realtimeBalanceOf | External ❗️ |   |NO❗️ |
| └ | realtimeBalanceOfNow | External ❗️ |   |NO❗️ |
| └ | isAccountCritical | External ❗️ |   |NO❗️ |
| └ | isAccountCriticalNow | External ❗️ |   |NO❗️ |
| └ | isAccountSolvent | External ❗️ |   |NO❗️ |
| └ | isAccountSolventNow | External ❗️ |   |NO❗️ |
| └ | getAccountActiveAgreements | External ❗️ |   |NO❗️ |
| └ | createAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | getAgreementData | External ❗️ |   |NO❗️ |
| └ | updateAgreementData | External ❗️ | 🛑  |NO❗️ |
| └ | terminateAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | updateAgreementStateSlot | External ❗️ | 🛑  |NO❗️ |
| └ | getAgreementStateSlot | External ❗️ |   |NO❗️ |
| └ | settleBalance | External ❗️ | 🛑  |NO❗️ |
| └ | makeLiquidationPayoutsV2 | External ❗️ | 🛑  |NO❗️ |
||||||
| **ISuperToken** | Interface | ISuperfluidToken, TokenInfo, IERC20, IERC777 |||
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | granularity | External ❗️ |   |NO❗️ |
| └ | send | External ❗️ | 🛑  |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | isOperatorFor | External ❗️ |   |NO❗️ |
| └ | authorizeOperator | External ❗️ | 🛑  |NO❗️ |
| └ | revokeOperator | External ❗️ | 🛑  |NO❗️ |
| └ | defaultOperators | External ❗️ |   |NO❗️ |
| └ | operatorSend | External ❗️ | 🛑  |NO❗️ |
| └ | operatorBurn | External ❗️ | 🛑  |NO❗️ |
| └ | selfMint | External ❗️ | 🛑  |NO❗️ |
| └ | selfBurn | External ❗️ | 🛑  |NO❗️ |
| └ | selfTransferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | selfApproveFor | External ❗️ | 🛑  |NO❗️ |
| └ | transferAll | External ❗️ | 🛑  |NO❗️ |
| └ | getUnderlyingToken | External ❗️ |   |NO❗️ |
| └ | upgrade | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | downgrade | External ❗️ | 🛑  |NO❗️ |
| └ | operationApprove | External ❗️ | 🛑  |NO❗️ |
| └ | operationTransferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | operationUpgrade | External ❗️ | 🛑  |NO❗️ |
| └ | operationDowngrade | External ❗️ | 🛑  |NO❗️ |
||||||
| **ISuperTokenFactory** | Interface |  |||
| └ | getHost | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | getSuperTokenLogic | External ❗️ |   |NO❗️ |
| └ | createERC20Wrapper | External ❗️ | 🛑  |NO❗️ |
| └ | initializeCustomSuperToken | External ❗️ | 🛑  |NO❗️ |
||||||
| **TokenInfo** | Interface |  |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
||||||
| **Interest** | Implementation | Math |||
| └ | compounding | Private 🔐 |   | |
| └ | changeRatio | Internal 🔒 |   | |
| └ | _chargeInterest | Internal 🔒 |   | |
| └ | toAmount | Private 🔐 |   | |
| └ | toPie | Private 🔐 |   | |
| └ | rpow | Private 🔐 |   | |
||||||
| **Math** | Implementation |  |||
| └ | safeAdd | Internal 🔒 |   | |
| └ | safeSub | Internal 🔒 |   | |
| └ | safeMul | Internal 🔒 |   | |
| └ | safeDiv | Internal 🔒 |   | |
| └ | rmul | Internal 🔒 |   | |
| └ | rdiv | Internal 🔒 |   | |
| └ | rdivup | Internal 🔒 |   | |
||||||
| **AlluoLockedV2Final** | Implementation | Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, IBalancerStructs |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | withdrawTokens | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
||||||
| **AlluoLockedV3** | Implementation | Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable, IBalancerStructs |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | produced | Private 🔐 |   | |
| └ | update | Public ❗️ | 🛑  | whenNotPaused |
| └ | lock | Public ❗️ | 🛑  |NO❗️ |
| └ | lockWETH | Public ❗️ | 🛑  |NO❗️ |
| └ | migrationLock | External ❗️ | 🛑  | onlyRole |
| └ | unlock | Public ❗️ | 🛑  |NO❗️ |
| └ | unlockAll | Public ❗️ | 🛑  |NO❗️ |
| └ | withdraw | Public ❗️ | 🛑  | whenNotPaused |
| └ | claim | Public ❗️ | 🛑  |NO❗️ |
| └ | calcReward | Private 🔐 |   | |
| └ | getClaim | Public ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | unlockedBalanceOf | External ❗️ |   |NO❗️ |
| └ | convertAlluoToLp | External ❗️ |   |NO❗️ |
| └ | convertLpToAlluo | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | getInfoByAddress | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | addReward | External ❗️ | 🛑  |NO❗️ |
| └ | setReward | External ❗️ | 🛑  | onlyRole |
| └ | updateDepositLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | updateWithdrawLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | withdrawTokens | External ❗️ | 🛑  | onlyRole |
| └ | _exitAlluoPoolExactLp | Private 🔐 | 🛑  | |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **CvxDistributor** | Implementation | Initializable, UUPSUpgradeable, AccessControlUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | receiveStakeInfo | External ❗️ | 🛑  | onlyRole |
| └ | receiveUnstakeInfo | External ❗️ | 🛑  | onlyRole |
| └ | claim | External ❗️ | 🛑  | onlyRole |
| └ | receiveReward | External ❗️ | 🛑  | onlyRole |
| └ | forceDeposit | External ❗️ | 🛑  | onlyRole |
| └ | forceWithdraw | External ❗️ | 🛑  | onlyRole |
| └ | forceClaimCycle | External ❗️ | 🛑  | onlyRole |
| └ | calcReward | Private 🔐 |   | |
| └ | produced | Private 🔐 |   | |
| └ | getClaim | Public ❗️ |   |NO❗️ |
| └ | update | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | addExchange | External ❗️ | 🛑  | onlyRole |
| └ | withdrawTokens | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
| └ | getRewards | Private 🔐 | 🛑  | |
| └ | accruedRewards | Public ❗️ |   |NO❗️ |
| └ | stakerAccruedRewards | Public ❗️ |   |NO❗️ |
| └ | getCvxRewardPool | Private 🔐 |   | |
||||||
| **VoteExecutor** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | execute | External ❗️ | 🛑  | onlyRole |
| └ | getTotalBalance | Public ❗️ |   |NO❗️ |
| └ | getListEntryTokens | External ❗️ |   |NO❗️ |
| └ | changeEntryTokenStatus | Public ❗️ | 🛑  | onlyRole |
| └ | changeSlippage | External ❗️ | 🛑  | onlyRole |
| └ | addStrategy | External ❗️ | 🛑  | onlyRole |
| └ | addExchange | External ❗️ | 🛑  | onlyRole |
| └ | findBiggest | Internal 🔒 |   | |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
||||||
| **CurveConvexStrategyV2** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | getDeployedAmountAndRewards | External ❗️ | 🛑  | onlyRole |
| └ | withdrawRewards | Public ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | getDeployedAmount | External ❗️ |   |NO❗️ |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | encodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **CurveConvexStrategyV2Native** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | getDeployedAmountAndRewards | External ❗️ | 🛑  | onlyRole |
| └ | withdrawRewards | Public ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | changeAdditionalRewardTokenStatus | External ❗️ | 🛑  | onlyRole |
| └ | getDeployedAmount | External ❗️ |   |NO❗️ |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | encodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **StrategyHandler** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | calculateAll | External ❗️ | 🛑  | onlyRole |
| └ | calculateOnlyLp | External ❗️ | 🛑  | onlyRole |
| └ | getCurrentDeployed | External ❗️ |   |NO❗️ |
| └ | getLatestDeployed | External ❗️ |   |NO❗️ |
| └ | adjustTreasury | External ❗️ | 🛑  | onlyRole |
| └ | getDirectionIdByName | External ❗️ |   |NO❗️ |
| └ | getDirectionLatestAmount | External ❗️ |   |NO❗️ |
| └ | getLiquidityDirectionByName | External ❗️ |   |NO❗️ |
| └ | getAssetIdByDirectionId | External ❗️ |   |NO❗️ |
| └ | getDirectionFullInfoById | External ❗️ |   |NO❗️ |
| └ | getLiquidityDirectionById | External ❗️ |   |NO❗️ |
| └ | getPrimaryTokenByAssetId | External ❗️ |   |NO❗️ |
| └ | setAssetAmount | External ❗️ | 🛑  | onlyRole |
| └ | getAssetAmount | External ❗️ |   |NO❗️ |
| └ | getAssetActiveIds | External ❗️ |   |NO❗️ |
| └ | getAllAssetActiveIds | External ❗️ |   |NO❗️ |
| └ | addToActiveDirections | External ❗️ | 🛑  | onlyRole |
| └ | removeFromActiveDirections | External ❗️ | 🛑  | onlyRole |
| └ | setGnosis | External ❗️ | 🛑  | onlyRole |
| └ | updateLastTime | External ❗️ | 🛑  | onlyRole |
| └ | setExchangeAddress | External ❗️ | 🛑  | onlyRole |
| └ | setBoosterAddress | External ❗️ | 🛑  | onlyRole |
| └ | setExecutorAddress | External ❗️ | 🛑  | onlyRole |
| └ | setLiquidityDirection | External ❗️ | 🛑  | onlyRole |
| └ | addLiquidityDirection | External ❗️ | 🛑  |NO❗️ |
| └ | setLastDirectionId | External ❗️ | 🛑  | onlyRole |
| └ | changeNumberOfAssets | External ❗️ | 🛑  | onlyRole |
| └ | changeAssetInfo | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **AlluoLockedV3ForTest** | Implementation | Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | produced | Private 🔐 |   | |
| └ | update | Public ❗️ | 🛑  | whenNotPaused |
| └ | lock | Public ❗️ | 🛑  |NO❗️ |
| └ | lockWETH | Public ❗️ | 🛑  |NO❗️ |
| └ | migrationLock | External ❗️ | 🛑  | onlyRole |
| └ | unlock | Public ❗️ | 🛑  |NO❗️ |
| └ | unlockAll | Public ❗️ | 🛑  |NO❗️ |
| └ | withdraw | Public ❗️ | 🛑  | whenNotPaused |
| └ | claim | Public ❗️ | 🛑  |NO❗️ |
| └ | calcReward | Private 🔐 |   | |
| └ | getClaim | Public ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | unlockedBalanceOf | External ❗️ |   |NO❗️ |
| └ | converAlluoToLp | External ❗️ |   |NO❗️ |
| └ | convertLpToAlluo | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | getInfoByAddress | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | addReward | External ❗️ | 🛑  |NO❗️ |
| └ | setReward | External ❗️ | 🛑  | onlyRole |
| └ | updateDepositLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | updateWithdrawLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | withdrawTokens | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **IAlluoStrategy** | Interface |  |||
| └ | invest | External ❗️ | 🛑  |NO❗️ |
| └ | exitAll | External ❗️ | 🛑  |NO❗️ |
| └ | exitOnlyRewards | External ❗️ | 🛑  |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICvxBooster** | Interface |  |||
| └ | FEE_DENOMINATOR | External ❗️ |   |NO❗️ |
| └ | MaxFees | External ❗️ |   |NO❗️ |
| └ | addPool | External ❗️ | 🛑  |NO❗️ |
| └ | claimRewards | External ❗️ | 🛑  |NO❗️ |
| └ | crv | External ❗️ |   |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | depositAll | External ❗️ | 🛑  |NO❗️ |
| └ | distributionAddressId | External ❗️ |   |NO❗️ |
| └ | earmarkFees | External ❗️ | 🛑  |NO❗️ |
| └ | earmarkIncentive | External ❗️ |   |NO❗️ |
| └ | earmarkRewards | External ❗️ | 🛑  |NO❗️ |
| └ | feeDistro | External ❗️ |   |NO❗️ |
| └ | feeManager | External ❗️ |   |NO❗️ |
| └ | feeToken | External ❗️ |   |NO❗️ |
| └ | gaugeMap | External ❗️ |   |NO❗️ |
| └ | isShutdown | External ❗️ |   |NO❗️ |
| └ | lockFees | External ❗️ |   |NO❗️ |
| └ | lockIncentive | External ❗️ |   |NO❗️ |
| └ | lockRewards | External ❗️ |   |NO❗️ |
| └ | minter | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | platformFee | External ❗️ |   |NO❗️ |
| └ | poolInfo | External ❗️ |   |NO❗️ |
| └ | poolLength | External ❗️ |   |NO❗️ |
| └ | poolManager | External ❗️ |   |NO❗️ |
| └ | registry | External ❗️ |   |NO❗️ |
| └ | rewardArbitrator | External ❗️ |   |NO❗️ |
| └ | rewardClaimed | External ❗️ | 🛑  |NO❗️ |
| └ | rewardFactory | External ❗️ |   |NO❗️ |
| └ | setArbitrator | External ❗️ | 🛑  |NO❗️ |
| └ | setFactories | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeInfo | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeManager | External ❗️ | 🛑  |NO❗️ |
| └ | setFees | External ❗️ | 🛑  |NO❗️ |
| └ | setGaugeRedirect | External ❗️ | 🛑  |NO❗️ |
| └ | setOwner | External ❗️ | 🛑  |NO❗️ |
| └ | setPoolManager | External ❗️ | 🛑  |NO❗️ |
| └ | setRewardContracts | External ❗️ | 🛑  |NO❗️ |
| └ | setTreasury | External ❗️ | 🛑  |NO❗️ |
| └ | setVoteDelegate | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownPool | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownSystem | External ❗️ | 🛑  |NO❗️ |
| └ | staker | External ❗️ |   |NO❗️ |
| └ | stakerIncentive | External ❗️ |   |NO❗️ |
| └ | stakerRewards | External ❗️ |   |NO❗️ |
| └ | stashFactory | External ❗️ |   |NO❗️ |
| └ | tokenFactory | External ❗️ |   |NO❗️ |
| └ | treasury | External ❗️ |   |NO❗️ |
| └ | vote | External ❗️ | 🛑  |NO❗️ |
| └ | voteDelegate | External ❗️ |   |NO❗️ |
| └ | voteGaugeWeight | External ❗️ | 🛑  |NO❗️ |
| └ | voteOwnership | External ❗️ |   |NO❗️ |
| └ | voteParameter | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICvxBaseRewardPool** | Interface |  |||
| └ | addExtraReward | External ❗️ | 🛑  |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | clearExtraRewards | External ❗️ | 🛑  |NO❗️ |
| └ | currentRewards | External ❗️ |   |NO❗️ |
| └ | donate | External ❗️ | 🛑  |NO❗️ |
| └ | duration | External ❗️ |   |NO❗️ |
| └ | earned | External ❗️ |   |NO❗️ |
| └ | extraRewards | External ❗️ |   |NO❗️ |
| └ | extraRewardsLength | External ❗️ |   |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | historicalRewards | External ❗️ |   |NO❗️ |
| └ | lastTimeRewardApplicable | External ❗️ |   |NO❗️ |
| └ | lastUpdateTime | External ❗️ |   |NO❗️ |
| └ | newRewardRatio | External ❗️ |   |NO❗️ |
| └ | operator | External ❗️ |   |NO❗️ |
| └ | periodFinish | External ❗️ |   |NO❗️ |
| └ | pid | External ❗️ |   |NO❗️ |
| └ | queueNewRewards | External ❗️ | 🛑  |NO❗️ |
| └ | queuedRewards | External ❗️ |   |NO❗️ |
| └ | rewardManager | External ❗️ |   |NO❗️ |
| └ | rewardPerToken | External ❗️ |   |NO❗️ |
| └ | rewardPerTokenStored | External ❗️ |   |NO❗️ |
| └ | rewardRate | External ❗️ |   |NO❗️ |
| └ | rewardToken | External ❗️ |   |NO❗️ |
| └ | rewards | External ❗️ |   |NO❗️ |
| └ | stake | External ❗️ | 🛑  |NO❗️ |
| └ | stakeAll | External ❗️ | 🛑  |NO❗️ |
| └ | stakeFor | External ❗️ | 🛑  |NO❗️ |
| └ | stakingToken | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | userRewardPerTokenPaid | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAllAndUnwrap | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAndUnwrap | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICurve2Pool** | Interface |  |||
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | calc_withdraw_one_coin | External ❗️ |   |NO❗️ |
| └ | coins | External ❗️ |   |NO❗️ |
||||||
| **CurveConvexStrategyTest** | Implementation | AccessControl, IAlluoStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
||||||
| **FakeBalancer** | Implementation | Initializable, PausableUpgradeable, AlluoERC20Upgradable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | enterPoolAlluo | Public ❗️ | 🛑  |NO❗️ |
| └ | enterPoolWeth | Public ❗️ | 🛑  |NO❗️ |
| └ | exitPoolAlluo | Public ❗️ | 🛑  |NO❗️ |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **Context** | Implementation |  |||
| └ | _msgSender | Internal 🔒 |   | |
| └ | _msgData | Internal 🔒 |   | |
||||||
| **SafeMath** | Library |  |||
| └ | add | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | mul | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
||||||
| **Address** | Library |  |||
| └ | isContract | Internal 🔒 |   | |
| └ | sendValue | Internal 🔒 | 🛑  | |
| └ | functionCall | Internal 🔒 | 🛑  | |
| └ | functionCall | Internal 🔒 | 🛑  | |
| └ | functionCallWithValue | Internal 🔒 | 🛑  | |
| └ | functionCallWithValue | Internal 🔒 | 🛑  | |
| └ | _functionCallWithValue | Private 🔐 | 🛑  | |
||||||
| **IERC20Internal** | Implementation |  |||
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _transferFrom | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _increaseAllowance | Internal 🔒 | 🛑  | |
| └ | _decreaseAllowance | Internal 🔒 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
||||||
| **ERC20** | Implementation | Context, IERC20, IERC20Internal |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | _setName | Internal 🔒 | 🛑  | |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | _setSymbol | Internal 🔒 | 🛑  | |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | _setDecimals | Internal 🔒 | 🛑  | |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _setupDecimals | Internal 🔒 | 🛑  | |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _transferFrom | Internal 🔒 | 🛑  | |
| └ | _increaseAllowance | Internal 🔒 | 🛑  | |
| └ | _decreaseAllowance | Internal 🔒 | 🛑  | |
||||||
| **EnumerableSet** | Library |  |||
| └ | _add | Private 🔐 | 🛑  | |
| └ | _remove | Private 🔐 | 🛑  | |
| └ | _contains | Private 🔐 |   | |
| └ | _length | Private 🔐 |   | |
| └ | _at | Private 🔐 |   | |
| └ | add | Internal 🔒 | 🛑  | |
| └ | remove | Internal 🔒 | 🛑  | |
| └ | contains | Internal 🔒 |   | |
| └ | length | Internal 🔒 |   | |
| └ | at | Internal 🔒 |   | |
| └ | add | Internal 🔒 | 🛑  | |
| └ | remove | Internal 🔒 | 🛑  | |
| └ | contains | Internal 🔒 |   | |
| └ | length | Internal 🔒 |   | |
| └ | at | Internal 🔒 |   | |
||||||
| **AccessControl** | Implementation | Context |||
| └ | hasRole | Public ❗️ |   |NO❗️ |
| └ | getRoleMemberCount | Public ❗️ |   |NO❗️ |
| └ | getRoleMember | Public ❗️ |   |NO❗️ |
| └ | getRoleAdmin | Public ❗️ |   |NO❗️ |
| └ | grantRole | Public ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | Public ❗️ | 🛑  |NO❗️ |
| └ | renounceRole | Public ❗️ | 🛑  |NO❗️ |
| └ | _setupRole | Internal 🔒 | 🛑  | |
| └ | _setRoleAdmin | Internal 🔒 | 🛑  | |
| └ | _grantRole | Private 🔐 | 🛑  | |
| └ | _revokeRole | Private 🔐 | 🛑  | |
||||||
| **AccessControlMixin** | Implementation | AccessControl |||
| └ | _setupContractId | Internal 🔒 | 🛑  | |
||||||
| **IChildToken** | Interface |  |||
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
||||||
| **ECRecover** | Library |  |||
| └ | recover | Internal 🔒 |   | |
||||||
| **EIP712** | Library |  |||
| └ | makeDomainSeparator | Internal 🔒 |   | |
| └ | recover | Internal 🔒 |   | |
||||||
| **EIP712Domain** | Implementation |  |||
| └ | _setDomainSeparator | Internal 🔒 | 🛑  | |
||||||
| **Nonces** | Implementation |  |||
| └ | nonces | External ❗️ |   |NO❗️ |
||||||
| **NativeMetaTransaction** | Implementation | EIP712Domain, Nonces |||
| └ | executeMetaTransaction | External ❗️ |  💵 |NO❗️ |
| └ | _verify | Internal 🔒 |   | |
||||||
| **ContextMixin** | Implementation |  |||
| └ | msgSender | Internal 🔒 |   | |
||||||
| **Permit** | Implementation | IERC20Internal, EIP712Domain, Nonces |||
| └ | _permit | Internal 🔒 | 🛑  | |
||||||
| **GasAbstraction** | Implementation | IERC20Internal, EIP712Domain |||
| └ | authorizationState | External ❗️ |   |NO❗️ |
| └ | _transferWithAuthorization | Internal 🔒 | 🛑  | |
| └ | _increaseAllowanceWithAuthorization | Internal 🔒 | 🛑  | |
| └ | _decreaseAllowanceWithAuthorization | Internal 🔒 | 🛑  | |
| └ | _approveWithAuthorization | Internal 🔒 | 🛑  | |
| └ | _cancelAuthorization | Internal 🔒 | 🛑  | |
| └ | _requireUnusedAuthorization | Private 🔐 |   | |
| └ | _requireValidAuthorization | Internal 🔒 |   | |
| └ | _markAuthorizationAsUsed | Internal 🔒 | 🛑  | |
||||||
| **MaticGasAbstraction** | Implementation | GasAbstraction |||
| └ | _withdrawWithAuthorization | Internal 🔒 | 🛑  | |
||||||
| **UChildERC20** | Implementation | ERC20, IChildToken, AccessControlMixin, Initializable, NativeMetaTransaction, ContextMixin, Permit, MaticGasAbstraction |||
| └ | initialize | External ❗️ | 🛑  | initializer |
| └ | _msgSender | Internal 🔒 |   | |
| └ | updateMetadata | External ❗️ | 🛑  | only |
| └ | deposit | External ❗️ | 🛑  | only |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | permit | External ❗️ | 🛑  |NO❗️ |
| └ | transferWithAuthorization | External ❗️ | 🛑  |NO❗️ |
| └ | approveWithAuthorization | External ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowanceWithAuthorization | External ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowanceWithAuthorization | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawWithAuthorization | External ❗️ | 🛑  |NO❗️ |
| └ | cancelAuthorization | External ❗️ | 🛑  |NO❗️ |
||||||
| **Blacklistable** | Implementation | AccessControlMixin |||
| └ | blacklisters | External ❗️ |   |NO❗️ |
| └ | isBlacklisted | External ❗️ |   |NO❗️ |
| └ | blacklist | External ❗️ | 🛑  | only |
| └ | unBlacklist | External ❗️ | 🛑  | only |
||||||
| **Pausable** | Implementation | AccessControlMixin |||
| └ | pausers | External ❗️ |   |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  | only |
| └ | unpause | External ❗️ | 🛑  | only |
||||||
| **SafeERC20** | Library |  |||
| └ | safeTransfer | Internal 🔒 | 🛑  | |
| └ | safeTransferFrom | Internal 🔒 | 🛑  | |
| └ | safeApprove | Internal 🔒 | 🛑  | |
| └ | safeIncreaseAllowance | Internal 🔒 | 🛑  | |
| └ | safeDecreaseAllowance | Internal 🔒 | 🛑  | |
| └ | _callOptionalReturn | Private 🔐 | 🛑  | |
||||||
| **Rescuable** | Implementation | AccessControlMixin |||
| └ | rescuers | External ❗️ |   |NO❗️ |
| └ | rescueERC20 | External ❗️ | 🛑  | only |
||||||
| **UChildAdministrableERC20** | Implementation | UChildERC20, Blacklistable, Pausable, Rescuable, UUPSUpgradeable |||
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | only |
| └ | _msgSender | Internal 🔒 |   | |
| └ | withdraw | External ❗️ | 🛑  | notBlacklisted |
| └ | transfer | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | approve | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | transferFrom | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted notBlacklisted |
| └ | increaseAllowance | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | decreaseAllowance | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | permit | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | transferWithAuthorization | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | approveWithAuthorization | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | increaseAllowanceWithAuthorization | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | decreaseAllowanceWithAuthorization | External ❗️ | 🛑  | whenNotPaused notBlacklisted notBlacklisted |
| └ | withdrawWithAuthorization | External ❗️ | 🛑  | whenNotPaused notBlacklisted |
| └ | cancelAuthorization | External ❗️ | 🛑  | whenNotPaused |
||||||
| **AlluoLockedCleanup** | Implementation | Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable, IBalancerStructs |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | produced | Private 🔐 |   | |
| └ | update | Public ❗️ | 🛑  | whenNotPaused |
| └ | lock | Public ❗️ | 🛑  |NO❗️ |
| └ | lockWETH | Public ❗️ | 🛑  |NO❗️ |
| └ | migrationLock | External ❗️ | 🛑  | onlyRole |
| └ | unlock | Public ❗️ | 🛑  |NO❗️ |
| └ | unlockAll | Public ❗️ | 🛑  |NO❗️ |
| └ | withdraw | Public ❗️ | 🛑  | whenNotPaused |
| └ | claim | Public ❗️ | 🛑  |NO❗️ |
| └ | calcReward | Private 🔐 |   | |
| └ | getClaim | Public ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | unlockedBalanceOf | External ❗️ |   |NO❗️ |
| └ | convertAlluoToLp | External ❗️ |   |NO❗️ |
| └ | convertLpToAlluo | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | getInfoByAddress | External ❗️ |   |NO❗️ |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | addReward | External ❗️ | 🛑  |NO❗️ |
| └ | setReward | External ❗️ | 🛑  | onlyRole |
| └ | updateDepositLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | updateWithdrawLockDuration | External ❗️ | 🛑  | onlyRole |
| └ | withdrawTokens | External ❗️ | 🛑  | onlyRole |
| └ | _exitAlluoPoolExactLp | Private 🔐 | 🛑  | |
| └ | clean | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **BadPriceStrategy** | Implementation | IFeedStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | changeParams | External ❗️ | 🛑  |NO❗️ |
||||||
| **ForceSender** | Implementation |  |||
| └ | <Constructor> | Public ❗️ |  💵 |NO❗️ |
| └ | forceSend | External ❗️ | 🛑  |NO❗️ |
||||||
| **PseudoMultisigWallet** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | executeCall | External ❗️ | 🛑  |NO❗️ |
| └ | addOwners | External ❗️ | 🛑  |NO❗️ |
| └ | _checkCaller | Internal 🔒 |   | |
| └ | getOwners | External ❗️ |   |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
||||||
| **TestERC20** | Implementation | ERC20, ERC20Burnable, AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  | ERC20 |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | mint | Public ❗️ | 🛑  | onlyRole |
||||||
| **BtcNoPoolAdapterMainnet** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **EthNoPoolAdapterMainnet** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **EurCurveAdapterMainnet** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | adapterApproveAll | External ❗️ | 🛑  | onlyRole |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | changeLiquidTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | changePrimaryTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | setSlippage | External ❗️ | 🛑  | onlyRole |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **UsdCurveAdapterMainnet** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | adapterApproveAll | External ❗️ | 🛑  | onlyRole |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | changeLiquidTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | changePrimaryTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | setSlippage | External ❗️ | 🛑  | onlyRole |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **IbAlluoPriceResolver** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | emitter | External ❗️ | 🛑  |NO❗️ |
||||||
| **WithdrawalRequestResolver** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | checker | External ❗️ |   |NO❗️ |
| └ | withdrawFunds | External ❗️ | 🛑  | onlyRole |
| └ | receiveFunds | Public ❗️ |  💵 |NO❗️ |
||||||
| **BtcCurveAdapter** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | changeLiquidTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | changePrimaryTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | setSlippage | External ❗️ | 🛑  | onlyRole |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
||||||
| **BtcNoPoolAdapter** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
||||||
| **EthNoPoolAdapter** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
||||||
| **EurCurveAdapter** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | adapterApproveAll | External ❗️ | 🛑  | onlyRole |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | changeLiquidTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | changePrimaryTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | setSlippage | External ❗️ | 🛑  | onlyRole |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
||||||
| **UsdCurveAdapter** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | adapterApproveAll | External ❗️ | 🛑  | onlyRole |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | getCoreTokens | External ❗️ |   |NO❗️ |
| └ | changeLiquidTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | changePrimaryTokenIndex | External ❗️ | 🛑  | onlyRole |
| └ | setSlippage | External ❗️ | 🛑  | onlyRole |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
||||||
| **IbAlluoPriceResolver** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | emitter | External ❗️ | 🛑  |NO❗️ |
||||||
| **SuperfluidEndResolver** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | addToChecker | External ❗️ | 🛑  | onlyRole |
| └ | removeFromChecker | Public ❗️ | 🛑  | onlyRole |
| └ | checker | External ❗️ |   |NO❗️ |
| └ | _isStreamCloseToEndDate | Internal 🔒 |   | |
| └ | liquidateSender | External ❗️ | 🛑  | onlyRole |
||||||
| **SuperfluidResolver** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | addToChecker | External ❗️ | 🛑  | onlyRole |
| └ | removeFromChecker | Public ❗️ | 🛑  | onlyRole |
| └ | checker | External ❗️ |   |NO❗️ |
| └ | _isUserCloseToLiquidation | Internal 🔒 |   | |
| └ | _isUserCloseToLiquidationAfterWrapping | Internal 🔒 |   | |
| └ | liquidateSender | External ❗️ | 🛑  | onlyRole |
||||||
| **WithdrawalRequestResolver** | Implementation | AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | checker | External ❗️ |   |NO❗️ |
| └ | withdrawFunds | External ❗️ | 🛑  | onlyRole |
| └ | receiveFunds | Public ❗️ |  💵 |NO❗️ |
||||||
| **AlluoSuperfluidToken** | Implementation | ISuperfluidToken |||
| └ | getHost | External ❗️ |   |NO❗️ |
| └ | realtimeBalanceOf | Public ❗️ |   |NO❗️ |
| └ | realtimeBalanceOfNow | Public ❗️ |   |NO❗️ |
| └ | isAccountCritical | Public ❗️ |   |NO❗️ |
| └ | isAccountCriticalNow | External ❗️ |   |NO❗️ |
| └ | isAccountSolvent | Public ❗️ |   |NO❗️ |
| └ | isAccountSolventNow | External ❗️ |   |NO❗️ |
| └ | getAccountActiveAgreements | Public ❗️ |   |NO❗️ |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _move | Internal 🔒 | 🛑  | |
| └ | _getRewardAccount | Internal 🔒 |   | |
| └ | createAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | getAgreementData | External ❗️ |   |NO❗️ |
| └ | updateAgreementData | External ❗️ | 🛑  |NO❗️ |
| └ | terminateAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | updateAgreementStateSlot | Public ❗️ | 🛑  |NO❗️ |
| └ | getAgreementStateSlot | External ❗️ |   |NO❗️ |
| └ | settleBalance | External ❗️ | 🛑  | onlyAgreement |
| └ | makeLiquidationPayoutsV2 | External ❗️ | 🛑  | onlyAgreement |
||||||
| **FullUpgradableSuperTokenProxy** | Implementation | Proxy |||
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | _implementation | Internal 🔒 |   | |
||||||
| **SuperAppBase** | Implementation | ISuperApp |||
| └ | beforeAgreementCreated | External ❗️ |   |NO❗️ |
| └ | afterAgreementCreated | External ❗️ | 🛑  |NO❗️ |
| └ | beforeAgreementUpdated | External ❗️ |   |NO❗️ |
| └ | afterAgreementUpdated | External ❗️ | 🛑  |NO❗️ |
| └ | beforeAgreementTerminated | External ❗️ |   |NO❗️ |
| └ | afterAgreementTerminated | External ❗️ | 🛑  |NO❗️ |
||||||
| **Superfluid** | Implementation | UUPSProxiable, ISuperfluid, BaseRelayRecipient |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | initialize | External ❗️ | 🛑  | initializer |
| └ | proxiableUUID | Public ❗️ |   |NO❗️ |
| └ | updateCode | External ❗️ | 🛑  | onlyGovernance |
| └ | getNow | Public ❗️ |   |NO❗️ |
| └ | getGovernance | External ❗️ |   |NO❗️ |
| └ | replaceGovernance | External ❗️ | 🛑  | onlyGovernance |
| └ | registerAgreementClass | External ❗️ | 🛑  | onlyGovernance |
| └ | updateAgreementClass | External ❗️ | 🛑  | onlyGovernance |
| └ | isAgreementTypeListed | External ❗️ |   |NO❗️ |
| └ | isAgreementClassListed | Public ❗️ |   |NO❗️ |
| └ | getAgreementClass | External ❗️ |   |NO❗️ |
| └ | mapAgreementClasses | External ❗️ |   |NO❗️ |
| └ | addToAgreementClassesBitmap | External ❗️ |   |NO❗️ |
| └ | removeFromAgreementClassesBitmap | External ❗️ |   |NO❗️ |
| └ | getSuperTokenFactory | External ❗️ |   |NO❗️ |
| └ | getSuperTokenFactoryLogic | External ❗️ |   |NO❗️ |
| └ | updateSuperTokenFactory | External ❗️ | 🛑  | onlyGovernance |
| └ | updateSuperTokenLogic | External ❗️ | 🛑  | onlyGovernance |
| └ | registerApp | External ❗️ | 🛑  |NO❗️ |
| └ | registerAppWithKey | External ❗️ | 🛑  |NO❗️ |
| └ | registerAppByFactory | External ❗️ | 🛑  |NO❗️ |
| └ | _registerApp | Private 🔐 | 🛑  | |
| └ | isApp | Public ❗️ |   |NO❗️ |
| └ | getAppLevel | Public ❗️ |   |NO❗️ |
| └ | getAppManifest | External ❗️ |   |NO❗️ |
| └ | isAppJailed | Public ❗️ |   |NO❗️ |
| └ | allowCompositeApp | External ❗️ | 🛑  |NO❗️ |
| └ | isCompositeAppAllowed | External ❗️ |   |NO❗️ |
| └ | callAppBeforeCallback | External ❗️ | 🛑  | onlyAgreement assertValidCtx |
| └ | callAppAfterCallback | External ❗️ | 🛑  | onlyAgreement assertValidCtx |
| └ | appCallbackPush | External ❗️ | 🛑  | onlyAgreement assertValidCtx |
| └ | appCallbackPop | External ❗️ | 🛑  | onlyAgreement |
| └ | ctxUseAllowance | External ❗️ | 🛑  | onlyAgreement assertValidCtx |
| └ | jailApp | External ❗️ | 🛑  | onlyAgreement assertValidCtx |
| └ | _callAgreement | Internal 🔒 | 🛑  | cleanCtx isAgreement |
| └ | callAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | _callAppAction | Internal 🔒 | 🛑  | cleanCtx isAppActive isValidAppAction |
| └ | callAppAction | External ❗️ | 🛑  |NO❗️ |
| └ | callAgreementWithContext | External ❗️ | 🛑  | requireValidCtx isAgreement |
| └ | callAppActionWithContext | External ❗️ | 🛑  | requireValidCtx isAppActive isValidAppAction |
| └ | decodeCtx | Public ❗️ |   |NO❗️ |
| └ | isCtxValid | External ❗️ |   |NO❗️ |
| └ | _batchCall | Internal 🔒 | 🛑  | |
| └ | batchCall | External ❗️ | 🛑  |NO❗️ |
| └ | forwardBatchCall | External ❗️ | 🛑  |NO❗️ |
| └ | isTrustedForwarder | Public ❗️ |   |NO❗️ |
| └ | versionRecipient | External ❗️ |   |NO❗️ |
| └ | _jailApp | Internal 🔒 | 🛑  | |
| └ | _updateContext | Private 🔐 | 🛑  | |
| └ | _decodeCtx | Private 🔐 |   | |
| └ | _isCtxValid | Private 🔐 |   | |
| └ | _callExternalWithReplacedCtx | Private 🔐 | 🛑  | |
| └ | _callCallback | Private 🔐 | 🛑  | |
| └ | _replacePlaceholderCtx | Internal 🔒 |   | |
||||||
| **SuperfluidToken** | Implementation | ISuperfluidToken |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getHost | External ❗️ |   |NO❗️ |
| └ | realtimeBalanceOf | Public ❗️ |   |NO❗️ |
| └ | realtimeBalanceOfNow | Public ❗️ |   |NO❗️ |
| └ | isAccountCritical | Public ❗️ |   |NO❗️ |
| └ | isAccountCriticalNow | External ❗️ |   |NO❗️ |
| └ | isAccountSolvent | Public ❗️ |   |NO❗️ |
| └ | isAccountSolventNow | External ❗️ |   |NO❗️ |
| └ | getAccountActiveAgreements | Public ❗️ |   |NO❗️ |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _move | Internal 🔒 | 🛑  | |
| └ | _getRewardAccount | Internal 🔒 |   | |
| └ | createAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | getAgreementData | External ❗️ |   |NO❗️ |
| └ | updateAgreementData | External ❗️ | 🛑  |NO❗️ |
| └ | terminateAgreement | External ❗️ | 🛑  |NO❗️ |
| └ | updateAgreementStateSlot | External ❗️ | 🛑  |NO❗️ |
| └ | getAgreementStateSlot | External ❗️ |   |NO❗️ |
| └ | settleBalance | External ❗️ | 🛑  | onlyAgreement |
| └ | makeLiquidationPayoutsV2 | External ❗️ | 🛑  | onlyAgreement |
||||||
| **SuperToken** | Implementation | UUPSProxiable, SuperfluidToken, ISuperToken |||
| └ | <Constructor> | Public ❗️ | 🛑  | SuperfluidToken |
| └ | initialize | External ❗️ | 🛑  | initializer |
| └ | proxiableUUID | Public ❗️ |   |NO❗️ |
| └ | updateCode | External ❗️ | 🛑  |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | _transferFrom | Internal 🔒 | 🛑  | |
| └ | _send | Private 🔐 | 🛑  | |
| └ | _move | Private 🔐 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _callTokensToSend | Private 🔐 | 🛑  | |
| └ | _callTokensReceived | Private 🔐 | 🛑  | |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | allowance | Public ❗️ |   |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | granularity | External ❗️ |   |NO❗️ |
| └ | send | External ❗️ | 🛑  |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | isOperatorFor | External ❗️ |   |NO❗️ |
| └ | authorizeOperator | External ❗️ | 🛑  |NO❗️ |
| └ | revokeOperator | External ❗️ | 🛑  |NO❗️ |
| └ | defaultOperators | External ❗️ |   |NO❗️ |
| └ | operatorSend | External ❗️ | 🛑  |NO❗️ |
| └ | operatorBurn | External ❗️ | 🛑  |NO❗️ |
| └ | _setupDefaultOperators | Internal 🔒 | 🛑  | |
| └ | selfMint | External ❗️ | 🛑  | onlySelf |
| └ | selfBurn | External ❗️ | 🛑  | onlySelf |
| └ | selfApproveFor | External ❗️ | 🛑  | onlySelf |
| └ | selfTransferFrom | External ❗️ | 🛑  | onlySelf |
| └ | transferAll | External ❗️ | 🛑  |NO❗️ |
| └ | getUnderlyingToken | External ❗️ |   |NO❗️ |
| └ | upgrade | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | downgrade | External ❗️ | 🛑  |NO❗️ |
| └ | _upgrade | Private 🔐 | 🛑  | |
| └ | _downgrade | Private 🔐 | 🛑  | |
| └ | _toUnderlyingAmount | Private 🔐 |   | |
| └ | operationApprove | External ❗️ | 🛑  | onlyHost |
| └ | operationTransferFrom | External ❗️ | 🛑  | onlyHost |
| └ | operationUpgrade | External ❗️ | 🛑  | onlyHost |
| └ | operationDowngrade | External ❗️ | 🛑  | onlyHost |
||||||
| **SuperTokenFactoryBase** | Implementation | UUPSProxiable, ISuperTokenFactory |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getHost | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  | initializer |
| └ | proxiableUUID | Public ❗️ |   |NO❗️ |
| └ | updateCode | External ❗️ | 🛑  |NO❗️ |
| └ | _updateSuperTokenLogic | Private 🔐 | 🛑  | |
| └ | getSuperTokenLogic | External ❗️ |   |NO❗️ |
| └ | createSuperTokenLogic | External ❗️ | 🛑  |NO❗️ |
| └ | createERC20Wrapper | Public ❗️ | 🛑  |NO❗️ |
| └ | createERC20Wrapper | External ❗️ | 🛑  |NO❗️ |
| └ | initializeCustomSuperToken | External ❗️ | 🛑  |NO❗️ |
||||||
| **SuperTokenFactoryHelper** | Implementation |  |||
| └ | create | External ❗️ | 🛑  |NO❗️ |
||||||
| **SuperTokenFactory** | Implementation | SuperTokenFactoryBase |||
| └ | <Constructor> | Public ❗️ | 🛑  | SuperTokenFactoryBase |
| └ | createSuperTokenLogic | External ❗️ | 🛑  |NO❗️ |
||||||
| **ChainlinkFeedStrategy** | Implementation | IFeedStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
||||||
| **ICurvePool** | Interface |  |||
| └ | get_dy | External ❗️ |   |NO❗️ |
||||||
| **CurvePoolReferenceFeedStrategy** | Implementation | IFeedStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
||||||
| **ChainlinkFeedStrategyV2** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable, IFeedStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **CurveLpReferenceFeedStrategyV2** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable, IFeedStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **ICurvePool** | Interface |  |||
| └ | get_dy | External ❗️ |   |NO❗️ |
||||||
| **CurvePoolReferenceFeedStrategyV2** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable, IFeedStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **ICurveCVXETH** | Interface |  |||
| └ | token | External ❗️ |   |NO❗️ |
| └ | coins | External ❗️ |   |NO❗️ |
| └ | A | External ❗️ |   |NO❗️ |
| └ | gamma | External ❗️ |   |NO❗️ |
| └ | fee | External ❗️ |   |NO❗️ |
| └ | get_virtual_price | External ❗️ |   |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | exchange_underlying | External ❗️ | 🛑  |NO❗️ |
| └ | get_dy | External ❗️ |   |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | calc_token_amount | External ❗️ |   |NO❗️ |
| └ | calc_withdraw_one_coin | External ❗️ |   |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | claim_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | ramp_A_gamma | External ❗️ | 🛑  |NO❗️ |
| └ | stop_ramp_A_gamma | External ❗️ | 🛑  |NO❗️ |
| └ | commit_new_parameters | External ❗️ | 🛑  |NO❗️ |
| └ | apply_new_parameters | External ❗️ | 🛑  |NO❗️ |
| └ | revert_new_parameters | External ❗️ | 🛑  |NO❗️ |
| └ | commit_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | apply_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | revert_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | kill_me | External ❗️ | 🛑  |NO❗️ |
| └ | unkill_me | External ❗️ | 🛑  |NO❗️ |
| └ | set_admin_fee_receiver | External ❗️ | 🛑  |NO❗️ |
| └ | lp_price | External ❗️ |   |NO❗️ |
| └ | price_scale | External ❗️ |   |NO❗️ |
| └ | price_oracle | External ❗️ |   |NO❗️ |
| └ | last_prices | External ❗️ |   |NO❗️ |
| └ | last_prices_timestamp | External ❗️ |   |NO❗️ |
| └ | initial_A_gamma | External ❗️ |   |NO❗️ |
| └ | future_A_gamma | External ❗️ |   |NO❗️ |
| └ | initial_A_gamma_time | External ❗️ |   |NO❗️ |
| └ | future_A_gamma_time | External ❗️ |   |NO❗️ |
| └ | allowed_extra_profit | External ❗️ |   |NO❗️ |
| └ | future_allowed_extra_profit | External ❗️ |   |NO❗️ |
| └ | fee_gamma | External ❗️ |   |NO❗️ |
| └ | future_fee_gamma | External ❗️ |   |NO❗️ |
| └ | adjustment_step | External ❗️ |   |NO❗️ |
| └ | future_adjustment_step | External ❗️ |   |NO❗️ |
| └ | ma_half_time | External ❗️ |   |NO❗️ |
| └ | future_ma_half_time | External ❗️ |   |NO❗️ |
| └ | mid_fee | External ❗️ |   |NO❗️ |
| └ | out_fee | External ❗️ |   |NO❗️ |
| └ | admin_fee | External ❗️ |   |NO❗️ |
| └ | future_mid_fee | External ❗️ |   |NO❗️ |
| └ | future_out_fee | External ❗️ |   |NO❗️ |
| └ | future_admin_fee | External ❗️ |   |NO❗️ |
| └ | balances | External ❗️ |   |NO❗️ |
| └ | D | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | future_owner | External ❗️ |   |NO❗️ |
| └ | xcp_profit | External ❗️ |   |NO❗️ |
| └ | xcp_profit_a | External ❗️ |   |NO❗️ |
| └ | virtual_price | External ❗️ |   |NO❗️ |
| └ | is_killed | External ❗️ |   |NO❗️ |
| └ | kill_deadline | External ❗️ |   |NO❗️ |
| └ | transfer_ownership_deadline | External ❗️ |   |NO❗️ |
| └ | admin_actions_deadline | External ❗️ |   |NO❗️ |
| └ | admin_fee_receiver | External ❗️ |   |NO❗️ |
||||||
| **ICurvePoolEUR** | Interface |  |||
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | balances | External ❗️ |   |NO❗️ |
| └ | get_balances | External ❗️ |   |NO❗️ |
| └ | admin_fee | External ❗️ |   |NO❗️ |
| └ | A | External ❗️ |   |NO❗️ |
| └ | A_precise | External ❗️ |   |NO❗️ |
| └ | get_virtual_price | External ❗️ |   |NO❗️ |
| └ | calc_token_amount | External ❗️ |   |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | get_dy | External ❗️ |   |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | calc_withdraw_one_coin | External ❗️ |   |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | stop_ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | coins | External ❗️ |   |NO❗️ |
| └ | admin_balances | External ❗️ |   |NO❗️ |
| └ | fee | External ❗️ |   |NO❗️ |
| └ | initial_A | External ❗️ |   |NO❗️ |
| └ | future_A | External ❗️ |   |NO❗️ |
| └ | initial_A_time | External ❗️ |   |NO❗️ |
| └ | future_A_time | External ❗️ |   |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
||||||
| **ICurvePoolUSD** | Interface |  |||
| └ | A | External ❗️ |   |NO❗️ |
| └ | get_virtual_price | External ❗️ |   |NO❗️ |
| └ | calc_token_amount | External ❗️ |   |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | get_dy | External ❗️ |   |NO❗️ |
| └ | get_dy_underlying | External ❗️ |   |NO❗️ |
| └ | exchange | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_imbalance | External ❗️ | 🛑  |NO❗️ |
| └ | calc_withdraw_one_coin | External ❗️ |   |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
| └ | ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | stop_ramp_A | External ❗️ | 🛑  |NO❗️ |
| └ | commit_new_fee | External ❗️ | 🛑  |NO❗️ |
| └ | apply_new_fee | External ❗️ | 🛑  |NO❗️ |
| └ | revert_new_parameters | External ❗️ | 🛑  |NO❗️ |
| └ | commit_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | apply_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | revert_transfer_ownership | External ❗️ | 🛑  |NO❗️ |
| └ | admin_balances | External ❗️ |   |NO❗️ |
| └ | withdraw_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | donate_admin_fees | External ❗️ | 🛑  |NO❗️ |
| └ | kill_me | External ❗️ | 🛑  |NO❗️ |
| └ | unkill_me | External ❗️ | 🛑  |NO❗️ |
| └ | coins | External ❗️ |   |NO❗️ |
| └ | balances | External ❗️ |   |NO❗️ |
| └ | fee | External ❗️ |   |NO❗️ |
| └ | admin_fee | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | initial_A | External ❗️ |   |NO❗️ |
| └ | future_A | External ❗️ |   |NO❗️ |
| └ | initial_A_time | External ❗️ |   |NO❗️ |
| └ | future_A_time | External ❗️ |   |NO❗️ |
| └ | admin_actions_deadline | External ❗️ |   |NO❗️ |
| └ | transfer_ownership_deadline | External ❗️ |   |NO❗️ |
| └ | future_fee | External ❗️ |   |NO❗️ |
| └ | future_admin_fee | External ❗️ |   |NO❗️ |
| └ | future_owner | External ❗️ |   |NO❗️ |
||||||
| **ICvxBaseRewardPool** | Interface |  |||
| └ | addExtraReward | External ❗️ | 🛑  |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | clearExtraRewards | External ❗️ | 🛑  |NO❗️ |
| └ | currentRewards | External ❗️ |   |NO❗️ |
| └ | donate | External ❗️ | 🛑  |NO❗️ |
| └ | duration | External ❗️ |   |NO❗️ |
| └ | earned | External ❗️ |   |NO❗️ |
| └ | extraRewards | External ❗️ |   |NO❗️ |
| └ | extraRewardsLength | External ❗️ |   |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | historicalRewards | External ❗️ |   |NO❗️ |
| └ | lastTimeRewardApplicable | External ❗️ |   |NO❗️ |
| └ | lastUpdateTime | External ❗️ |   |NO❗️ |
| └ | newRewardRatio | External ❗️ |   |NO❗️ |
| └ | operator | External ❗️ |   |NO❗️ |
| └ | periodFinish | External ❗️ |   |NO❗️ |
| └ | pid | External ❗️ |   |NO❗️ |
| └ | queueNewRewards | External ❗️ | 🛑  |NO❗️ |
| └ | queuedRewards | External ❗️ |   |NO❗️ |
| └ | rewardManager | External ❗️ |   |NO❗️ |
| └ | rewardPerToken | External ❗️ |   |NO❗️ |
| └ | rewardPerTokenStored | External ❗️ |   |NO❗️ |
| └ | rewardRate | External ❗️ |   |NO❗️ |
| └ | rewardToken | External ❗️ |   |NO❗️ |
| └ | rewards | External ❗️ |   |NO❗️ |
| └ | stake | External ❗️ | 🛑  |NO❗️ |
| └ | stakeAll | External ❗️ | 🛑  |NO❗️ |
| └ | stakeFor | External ❗️ | 🛑  |NO❗️ |
| └ | stakingToken | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | userRewardPerTokenPaid | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAllAndUnwrap | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAndUnwrap | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICvxBooster** | Interface |  |||
| └ | FEE_DENOMINATOR | External ❗️ |   |NO❗️ |
| └ | MaxFees | External ❗️ |   |NO❗️ |
| └ | addPool | External ❗️ | 🛑  |NO❗️ |
| └ | claimRewards | External ❗️ | 🛑  |NO❗️ |
| └ | crv | External ❗️ |   |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | depositAll | External ❗️ | 🛑  |NO❗️ |
| └ | distributionAddressId | External ❗️ |   |NO❗️ |
| └ | earmarkFees | External ❗️ | 🛑  |NO❗️ |
| └ | earmarkIncentive | External ❗️ |   |NO❗️ |
| └ | earmarkRewards | External ❗️ | 🛑  |NO❗️ |
| └ | feeDistro | External ❗️ |   |NO❗️ |
| └ | feeManager | External ❗️ |   |NO❗️ |
| └ | feeToken | External ❗️ |   |NO❗️ |
| └ | gaugeMap | External ❗️ |   |NO❗️ |
| └ | isShutdown | External ❗️ |   |NO❗️ |
| └ | lockFees | External ❗️ |   |NO❗️ |
| └ | lockIncentive | External ❗️ |   |NO❗️ |
| └ | lockRewards | External ❗️ |   |NO❗️ |
| └ | minter | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | platformFee | External ❗️ |   |NO❗️ |
| └ | poolInfo | External ❗️ |   |NO❗️ |
| └ | poolLength | External ❗️ |   |NO❗️ |
| └ | poolManager | External ❗️ |   |NO❗️ |
| └ | registry | External ❗️ |   |NO❗️ |
| └ | rewardArbitrator | External ❗️ |   |NO❗️ |
| └ | rewardClaimed | External ❗️ | 🛑  |NO❗️ |
| └ | rewardFactory | External ❗️ |   |NO❗️ |
| └ | setArbitrator | External ❗️ | 🛑  |NO❗️ |
| └ | setFactories | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeInfo | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeManager | External ❗️ | 🛑  |NO❗️ |
| └ | setFees | External ❗️ | 🛑  |NO❗️ |
| └ | setGaugeRedirect | External ❗️ | 🛑  |NO❗️ |
| └ | setOwner | External ❗️ | 🛑  |NO❗️ |
| └ | setPoolManager | External ❗️ | 🛑  |NO❗️ |
| └ | setRewardContracts | External ❗️ | 🛑  |NO❗️ |
| └ | setTreasury | External ❗️ | 🛑  |NO❗️ |
| └ | setVoteDelegate | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownPool | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownSystem | External ❗️ | 🛑  |NO❗️ |
| └ | staker | External ❗️ |   |NO❗️ |
| └ | stakerIncentive | External ❗️ |   |NO❗️ |
| └ | stakerRewards | External ❗️ |   |NO❗️ |
| └ | stashFactory | External ❗️ |   |NO❗️ |
| └ | tokenFactory | External ❗️ |   |NO❗️ |
| └ | treasury | External ❗️ |   |NO❗️ |
| └ | vote | External ❗️ | 🛑  |NO❗️ |
| └ | voteDelegate | External ❗️ |   |NO❗️ |
| └ | voteGaugeWeight | External ❗️ | 🛑  |NO❗️ |
| └ | voteOwnership | External ❗️ |   |NO❗️ |
| └ | voteParameter | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICvxBaseRewardPool** | Interface |  |||
| └ | addExtraReward | External ❗️ | 🛑  |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | clearExtraRewards | External ❗️ | 🛑  |NO❗️ |
| └ | currentRewards | External ❗️ |   |NO❗️ |
| └ | donate | External ❗️ | 🛑  |NO❗️ |
| └ | duration | External ❗️ |   |NO❗️ |
| └ | earned | External ❗️ |   |NO❗️ |
| └ | extraRewards | External ❗️ |   |NO❗️ |
| └ | extraRewardsLength | External ❗️ |   |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | historicalRewards | External ❗️ |   |NO❗️ |
| └ | lastTimeRewardApplicable | External ❗️ |   |NO❗️ |
| └ | lastUpdateTime | External ❗️ |   |NO❗️ |
| └ | newRewardRatio | External ❗️ |   |NO❗️ |
| └ | operator | External ❗️ |   |NO❗️ |
| └ | periodFinish | External ❗️ |   |NO❗️ |
| └ | pid | External ❗️ |   |NO❗️ |
| └ | queueNewRewards | External ❗️ | 🛑  |NO❗️ |
| └ | queuedRewards | External ❗️ |   |NO❗️ |
| └ | rewardManager | External ❗️ |   |NO❗️ |
| └ | rewardPerToken | External ❗️ |   |NO❗️ |
| └ | rewardPerTokenStored | External ❗️ |   |NO❗️ |
| └ | rewardRate | External ❗️ |   |NO❗️ |
| └ | rewardToken | External ❗️ |   |NO❗️ |
| └ | rewards | External ❗️ |   |NO❗️ |
| └ | stake | External ❗️ | 🛑  |NO❗️ |
| └ | stakeAll | External ❗️ | 🛑  |NO❗️ |
| └ | stakeFor | External ❗️ | 🛑  |NO❗️ |
| └ | stakingToken | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | userRewardPerTokenPaid | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAllAndUnwrap | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAndUnwrap | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICvxBooster** | Interface |  |||
| └ | FEE_DENOMINATOR | External ❗️ |   |NO❗️ |
| └ | MaxFees | External ❗️ |   |NO❗️ |
| └ | addPool | External ❗️ | 🛑  |NO❗️ |
| └ | claimRewards | External ❗️ | 🛑  |NO❗️ |
| └ | crv | External ❗️ |   |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | depositAll | External ❗️ | 🛑  |NO❗️ |
| └ | distributionAddressId | External ❗️ |   |NO❗️ |
| └ | earmarkFees | External ❗️ | 🛑  |NO❗️ |
| └ | earmarkIncentive | External ❗️ |   |NO❗️ |
| └ | earmarkRewards | External ❗️ | 🛑  |NO❗️ |
| └ | feeDistro | External ❗️ |   |NO❗️ |
| └ | feeManager | External ❗️ |   |NO❗️ |
| └ | feeToken | External ❗️ |   |NO❗️ |
| └ | gaugeMap | External ❗️ |   |NO❗️ |
| └ | isShutdown | External ❗️ |   |NO❗️ |
| └ | lockFees | External ❗️ |   |NO❗️ |
| └ | lockIncentive | External ❗️ |   |NO❗️ |
| └ | lockRewards | External ❗️ |   |NO❗️ |
| └ | minter | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | platformFee | External ❗️ |   |NO❗️ |
| └ | poolInfo | External ❗️ |   |NO❗️ |
| └ | poolLength | External ❗️ |   |NO❗️ |
| └ | poolManager | External ❗️ |   |NO❗️ |
| └ | registry | External ❗️ |   |NO❗️ |
| └ | rewardArbitrator | External ❗️ |   |NO❗️ |
| └ | rewardClaimed | External ❗️ | 🛑  |NO❗️ |
| └ | rewardFactory | External ❗️ |   |NO❗️ |
| └ | setArbitrator | External ❗️ | 🛑  |NO❗️ |
| └ | setFactories | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeInfo | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeManager | External ❗️ | 🛑  |NO❗️ |
| └ | setFees | External ❗️ | 🛑  |NO❗️ |
| └ | setGaugeRedirect | External ❗️ | 🛑  |NO❗️ |
| └ | setOwner | External ❗️ | 🛑  |NO❗️ |
| └ | setPoolManager | External ❗️ | 🛑  |NO❗️ |
| └ | setRewardContracts | External ❗️ | 🛑  |NO❗️ |
| └ | setTreasury | External ❗️ | 🛑  |NO❗️ |
| └ | setVoteDelegate | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownPool | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownSystem | External ❗️ | 🛑  |NO❗️ |
| └ | staker | External ❗️ |   |NO❗️ |
| └ | stakerIncentive | External ❗️ |   |NO❗️ |
| └ | stakerRewards | External ❗️ |   |NO❗️ |
| └ | stashFactory | External ❗️ |   |NO❗️ |
| └ | tokenFactory | External ❗️ |   |NO❗️ |
| └ | treasury | External ❗️ |   |NO❗️ |
| └ | vote | External ❗️ | 🛑  |NO❗️ |
| └ | voteDelegate | External ❗️ |   |NO❗️ |
| └ | voteGaugeWeight | External ❗️ | 🛑  |NO❗️ |
| └ | voteOwnership | External ❗️ |   |NO❗️ |
| └ | voteParameter | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | External ❗️ | 🛑  |NO❗️ |
||||||
| **EurCurveAdapterMumbai** | Implementation | Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | adapterApproveAll | External ❗️ | 🛑  | onlyRole |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **UsdCurveAdapterMumbai** | Implementation | Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | adapterApproveAll | External ❗️ | 🛑  | onlyRole |
| └ | deposit | External ❗️ | 🛑  | onlyRole |
| └ | withdraw | External ❗️ | 🛑  | onlyRole |
| └ | getAdapterAmount | External ❗️ |   |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | removeTokenByAddress | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **FakeCurveEur** | Implementation | Initializable, PausableUpgradeable, AlluoERC20Upgradable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | changeFee | External ❗️ | 🛑  | onlyRole |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **FakeCurveUsd** | Implementation | Initializable, PausableUpgradeable, AlluoERC20Upgradable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | setWallet | External ❗️ | 🛑  | onlyRole |
| └ | changeFee | External ❗️ | 🛑  | onlyRole |
| └ | pause | External ❗️ | 🛑  | onlyRole |
| └ | unpause | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **CurveConvexStrategyCopy** | Implementation | CurveConvexStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  | CurveConvexStrategy |
||||||
| **ExchangeCopy** | Implementation | Exchange |||
| └ | <Constructor> | Public ❗️ | 🛑  | Exchange |
||||||
| **BaseRelayRecipient** | Implementation | IRelayRecipient |||
| └ | isTrustedForwarder | Public ❗️ |   |NO❗️ |
| └ | _getTransactionSigner | Internal 🔒 |   | |
||||||
| **CallUtils** | Library |  |||
| └ | revertFromReturnedData | Internal 🔒 |   | |
| └ | parseSelector | Internal 🔒 |   | |
| └ | padLength32 | Internal 🔒 |   | |
| └ | isValidAbiEncodedBytes | Internal 🔒 |   | |
||||||
| **CFAv1Library** | Library |  |||
| └ | createFlow | Internal 🔒 | 🛑  | |
| └ | createFlow | Internal 🔒 | 🛑  | |
| └ | updateFlow | Internal 🔒 | 🛑  | |
| └ | updateFlow | Internal 🔒 | 🛑  | |
| └ | deleteFlow | Internal 🔒 | 🛑  | |
| └ | deleteFlow | Internal 🔒 | 🛑  | |
| └ | createFlowWithCtx | Internal 🔒 | 🛑  | |
| └ | createFlowWithCtx | Internal 🔒 | 🛑  | |
| └ | updateFlowWithCtx | Internal 🔒 | 🛑  | |
| └ | updateFlowWithCtx | Internal 🔒 | 🛑  | |
| └ | deleteFlowWithCtx | Internal 🔒 | 🛑  | |
| └ | deleteFlowWithCtx | Internal 🔒 | 🛑  | |
| └ | createFlowByOperator | Internal 🔒 | 🛑  | |
| └ | createFlowByOperator | Internal 🔒 | 🛑  | |
| └ | createFlowByOperatorWithCtx | Internal 🔒 | 🛑  | |
| └ | createFlowByOperatorWithCtx | Internal 🔒 | 🛑  | |
| └ | updateFlowByOperator | Internal 🔒 | 🛑  | |
| └ | updateFlowByOperator | Internal 🔒 | 🛑  | |
| └ | updateFlowByOperatorWithCtx | Internal 🔒 | 🛑  | |
| └ | updateFlowByOperatorWithCtx | Internal 🔒 | 🛑  | |
| └ | deleteFlowByOperator | Internal 🔒 | 🛑  | |
| └ | deleteFlowByOperator | Internal 🔒 | 🛑  | |
| └ | deleteFlowByOperatorWithCtx | Internal 🔒 | 🛑  | |
| └ | deleteFlowByOperatorWithCtx | Internal 🔒 | 🛑  | |
| └ | updateFlowOperatorPermissions | Internal 🔒 | 🛑  | |
| └ | updateFlowOperatorPermissionsWithCtx | Internal 🔒 | 🛑  | |
| └ | authorizeFlowOperatorWithFullControl | Internal 🔒 | 🛑  | |
| └ | authorizeFlowOperatorWithFullControlWithCtx | Internal 🔒 | 🛑  | |
| └ | revokeFlowOperatorWithFullControl | Internal 🔒 | 🛑  | |
| └ | revokeFlowOperatorWithFullControlWithCtx | Internal 🔒 | 🛑  | |
||||||
| **ERC1820RegistryCompiled** | Library |  |||
||||||
| **ERC777Helper** | Library |  |||
| └ | register | Internal 🔒 | 🛑  | |
| └ | isOperatorFor | Internal 🔒 |   | |
| └ | authorizeOperator | Internal 🔒 | 🛑  | |
| └ | revokeOperator | Internal 🔒 | 🛑  | |
| └ | defaultOperators | Internal 🔒 |   | |
| └ | setupDefaultOperators | Internal 🔒 | 🛑  | |
||||||
| **EventsEmitter** | Library |  |||
| └ | emitTransfer | Internal 🔒 | 🛑  | |
||||||
| **FixedSizeData** | Library |  |||
| └ | storeData | Internal 🔒 | 🛑  | |
| └ | hasData | Internal 🔒 |   | |
| └ | loadData | Internal 🔒 |   | |
| └ | eraseData | Internal 🔒 | 🛑  | |
||||||
| **SlotsBitmapLibrary** | Library |  |||
| └ | findEmptySlotAndFill | Public ❗️ | 🛑  |NO❗️ |
| └ | clearSlot | Public ❗️ | 🛑  |NO❗️ |
| └ | listData | Public ❗️ |   |NO❗️ |
||||||
| **UUPSProxiable** | Implementation | Initializable |||
| └ | getCodeAddress | Public ❗️ |   |NO❗️ |
| └ | updateCode | External ❗️ | 🛑  |NO❗️ |
| └ | proxiableUUID | Public ❗️ |   |NO❗️ |
| └ | _updateCodeAddress | Internal 🔒 | 🛑  | |
||||||
| **UUPSProxy** | Implementation | Proxy |||
| └ | initializeProxy | External ❗️ | 🛑  |NO❗️ |
| └ | _implementation | Internal 🔒 |   | |
||||||
| **UUPSUtils** | Library |  |||
| └ | implementation | Internal 🔒 |   | |
| └ | setImplementation | Internal 🔒 | 🛑  | |


 Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
 

</div>
____
<sub>
Thinking about smart contract security? We can provide training, ongoing advice, and smart contract auditing. [Contact us](https://diligence.consensys.net/contact/).
</sub>


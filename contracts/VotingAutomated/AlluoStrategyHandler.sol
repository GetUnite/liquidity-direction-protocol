// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import {DecimalConverter} from "../libs/DecimalConverter.sol";
import {AlluoBridging} from "../crosschain/AlluoBridging.sol";
import {AlluoUpgradeableBase} from "../AlluoUpgradeableBase.sol";
import {IAlluoStrategyV2} from "../interfaces/IAlluoStrategyV2.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IAlluoVoteExecutorUtils} from "../interfaces/IAlluoVoteExecutorUtils.sol";

// solhint-disable-next-line
import "hardhat/console.sol";

contract AlluoStrategyHandler is AlluoUpgradeableBase, AlluoBridging {
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    mapping(string => uint256) public directionNameToId;
    mapping(uint256 => LiquidityDirection) public liquidityDirection;
    mapping(uint256 => AssetInfo) private assetIdToAssetInfo;
    mapping(uint256 => DepositQueue) public assetIdToDepositQueue;
    mapping(address => uint8) public tokenToAssetId;
    uint8 public numberOfAssets;
    uint256 public lastDirectionId;
    uint256 public slippageTolerance;
    address public exchange;
    address public voteExecutorUtils;
    struct LiquidityDirection {
        address strategyAddress;
        address entryToken;
        uint256 assetId;
        uint256 chainId;
        bytes entryData;
        bytes exitData;
        bytes rewardsData;
        uint256 latestAmount;
    }

    struct AssetInfo {
        mapping(uint256 => address) chainIdToPrimaryToken;
        address ibAlluo;
        EnumerableSetUpgradeable.UintSet activeDirections;
        EnumerableSetUpgradeable.AddressSet needToTransferFrom;
        uint256 amountDeployed;
    }

    struct DepositQueue {
        uint256 totalDepositAmount;
        Deposit[] deposits;
    }

    struct Deposit {
        uint256 amount;
        uint256 directionId;
    }

    function initialize(
        address _multiSigWallet,
        address _spokePool,
        address _recipient,
        uint256 _recipientChainId,
        uint64 _relayerFeePct,
        uint256 _slippageTolerance,
        address _exchange,
        address _voteExecutorUtils
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _setAlluoBridging(
            _spokePool,
            _recipient,
            _recipientChainId,
            _relayerFeePct
        );
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        slippageTolerance = _slippageTolerance;
        exchange = _exchange;
        voteExecutorUtils = _voteExecutorUtils;
    }

    ///
    // Used to calculate TVL
    function markAssetToMarket(
        uint8 assetId
    ) public view returns (uint256 amount) {
        AssetInfo storage assetInfo = assetIdToAssetInfo[assetId];
        for (uint256 i; i < assetInfo.activeDirections.length(); i++) {
            uint256 directionId = assetInfo.activeDirections.at(i);
            LiquidityDirection memory _direction = liquidityDirection[
                directionId
            ];
            amount += IAlluoStrategyV2(_direction.strategyAddress)
                .getDeployedAmountAndRewards(_direction.rewardsData);
        }
    }

    function markDirectionToMarket(
        uint256 directionId
    ) public view returns (uint256 amount) {
        LiquidityDirection memory _direction = liquidityDirection[directionId];
        amount = IAlluoStrategyV2(_direction.strategyAddress)
            .getDeployedAmountAndRewards(_direction.rewardsData);
    }

    // Claim all rewards for the specific assetId and send it back to the executor (who will usually call this function)
    function _claimAllRewards(uint8 assetId) internal {
        AssetInfo storage assetInfo = assetIdToAssetInfo[assetId];
        address primaryToken = assetInfo.chainIdToPrimaryToken[block.chainid];

        for (uint256 i; i < assetInfo.activeDirections.length(); i++) {
            uint256 directionId = assetInfo.activeDirections.at(i);
            LiquidityDirection memory _direction = liquidityDirection[
                directionId
            ];
            IAlluoStrategyV2(_direction.strategyAddress).exitOnlyRewards(
                _direction.rewardsData,
                primaryToken,
                msg.sender, // send everything to the executor
                true // swap rewards to primary token by default
            );
        }
    }

    // before rebalancing, loop through and claim rewards from all active strategies for that asset ID
    function rebalanceUntilTarget(
        uint8 assetId,
        uint256 directionId,
        uint256 percentage,
        uint256 tvlForAsset
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // make sure to know where these funds are going / will be kept.
        // lets save latest percentages
        // entries, vote executor slave.
        _claimAllRewards(assetId);
        uint256 target = (percentage * tvlForAsset) / 10000;
        uint256 current = markDirectionToMarket(directionId);
        AssetInfo storage assetInfo = assetIdToAssetInfo[assetId];
        address primaryToken = assetInfo.chainIdToPrimaryToken[block.chainid];
        if (current > target) {
            uint256 unwindPercentage = ((current - target) * 10000) / current;
            _withdrawFromDirection(
                directionId,
                unwindPercentage,
                msg.sender,
                primaryToken
            );
        } else if (target > current) {
            _queueDeposit(assetId, directionId, target - current);
        }
    }

    function bridgeRemainingFunds(
        uint8 assetId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        AssetInfo storage assetInfo = assetIdToAssetInfo[assetId];
        DepositQueue storage _depositQueue = assetIdToDepositQueue[assetId];
        address primaryToken = assetInfo.chainIdToPrimaryToken[block.chainid];

        uint256 amount = IERC20MetadataUpgradeable(primaryToken).balanceOf(
            address(this)
        );
        if (amount > 0 && _depositQueue.totalDepositAmount == 0) {
            _bridge(amount, primaryToken);
        }
    }

    function _withdrawFromDirection(
        uint256 _directionId,
        uint256 _unwindPercentage,
        address _to,
        address _outputToken
    ) internal {
        LiquidityDirection memory _direction = liquidityDirection[_directionId];

        IAlluoStrategyV2(_direction.strategyAddress).exitAll(
            _direction.exitData,
            _unwindPercentage,
            _outputToken,
            _to,
            false,
            false
        );
    }

    function _queueDeposit(
        uint8 _assetId,
        uint256 _directionId,
        uint256 _amount
    ) internal {
        DepositQueue storage _depositQueue = assetIdToDepositQueue[_assetId];
        _depositQueue.totalDepositAmount += _amount;
        _depositQueue.deposits.push(
            Deposit({amount: _amount, directionId: _directionId})
        );
    }

    function executeQueuedDeposits(
        uint256 assetId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        DepositQueue storage _depositQueue = assetIdToDepositQueue[assetId];
        address primaryToken = getPrimaryTokenForAsset(assetId);
        uint256 totalDepositAmount = _depositQueue.totalDepositAmount;
        uint256 fundsReady = IERC20MetadataUpgradeable(primaryToken).balanceOf(
            msg.sender
        );
        require(
            IAlluoVoteExecutorUtils(voteExecutorUtils)
                .isWithinSlippageTolerance(
                    totalDepositAmount,
                    fundsReady,
                    slippageTolerance
                ),
            "Not enough funds"
        );
        // Assume here that any disparity between the deposit amount and funds ready is due to slippage and fees
        // need to scale deposit values here to account for slippage
        _scaleDepositQueue(_depositQueue, totalDepositAmount, fundsReady);
        for (uint256 i; i < _depositQueue.deposits.length; i++) {
            Deposit memory _deposit = _depositQueue.deposits[i];
            _depositToDirection(
                _deposit.directionId,
                _deposit.amount,
                primaryToken
            );
        }
    }

    function _scaleDepositQueue(
        DepositQueue storage _depositQueue,
        uint256 _totalDepositAmount,
        uint256 _fundsReady
    ) internal {
        uint256 _depositQueueLength = _depositQueue.deposits.length;
        _depositQueue.totalDepositAmount = 0;
        for (uint256 i; i < _depositQueueLength; i++) {
            Deposit storage _deposit = _depositQueue.deposits[i];
            _deposit.amount =
                (_deposit.amount * _fundsReady) /
                _totalDepositAmount;
            _depositQueue.totalDepositAmount += _deposit.amount;
        }
    }

    function _depositToDirection(
        uint256 _directionId,
        uint256 _amount,
        address _inputToken
    ) internal {
        LiquidityDirection memory _direction = liquidityDirection[_directionId];
        if (_direction.entryToken != _inputToken) {
            // We need to think about what we will do about slippage.
            _amount = IExchange(exchange).exchange(
                _inputToken,
                _direction.entryToken,
                _amount,
                0
            );
            _inputToken = _direction.entryToken;
        }
        IAlluoStrategyV2(_direction.strategyAddress).invest(
            _direction.entryData,
            _amount
        );
    }

    function getPrimaryTokenForAsset(
        uint256 assetId
    ) public view returns (address primaryToken) {
        primaryToken = assetIdToAssetInfo[assetId].chainIdToPrimaryToken[
            block.chainid
        ];
    }

    // Admin functions
    //
    //
    //
    function addToActiveDirections(
        uint256 _directionId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        assetIdToAssetInfo[liquidityDirection[_directionId].assetId]
            .activeDirections
            .add(_directionId);
    }

    function removeFromActiveDirections(
        uint256 _directionId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        assetIdToAssetInfo[liquidityDirection[_directionId].assetId]
            .activeDirections
            .remove(_directionId);
        liquidityDirection[_directionId].latestAmount = 0;
    }

    function setLiquidityDirection(
        string memory _codeName,
        uint256 _directionId,
        address _strategyAddress,
        address _entryToken,
        uint256 _assetId,
        uint256 _chainId,
        bytes memory _entryData,
        bytes memory _exitData,
        bytes memory _rewardsData
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        directionNameToId[_codeName] = _directionId;
        liquidityDirection[_directionId] = LiquidityDirection(
            _strategyAddress,
            _entryToken,
            _assetId,
            _chainId,
            _entryData,
            _exitData,
            _rewardsData,
            0
        );
    }

    function setLastDirectionId(
        uint256 _newNumber
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lastDirectionId = _newNumber;
    }

    function changeNumberOfAssets(
        uint8 _newNumber
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        numberOfAssets = _newNumber;
    }

    function changeAssetInfo(
        uint256 _assetId,
        uint256[] calldata _chainIds,
        address[] calldata _chainIdToPrimaryToken,
        address _ibAlluo
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_chainIds.length == _chainIdToPrimaryToken.length);
        assetIdToAssetInfo[_assetId].ibAlluo = _ibAlluo;
        for (uint256 i; i < _chainIds.length; i++) {
            assetIdToAssetInfo[_assetId].chainIdToPrimaryToken[
                _chainIds[i]
            ] = _chainIdToPrimaryToken[i];
        }
    }

    function getAssetAmount(uint _id) external view returns (uint256) {
        return (assetIdToAssetInfo[_id].amountDeployed);
    }

    function getDirectionFullInfoById(
        uint256 _id
    ) external view returns (address, LiquidityDirection memory) {
        require(_id != 0);
        LiquidityDirection memory direction = liquidityDirection[_id];
        address primaryToken = assetIdToAssetInfo[direction.assetId]
            .chainIdToPrimaryToken[direction.chainId];
        return (primaryToken, direction);
    }
}

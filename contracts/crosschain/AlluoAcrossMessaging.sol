// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {ISpokePoolNew} from "../interfaces/ISpokePoolNew.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "hardhat/console.sol";

interface AcrossMessageHandler {
    function handleAcrossMessage(
        address tokenSent,
        uint256 amount,
        bool fillCompleted,
        address relayer,
        bytes memory message
    ) external;
}

abstract contract AlluoAcrossMessaging is AcrossMessageHandler {
    ISpokePoolNew public spokePool;
    int64 public relayerFeePct;
    mapping(uint256 => uint256) public chainIdToFeeAmount;
    mapping(uint256 => address) public chainIdToBridgingFeeToken;

    function _setSpokePool(
        address payable _spokePoolAddress,
        int64 _relayerFeePct
    ) internal {
        spokePool = ISpokePoolNew(_spokePoolAddress);
        relayerFeePct = _relayerFeePct;
    }

    function _setFeeInformation(
        address _bridgingFeeToken,
        uint256 _chainId,
        uint256 _feeAmount
    ) internal {
        chainIdToFeeAmount[_chainId] = _feeAmount;
        chainIdToBridgingFeeToken[_chainId] = _bridgingFeeToken;
    }

    function _sendMessage(
        address to,
        address token,
        uint256 amount,
        uint256 recipientChainId,
        bytes memory data
    ) internal {
        IERC20Upgradeable(token).approve(address(spokePool), amount);
        spokePool.deposit(
            to,
            token,
            amount,
            recipientChainId,
            relayerFeePct,
            uint32(block.timestamp),
            data,
            type(uint256).max
        );
    }

    function handleAcrossMessage(
        address tokenSent,
        uint256 amount,
        bool fillCompleted,
        address relayer,
        bytes calldata message
    ) external virtual;

    function _acrossExecuteLogic(
        bytes calldata data
    ) internal virtual returns (bool success, bytes memory result) {}
}

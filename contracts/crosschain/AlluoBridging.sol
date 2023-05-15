// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ISpokePoolNew} from "../interfaces/ISpokePoolNew.sol";

abstract contract AlluoBridging {
    event Bridged(
        uint256 amount,
        address tokenAddress,
        address to,
        uint256 recipientChainId
    );
    struct AlluoBridgingInformation {
        address payable spokepool;
        address recipient;
        uint256 recipientChainId;
        int64 relayerFeePct;
    }
    AlluoBridgingInformation public alluoBridgingInformation;

    function _setAlluoBridging(
        address payable _spokePool,
        address _recipient,
        uint256 recipientChainId,
        int64 _relayerFeePct
    ) internal {
        alluoBridgingInformation = AlluoBridgingInformation(
            _spokePool,
            _recipient,
            recipientChainId,
            _relayerFeePct
        );
    }

    /**
     * @notice Function to bridge assets to the other chain
     * @dev Bridges assets using Across Bridge by UMA Protocol (Source: https://across.to/)
     * @param amount Amount of the funds to be transferred
     * @param originToken Address of the token to be bridged
     */
    function _bridge(uint256 amount, address originToken) internal {
        _beforeBridgingHook();
        IERC20Upgradeable(originToken).approve(
            alluoBridgingInformation.spokepool,
            amount
        );
        ISpokePoolNew(alluoBridgingInformation.spokepool).deposit(
            alluoBridgingInformation.recipient,
            originToken,
            amount,
            alluoBridgingInformation.recipientChainId,
            alluoBridgingInformation.relayerFeePct,
            uint32(block.timestamp),
            "0x",
            type(uint256).max
        );
        _afterBridgingHook();
    }

    function _bridgeTo(
        uint256 amount,
        address originToken,
        address to,
        uint256 recipientChainId
    ) internal {
        _beforeBridgingHook();
        IERC20Upgradeable(originToken).approve(
            alluoBridgingInformation.spokepool,
            amount
        );
        ISpokePoolNew(alluoBridgingInformation.spokepool).deposit(
            to,
            originToken,
            amount,
            recipientChainId,
            alluoBridgingInformation.relayerFeePct,
            uint32(block.timestamp),
            "",
            type(uint256).max
        );
        _afterBridgingHook();
    }

    function _beforeBridgingHook() internal virtual {}

    function _afterBridgingHook() internal virtual {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ISpokePool} from "../interfaces/ISpokePool.sol";

contract AlluoBridging {
    struct AlluoBridgingInformation {
        address spokepool;
        address recipient;
        uint256 recipientChainId;
        uint64 relayerFeePct;
    }
    AlluoBridgingInformation public alluoBridgingInformation;

    function _setAlluoBridging(
        address _spokePool,
        address _recipient,
        uint256 recipientChainId,
        uint64 _relayerFeePct
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
        ISpokePool(alluoBridgingInformation.spokepool).deposit(
            alluoBridgingInformation.recipient,
            originToken,
            amount,
            alluoBridgingInformation.recipientChainId,
            alluoBridgingInformation.relayerFeePct,
            uint32(block.timestamp)
        );
        _afterBridgingHook();
    }

    function _beforeBridgingHook() internal virtual {}

    function _afterBridgingHook() internal virtual {}
}

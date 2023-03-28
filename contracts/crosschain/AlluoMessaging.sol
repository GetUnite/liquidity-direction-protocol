// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {IAnyCallV7, IAnyCallV7Executor} from "../interfaces/IAnyCallV7.sol";

abstract contract AlluoMessaging {
    IAnyCallV7 public anyCallV7;
    IAnyCallV7Executor public anyCallV7Executor;

    function _setAnyCall(address _anyCallAddress) internal {
        anyCallV7 = IAnyCallV7(_anyCallAddress);
        anyCallV7Executor = IAnyCallV7Executor(anyCallV7.executor());
    }

    function _sendMessage(
        address _to,
        bytes calldata _data,
        uint256 _toChainID,
        uint256 _flags
    ) internal {
        anyCallV7.anyCall(_to, _data, _toChainID, _flags, "");
    }

    function anyExecute(
        bytes calldata data
    ) external returns (bool success, bytes memory result) {
        require(
            msg.sender == address(anyCallV7Executor),
            "Only AnyCallV7Executor can call this function"
        );
        return _anyExecuteLogic(data);
    }

    function _anyExecuteLogic(
        bytes calldata data
    ) internal virtual returns (bool success, bytes memory result) {}
}

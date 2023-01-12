// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract GnosisMock is AccessControl {
    using Address for address;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function execute(
        address to,
        uint256 value,
        bytes memory data
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        to.functionCallWithValue(data, value);
    }

    receive() external payable {}
}

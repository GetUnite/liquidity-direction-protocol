// AlluoUpgradeableBaseMock.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../AlluoUpgradeableBase.sol";

contract AlluoUpgradeableBaseMock is AlluoUpgradeableBase {
    function grantDefaultAdminRole(address account) public {
        _grantRole(DEFAULT_ADMIN_ROLE, account);
    }
}

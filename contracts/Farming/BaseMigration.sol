// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ... (previous imports)

import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {AlluoUpgradeableBase} from "../AlluoUpgradeableBase.sol";

contract BaseMigration is AlluoUpgradeableBase {
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    using ECDSAUpgradeable for bytes32;

    IERC20MetadataUpgradeable public token;
    address public admin;

    mapping(address => uint256) public balances;

    event Claimed(address indexed user, uint256 amount);

    function initialize(
        IERC20MetadataUpgradeable _token,
        address[] memory _addresses,
        uint256[] memory _balances,
        address _admin
    ) public initializer {
        require(_addresses.length == _balances.length, "Mismatched arrays");
        __AlluoUpgradeableBase_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        admin = _admin;

        token = _token;

        for (uint256 i = 0; i < _addresses.length; i++) {
            balances[_addresses[i]] = _balances[i];
        }
    }

    function claim() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No funds to claim");

        balances[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    function claimOnBehalf(address user, bytes memory signature) external {
        require(user != address(0), "Invalid user address");
        uint256 amount = balances[user];
        require(amount > 0, "No funds to claim for user");

        // Create a message hash of the user's address and the claim amount
        bytes32 messageHash = keccak256(abi.encode(user, amount));
        bool result = verify(messageHash, signature, user);
        require(result, "Invalid signature");

        balances[user] = 0;
        token.safeTransfer(user, amount);

        emit Claimed(user, amount);
    }

    function multisigRescue(
        address user
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = balances[user];
        require(amount > 0, "No funds to claim for user");

        balances[user] = 0;
        // Sending it back to the admin for rescue
        token.safeTransfer(admin, amount);

        emit Claimed(user, amount);
    }

    function verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) public pure returns (bool) {
        address signer = data.toEthSignedMessageHash().recover(signature);
        return signer == account;
    }
}

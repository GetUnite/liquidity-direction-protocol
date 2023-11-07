// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./../IFeedStrategy.sol";

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ExternalStablecoinReferenceFeedStrategyV2 is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IFeedStrategy
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
    }

    function getPrice() external view returns (int256 value, uint8 decimals) {
        return (10 ** 18, 18);
    }

    function getPriceOfAmount(
        uint256 amount
    ) external view returns (int256 value, uint8 decimals) {
        return (int256(amount), 18);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

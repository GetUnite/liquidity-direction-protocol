// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "./AlluoERC20Upgradable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../../interfaces/IIbAlluo.sol";

contract IbAlluoDebt is
    Initializable,
    PausableUpgradeable,
    AlluoERC20Upgradable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bool public upgradeStatus;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        string memory _name,
        string memory _symbol,
        address _multiSigWallet
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract());

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
    }

    function migrate(
        address[] memory oldIbAlluoUsers,
        address relevantIbAlluoAddress,
        address compensationToken,
        uint256 totalDebtAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 compensationTokenBalance = IERC20Upgradeable(compensationToken)
            .balanceOf(address(this));

        uint256 iballuoTotalSupply = IIbAlluo(relevantIbAlluoAddress)
            .totalSupply();

        for (uint256 i = 0; i < oldIbAlluoUsers.length; i++) {
            int256 iballuoETHBalance = IIbAlluo(relevantIbAlluoAddress)
                .combinedBalanceOf(oldIbAlluoUsers[i]);
            if (iballuoETHBalance > 0) {
                uint256 iballuoETHBalanceAbs = uint256(iballuoETHBalance);

                // Burn iballuo
                IIbAlluo(relevantIbAlluoAddress).burn(
                    oldIbAlluoUsers[i],
                    iballuoETHBalanceAbs
                );
                uint256 individualCompensationFactor = (iballuoETHBalanceAbs *
                    10 ** 18) / iballuoTotalSupply;

                uint256 individualCompensation = (compensationTokenBalance *
                    individualCompensationFactor) / 10 ** 18;

                IERC20Upgradeable(compensationToken).safeTransfer(
                    oldIbAlluoUsers[i],
                    individualCompensation
                );

                uint256 individualMintFactor = (10 ** 18 -
                    individualCompensationFactor);
                uint256 individualMintAmount = (totalDebtAmount *
                    individualMintFactor) / 10 ** 18;

                _mint(oldIbAlluoUsers[i], individualMintAmount);
            }
        }
    }

    function changeUpgradeStatus(
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function grantRole(
        bytes32 role,
        address account
    ) public override onlyRole(getRoleAdmin(role)) {
        if (role == DEFAULT_ADMIN_ROLE) {
            require(account.isContract());
        }
        _grantRole(role, account);
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(UPGRADER_ROLE) {
        require(upgradeStatus);
        upgradeStatus = false;
    }
}

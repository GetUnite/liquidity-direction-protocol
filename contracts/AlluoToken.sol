// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract AlluoToken is ERC20, Pausable, AccessControl, ERC20Permit, ERC20Votes {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant INCREASE_MX_SPPL_ROLE = keccak256("INCREASE_MX_SPPL_ROLE");

    uint256 public MAX_TOTAL_SUPPLY;

    constructor(address _newAdmin)
        ERC20("Alluo Token", "ALLUO")
        ERC20Permit("Alluo Token")
    {
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        _grantRole(ADMIN_ROLE, _newAdmin);
        _grantRole(MINTER_ROLE, _newAdmin);
        _grantRole(BURNER_ROLE, _newAdmin);
        _grantRole(PAUSER_ROLE, _newAdmin);
        _grantRole(INCREASE_MX_SPPL_ROLE, _newAdmin);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(INCREASE_MX_SPPL_ROLE, ADMIN_ROLE);
        _setMaxTotalSupply(200000000000000000000000000); //200 Mil.
    }

    modifier canMint() {
        require(totalSupply() < MAX_TOTAL_SUPPLY);
        _;
    }

    function pause() public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(PAUSER_ROLE, msg.sender),
            "AlluoToken: must have pauser role to pause"
        );
        _pause();
    }

    function unpause() public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(PAUSER_ROLE, msg.sender),
            "AlluoToken: must have pauser role to unpause"
        );
        _unpause();
    }

    function increaseMaxTotalSupply(uint256 amount) public returns (bool){
        // solhint-disable-next-line reason-string
        require(
            hasRole(INCREASE_MX_SPPL_ROLE, msg.sender),
            "AlluoToken: must have INCREASE_MX_SPPL_ROLE role to increase"
        );

         // solhint-disable-next-line reason-string
        require(
            amount > MAX_TOTAL_SUPPLY,
            "AlluoToken: new max needs to be greater then old max"
        );
        _setMaxTotalSupply(amount);

        return true;
    }

    function mint(address to, uint256 amount) public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "AlluoToken: must have minter role to mint"
        );
        _mint(to, amount);
    }

    function burn(address account, uint256 amount) public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(BURNER_ROLE, msg.sender),
            "AlluoToken: must have burner role to burn"
        );
        _burn(account, amount);
    }

    function maxTotalSupply() public view virtual returns (uint256) {
        return MAX_TOTAL_SUPPLY;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    // The following functions are overrides required by Solidity.
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _setMaxTotalSupply(uint256 _maxTotalSupply)
        internal
    {
        MAX_TOTAL_SUPPLY = _maxTotalSupply;
    }


    function _mint (address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
        canMint
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
        _setMaxTotalSupply(MAX_TOTAL_SUPPLY - amount);
    }
}

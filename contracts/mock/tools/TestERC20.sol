// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TestERC20 is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 realDecimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        bool _isFork,
        address _multisig
    ) ERC20(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
        _grantRole(MINTER_ROLE, _multisig);

        realDecimals = _decimals;

        uint256 id;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := chainid()
        }

        if (!_isFork) {
            // solhint-disable-next-line reason-string
            require(
                id == 1337 || id == 31337,
                "Do not deploy this contract on public networks!"
            );
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return realDecimals;
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

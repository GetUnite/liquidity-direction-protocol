// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IToken.sol";

contract AToken is ERC777, Ownable, IToken {
    address public override mvpContract;
    uint8 private immutable _decimals;

    modifier onlyMVPContract() {
        require(msg.sender == mvpContract, "ERC20: only MVP contract");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC777(name_, symbol_, new address[](0)) {
        _decimals = decimals_;
    }

    function setMVPContract(address mvpContract_) external onlyOwner {
        require(
            mvpContract == address(0),
            "AToken: MVPStrategy contract already set"
        );
        mvpContract = mvpContract_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount)
        external
        override
        onlyMVPContract
    {
        _mint(to, amount, "", "");
    }

    function burn(address from, uint256 amount)
        external
        override
        onlyMVPContract
    {
        _burn(from, amount, "", "");
    }
}

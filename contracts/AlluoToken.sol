// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract AlluoToken is ERC20, AccessControl, ERC20Permit, ERC20Votes {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant CAP_CHANGER_ROLE = keccak256("CAP_CHANGER_ROLE");

    mapping(address=>bool) public whitelist;
    mapping(address=>bool) public blocklist;

    bool public paused;

    uint256 private _cap;

    modifier notBlocked(address _recipient) {
        require(
            !blocklist[msg.sender] && !blocklist[_recipient], 
            "AlluoToken: You are in blocklist"
        );
        _;
    }

    modifier pausable(address _recipient) {
        if (paused) {
        // solhint-disable-next-line reason-string
            require(
                whitelist[msg.sender] || whitelist[_recipient], 
                "AlluoToken: Only whitelisted users can transfer while token paused"
            );
        }
        _;
    }

    constructor(address _newAdmin)
        ERC20("Alluo Token", "ALLUO")
        ERC20Permit("Alluo Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        _grantRole(ADMIN_ROLE, _newAdmin);
        _grantRole(MINTER_ROLE, _newAdmin);
        _grantRole(BURNER_ROLE, _newAdmin);
        _grantRole(PAUSER_ROLE, _newAdmin);
        _grantRole(CAP_CHANGER_ROLE, _newAdmin);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CAP_CHANGER_ROLE, ADMIN_ROLE);
        _setCap(200000000 * 10 ** decimals());
    }

    function changeCap(uint256 amount) public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(CAP_CHANGER_ROLE, msg.sender),
            "AlluoToken: must have cap changer role to change"
        );

         // solhint-disable-next-line reason-string
        require(
            amount > totalSupply() && amount > 0,
            "AlluoToken: new cap needs to be greater then total supply and zero"
        );
        _setCap(amount);
    }

    function mint(address to, uint256 amount) public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "AlluoToken: must have minter role to mint"
        );
        // solhint-disable-next-line reason-string
        require(
            totalSupply() + amount <= _cap, 
            "AlluoToken: total supply must be below or equal to the cap"
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


    function setPause(bool _state) public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(PAUSER_ROLE, msg.sender),
            "AlluoToken: must have pauser role to change pause state"
        );
        paused = _state;
    }

    function setWhiteStatus(address _user, bool _state) public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "AlluoToken: must have admin role to add to white list"
        );
        whitelist[_user] = _state;
    }

    function setBlockStatus(address _user, bool _state) public {
        // solhint-disable-next-line reason-string
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "AlluoToken: must have admin role to add to block list"
        );
        blocklist[_user] = _state;
    }

    function maxTotalSupply() public view virtual returns (uint256) {
        return _cap;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) 
    internal
    notBlocked(to)
    pausable(to)
    override 
    {
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

    function _setCap(uint256 _newCap)
        internal
    {
        _cap = _newCap;
    }


    function _mint (address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }

    ///  unlock accidentally sent tokens on contract address
    function unlockERC20(address _token, address _to, uint256 _amount) public onlyRole(ADMIN_ROLE) {
        IERC20(_token).transfer(_to, _amount);
    }
}

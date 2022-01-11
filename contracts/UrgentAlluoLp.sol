// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./ERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract UrgentAlluoLp is ERC20, AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    // Debt factor: variable which grow after any action from user
    // based on current interest rate and time from last update call
    // this is a large number for a more accurate calculation
    uint256 public DF = 10**20;

    // time of last DF update
    uint256 public lastDFUpdate;

    // time limit for using update
    uint256 public updateTimeLimit = 3600;

    // nonce for signature verification processes
    uint256 public nonce;

    // DF of user from last user action on contract
    mapping(address => uint256) public userDF;

    // constant for percent calculation
    uint256 public constant DENOMINATOR = 10**20;

    // year in seconds
    uint32 public constant YEAR = 31536000;
    // current interest rate
    uint8 public interest = 8;

    constructor() ERC20("UrgentAlluoLp", "UALP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        lastDFUpdate = block.timestamp;
        update();
    }

    function multiSignatureVerify(
        uint8[] calldata v,
        bytes32[] calldata r,
        bytes32[] calldata s,
        bytes32 dataHash,
        uint256 timestamp
    ) private {
        require(v.length == 3, "UrgentAlluoLp: only 3 sig");
        require(
            block.timestamp - timestamp >= 1800,
            "UrgentAlluoLp: sig expiried"
        );

        bytes32 signedDataHash = keccak256(
            abi.encodePacked(dataHash, timestamp, nonce)
        );

        address[3] memory signers;
        for (uint256 index = 0; index < 3; index++) {
            bytes32 message = signedDataHash.toEthSignedMessageHash();
            address signer = message.recover(v[index], r[index], s[index]);
            require(hasRole(SIGNER_ROLE, signer), "UrgentAlluoLp: invalid sig");
            signers[index] = signer;
        }
        require(
            signers[0] != signers[1] &&
                signers[1] != signers[2] &&
                signers[2] != signers[0],
            "UrgentAlluoLp: repeated sig"
        );
        nonce++;
    }

    function update() public {
        uint256 timeFromLastUpdate = block.timestamp - lastDFUpdate;
        if (timeFromLastUpdate <= lastDFUpdate + updateTimeLimit) {
            DF =
                ((DF *
                    ((interest * DENOMINATOR * timeFromLastUpdate) /
                        YEAR +
                        100 *
                        DENOMINATOR)) / DENOMINATOR) /
                100;
            lastDFUpdate = block.timestamp;
        }
    }

    function claim(address _address) public {
        update();
        if (userDF[_address] != 0) {
            uint256 userBalance = balanceOf(_address);
            uint256 userNewBalance = ((DF * userBalance) / userDF[_address]);
            _mint(_address, userNewBalance - userBalance);
        }
        userDF[_address] = DF;
    }

    function safeMint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _beforeTokenTransfer(address(0), to, amount);

        _mint(to, amount);

        _afterTokenTransfer(address(0), to, amount);
    }

    function mint(
        address to,
        uint256 amount,
        uint8[] calldata v,
        bytes32[] calldata r,
        bytes32[] calldata s,
        uint256 timestamp
    ) private onlyRole(MINTER_ROLE) {
        bytes32 dataHash = keccak256(abi.encodePacked(to, amount));
        multiSignatureVerify(v, r, s, dataHash, timestamp);
        _mint(to, amount);
    }

    function safeBurn(address account, uint256 amount)
        public
        onlyRole(BURNER_ROLE)
    {
        _beforeTokenTransfer(account, address(0), amount);

        _burn(account, amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    function burn(
        address account,
        uint256 amount,
        uint8[] calldata v,
        bytes32[] calldata r,
        bytes32[] calldata s,
        uint256 timestamp
    ) private onlyRole(BURNER_ROLE) {
        bytes32 dataHash = keccak256(abi.encodePacked(account, amount));
        multiSignatureVerify(v, r, s, dataHash, timestamp);
        _burn(account, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        claim(from);
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        claim(to);
        super._afterTokenTransfer(from, to, amount);
    }
}

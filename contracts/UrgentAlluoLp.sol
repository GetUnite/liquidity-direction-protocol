// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./AlluoERC20.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract UrgentAlluoLp is AlluoERC20, AccessControl {
    using ECDSA for bytes32;
    using Address for address;

    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

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

    uint256 public signatureTimeout = 300;

    // DF of user from last user action on contract
    mapping(address => uint256) public userDF;

    // constant for percent calculation
    uint256 public constant DENOMINATOR = 10**20;

    // year in seconds
    uint32 public constant YEAR = 31536000;
    // current interest rate
    uint8 public interest = 8;

    event BurnedForWithdraw(address indexed user, uint256 amount);

    constructor(
        address multiSigWallet,
        address backend,
        address[3] memory signers
    ) AlluoERC20("ALLUO LP", "LPALL") {
        require(multiSigWallet.isContract(), "UrgentAlluoLp: not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, multiSigWallet);
        _grantRole(BACKEND_ROLE, backend);

        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);

        for (uint256 index = 0; index < 3; index++) {
            _grantRole(SIGNER_ROLE, signers[index]);
        }

        lastDFUpdate = block.timestamp;
        update();
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

    function withdraw(uint256 amount) external {
        claim(msg.sender);
        _burn(msg.sender, amount);

        emit BurnedForWithdraw(msg.sender, amount);
    }

    function createBridgedTokens(
        address recipient,
        uint256 amount,
        uint8[3] calldata v,
        bytes32[3] calldata r,
        bytes32[3] calldata s,
        uint256 timestamp
    ) external onlyRole(BACKEND_ROLE) {
        bytes32 dataHash = keccak256(abi.encodePacked(recipient, amount));
        multiSignatureVerify(v, r, s, dataHash, timestamp);

        claim(recipient);
        _mint(recipient, amount);
    }

    function setSignatureTimeout(uint256 value)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        signatureTimeout = value;
    }

    function setInterest(uint8 _newInterest)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        update();
        interest = _newInterest;
    }

    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        if (role == DEFAULT_ADMIN_ROLE) {
            require(account.isContract(), "UrgentAlluoLp: not contract");
        }
        _grantRole(role, account);
    }

    function getBalance(address _address) external view returns (uint256) {
        return ((DF * balanceOf(_address)) / userDF[_address]);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        claim(from);
        claim(to);
        super._beforeTokenTransfer(from, to, amount);
    }

    function multiSignatureVerify(
        uint8[3] calldata v,
        bytes32[3] calldata r,
        bytes32[3] calldata s,
        bytes32 dataHash,
        uint256 timestamp
    ) private {
        require(
            block.timestamp - timestamp <= signatureTimeout,
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
}

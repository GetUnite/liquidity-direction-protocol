// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";

import "../interfaces/IAlluoToken.sol";
import "../interfaces/ILocker.sol";
import "../interfaces/IGnosis.sol";
import "hardhat/console.sol";

interface IAnyCall {
    function anyCall( address _to, bytes calldata _data, address _fallback, uint256 _toChainID, uint256 _flags ) external;
}
contract VoteExecutorMaster is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable {

    using ECDSA for bytes32;
    using Address for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bool public upgradeStatus;

    struct Message {
        uint256 CommandIndex;
        bytes CommandData;
    }

    struct SubmitedData {
        bytes data;
        uint256 time;
        bytes[] signs;
    }

    uint256 minSigns;

    SubmitedData[] private submitedData;

    uint firstNotExecutedData;
    
    address public gnosis;
    address public alluoToken;
    address public locker;
    address public anyCallAddress;
    address public polygonExecutor;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "Handler: Not contract");
        gnosis = _multiSigWallet;
        minSigns = 2;
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
    }

    function submitData(bytes memory data) public {
        SubmitedData memory newSubmitedData;
        newSubmitedData.data = data;
        newSubmitedData.time = block.timestamp;
        submitedData.push(newSubmitedData);
    }

//check for existing sign
    function approveSubmitedData(uint256 dataId, bytes[] memory signs) public {
        address[] memory owners = IGnosis(gnosis).getOwners();
        (bytes32 dataHash,) = abi.decode(submitedData[dataId].data, (bytes32, Message[]));
        for (uint256 i; i < signs.length; i++) {
            for (uint256 j; j < owners.length; j++) {
                if(_verify(dataHash, signs[i], owners[j])){
                    submitedData[dataId].signs.push(signs[i]);
                    break;
                }
            }
        }
    }
//check for existing sign for single address
    function singleApproveSubmitedData(uint256 dataId, bytes memory sign) public {
        address[] memory owners = IGnosis(gnosis).getOwners();
        (bytes32 dataHash,) = abi.decode(submitedData[dataId].data, (bytes32, Message[]));
            for (uint256 j; j < owners.length; j++) {
                if(_verify(dataHash, sign, owners[j])){
                    submitedData[dataId].signs.push(sign);
                    break;
                }
            }
        }
    
//how to deal with other networks
    function execute() public {
        for (uint256 i = firstNotExecutedData; i <= submitedData.length; i++) {
            if(submitedData[i].time + 86400 > block.timestamp && submitedData[i].signs.length >= minSigns){
                (,Message[] memory messages) = abi.decode(submitedData[i].data, (bytes32, Message[]));
                for (uint256 j; j < messages.length; j++) {
                    if(messages[i].CommandIndex == 1){
                        (uint256 mintAmount,uint256 reward) = abi.decode(messages[i].CommandData, (uint256, uint256));
                        _setLockerReward(mintAmount, reward);
                    }
                }
                bytes memory finalData = abi.encode(submitedData[i].data, submitedData[i].signs);
                IAnyCall(anyCallAddress).anyCall(polygonExecutor, finalData, address(0), 137, 0);
                firstNotExecutedData++;
            }

        }

    }

   function encodeData(bytes32 _messagesHash, Message[] memory _messages) public pure  returns (bytes memory data) {
        data = abi.encode(
                _messagesHash,
                _messages
            );
    }

    function encodeAllCommands(uint256[] memory _commandIndexes, bytes[] memory _commands) public pure  returns (bytes32 messagesHash, Message[] memory messages) {
        require(_commandIndexes.length == _commands.length, "Array length mismatch");
        messages = new Message[](_commandIndexes.length);
        for (uint256 i; i < _commandIndexes.length; i++) {
            messages[i] = Message(_commandIndexes[i], _commands[i]);
        }
        messagesHash = keccak256(abi.encode(messages));
    }

    function encodeApyCommand(
        string memory _ibAlluoName, 
        uint256 _newAnnualInterest, 
        uint256 _newInterestPerSecond
    ) public pure  returns (uint256, bytes memory) {
        bytes memory hashedComand = abi.encode(_ibAlluoName, _newAnnualInterest, _newInterestPerSecond);
        return (0, hashedComand);
    }

    function encodeMintCommand(
        uint256 _newMintAmount, 
        uint256 _newRewardPerDistribution
    ) public pure  returns (uint256, bytes memory) {
        bytes memory hashedComand = abi.encode(_newMintAmount, _newRewardPerDistribution);
        return (1, hashedComand);
    }

    function grantRole(bytes32 role, address account)
    public
    override
    onlyRole(getRoleAdmin(role)) {
        if (role == DEFAULT_ADMIN_ROLE) {
            require(account.isContract(), "Handler: Not contract");
        }
        _grantRole(role, account);
    }

    function changeUpgradeStatus(bool _status)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function _setLockerReward(uint256 _mintAmount, uint256 _rewardAmount) internal {
        IAlluoToken(alluoToken).mint(locker, _mintAmount);
        ILocker(locker).setReward(_rewardAmount);
    }

    function _verify(bytes32 data, bytes memory signature, address account) internal pure returns (bool) {
        return data
            .toEthSignedMessageHash()
            .recover(signature) == account;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override {
        require(upgradeStatus, "Handler: Upgrade not allowed");
        upgradeStatus = false;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../interfaces/IAlluoToken.sol";
import "../interfaces/ILocker.sol";
import "../interfaces/IGnosis.sol";

contract VoteExecutorMaster is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable {

    using ECDSAUpgradeable for bytes32;
    using AddressUpgradeable for address;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    address public constant ALLUO = 0x1E5193ccC53f25638Aa22a940af899B692e10B09;

    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    struct SubmittedData {
        bytes data;
        uint256 time;
        bytes[] signs;
    }

    SubmittedData[] public submittedData;
    mapping(bytes32 => uint256) public hashExecutionTime;

    uint256 public minSigns;
    uint256 public timeLock;

    uint256 public firstInQueueData;
    
    address public gnosis;
    address public locker;
    address public anyCallAddress;
    address public polygonExecutor;

    bool public upgradeStatus;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _multiSigWallet, 
        address _locker, 
        address _anyCall,
        uint256 _timeLock
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        //require(_multiSigWallet.isContract(), "Handler: Not contract");
        gnosis = _multiSigWallet;
        minSigns = 2;
        timeLock = _timeLock;
        locker = _locker;
        anyCallAddress = _anyCall;
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        // Just leave in for tests!!!###########
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    /// @notice Allows anyone to submit data for execution of votes
    /// @dev Attempts to parse at high level and then confirm hash before submitting to queue
    /// @param data Payload fully encoded as required (see formatting using encoding functions below)

    function submitData(bytes memory data) external {

        (bytes32 hashed, Message[] memory _messages) = abi.decode(data, (bytes32, Message[]));

        require(hashed == keccak256(abi.encode(_messages)), "Hash doesn't match");

        SubmittedData memory newSubmittedData;
        newSubmittedData.data = data;
        newSubmittedData.time = block.timestamp;
        submittedData.push(newSubmittedData);
    }


    /// @notice Allow anyone to approve data for execution given off-chain signatures
    /// @dev Checks against existing sigs submitted and only allow non-duplicate multisig owner signatures to approve the payload
    /// @param _dataId Id of data payload to be approved
    /// @param _signs Array of off-chain EOA signatures to approve the payload.

    function approveSubmitedData(uint256 _dataId, bytes[] memory _signs) external {
        (bytes32 dataHash,) = abi.decode(submittedData[_dataId].data, (bytes32, Message[]));

        address[] memory owners = IGnosis(gnosis).getOwners();

        bytes[] memory signs = submittedData[_dataId].signs;
        address[] memory uniqueSigners = new address[](owners.length);
        uint256 numberOfSigns;

        for (uint256 i; i< signs.length; i++) {
            numberOfSigns++;
            uniqueSigners[i]= _getSignerAddress(dataHash, signs[i]);
        }


        for (uint256 i; i < _signs.length; i++) {
            for (uint256 j; j < owners.length; j++) {
                if(_verify(dataHash, _signs[i], owners[j]) && _checkUniqueSignature(uniqueSigners, owners[j])){
                    submittedData[_dataId].signs.push(_signs[i]);
                    uniqueSigners[numberOfSigns] = owners[j];
                    numberOfSigns++;
                    break;
                }
            }
        }
    }
        
    /// @notice Iterates through all data in queue and executes votes if conditions are met
    /// @dev Only allow execution if timelock has passed, is not a duplicate hash and is approved.

    function execute() external {
        for (uint256 i = firstInQueueData; i < submittedData.length; i++) {
            (bytes32 hashed, Message[] memory messages) = abi.decode(submittedData[i].data, (bytes32, Message[]));

            require(submittedData[i].time + timeLock < block.timestamp, "Under timelock");
            require(hashExecutionTime[hashed] == 0 || block.timestamp > hashExecutionTime[hashed]+ 3 days, "DuplicateHash");

            if(submittedData[i].signs.length >= minSigns){
                for (uint256 j; j < messages.length; j++) {
                    if(messages[i].commandIndex == 1){
                        (uint256 mintAmount, uint256 period) = abi.decode(messages[i].commandData, (uint256, uint256));
                        IAlluoToken(ALLUO).mint(locker, mintAmount);
                        ILocker(locker).setReward(mintAmount / (period * 1 days));
                    }
                }
                hashExecutionTime[hashed] = block.timestamp;
                bytes memory finalData = abi.encode(submittedData[i].data, submittedData[i].signs);
                // need to change chain id before test deploy
                IAnyCall(anyCallAddress).anyCall(polygonExecutor, finalData, address(0), 4002, 0);
            }
            firstInQueueData++;
        }
    }

    function encodeAllMessages(uint256[] memory _commandIndexes, bytes[] memory _commands) public pure  
    returns (
        bytes32 messagesHash, 
        Message[] memory messages,
        bytes memory inputData
    ) {
        require(_commandIndexes.length == _commands.length, "Array length mismatch");
        messages = new Message[](_commandIndexes.length);
        for (uint256 i; i < _commandIndexes.length; i++) {
            messages[i] = Message(_commandIndexes[i], _commands[i]);
        }
        messagesHash = keccak256(abi.encode(messages));

        inputData = abi.encode(
                messagesHash,
                messages
            );
    }

    function getSubmitedData(uint256 _dataId) external view returns(bytes memory, uint256, bytes[] memory){
        SubmittedData memory submittedDataExact = submittedData[_dataId];
        return(submittedDataExact.data, submittedDataExact.time, submittedDataExact.signs);
    }

    function decodeData(bytes memory _data) public pure returns(bytes32, Message[] memory){
        (bytes32 dataHash, Message[] memory messages) = abi.decode(_data, (bytes32, Message[]));
        return (dataHash, messages);
    } 

    function encodeApyCommand(
        string memory _ibAlluoName, 
        uint256 _newAnnualInterest, 
        uint256 _newInterestPerSecond
    ) public pure  returns (uint256, bytes memory) {
        bytes memory encodedCommand = abi.encode(_ibAlluoName, _newAnnualInterest, _newInterestPerSecond);
        return (0, encodedCommand);
    }

    function decodeApyCommand(
        bytes memory _data
    ) public pure returns (string memory, uint256, uint256) {
        return abi.decode(_data, (string, uint256, uint256));
    }

    function encodeMintCommand(
        uint256 _newMintAmount,
        uint256 _period
    ) public pure  returns (uint256, bytes memory) {
        bytes memory encodedCommand = abi.encode(_newMintAmount, _period);
        return (1, encodedCommand);
    }

    function decodeMintCommand(
        bytes memory _data
    ) public pure returns (uint256, uint256) {
        return abi.decode(_data, (uint256, uint256));
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

    function changeTimeLock(uint256 _newTimeLock)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        timeLock = _newTimeLock;
    }

    function _verify(bytes32 data, bytes memory signature, address account) internal pure returns (bool) {
        return data
            .toEthSignedMessageHash()
            .recover(signature) == account;
    }
    function _getSignerAddress(bytes32 data, bytes memory signature) internal pure returns (address) {
        return data
            .toEthSignedMessageHash()
            .recover(signature);
    }
    
    function _checkUniqueSignature(address[] memory _uniqueSigners, address _signer) internal pure returns (bool) {
        for (uint256 k; k< _uniqueSigners.length; k++) {
            if (_uniqueSigners[k] ==_signer) {
                return false;
            }
        }
        return true;
    }
    /// Admin functions 

    /**
    * @notice Set the address of the multisig.
    * @param _gnosisAddress  
    **/
    function setGnosis(address _gnosisAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosis = _gnosisAddress;
    }

    function setLocker(address _lockerAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        locker = _lockerAddress;
    }

    /// @notice Sets the minimum required signatures before data is accepted on L2.
    /// @param _minSigns New value
    function setMinSigns(uint256 _minSigns) public onlyRole(DEFAULT_ADMIN_ROLE) {
        minSigns = _minSigns;
    }
    
    function setAnyCallAddresses(address _newAnyCallAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        anyCallAddress = _newAnyCallAddress;
    }

    function setVoteExecutorSlave(address _newAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        polygonExecutor = _newAddress;
    }


    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override {
        require(upgradeStatus, "Handler: Upgrade not allowed");
        upgradeStatus = false;
    }
}


interface IAnyCall {
    function anyCall(address _to, bytes calldata _data, address _fallback, uint256 _toChainID, uint256 _flags) external;

}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../interfaces/IGnosis.sol";
import "../interfaces/ILiquidityHandler.sol";
import "../interfaces/IIbAlluo.sol";
import "hardhat/console.sol";

interface IAnyCallExecutor {
    struct Context {
        address from;
        uint256 fromChainID;
        uint256 nonce;
    }
  function context() external returns (Context memory);
}

contract VoteExecutorSlave is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable {

    using ECDSA for bytes32;
    using Address for address;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bool upgradeStatus;
    string public lastMessage;
    address public lastCaller;
    address public VoteExecutorMaster;
    bytes[] public executionHistory;


    // Anycall V6 Fantom Address
    address public anyCallAddress;
    address public anyCallExecutorAddress;

    ILiquidityHandler public handler;
    address public gnosis;
    uint256 minSigns;

    mapping(string => IIbAlluo) IbAlluoSymbolToAddress;
    
    struct Message {
        uint256 CommandIndex;
        bytes CommandData;
    }

    struct APYData {
        uint256 newAnnualInterest;
        uint256 newInterestPerSecond;
        string ibAlluo;
    }
    
    event MessageReceived(bytes32 indexed messagesHash);


    function initialize(address _multiSigWallet, address _handlerAddress) public initializer {
            __Pausable_init();
            __AccessControl_init();
            __UUPSUpgradeable_init();

            anyCallAddress = 0xD7c295E399CA928A3a14b01D760E794f1AdF8990;
            anyCallExecutorAddress = 0xe3aee52608Db94F2691a7F9Aba30235B14B7Bb70;
            handler = ILiquidityHandler(_handlerAddress);
            gnosis  = _multiSigWallet;
            minSigns = 3;
            
            require(_multiSigWallet.isContract(), "Handler: Not contract");

            _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
            // Only enable for tests!
            _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
            _grantRole(UPGRADER_ROLE, _multiSigWallet);
        }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}


    /// @notice Receives SMPC call from Multichain and executes command after security checks
    /// @dev Format of function name and return params are necessary (see docs: https://docs.multichain.org/developer-guide/anycall/anycall-v6/how-to-integrate-anycall-v6)
    // Carry out two security checks:
    // 1.) Confirm that the hash has been signed by the multisig 
    // 2.) Confirm that anyCall has been triggered by our VoteExecutorMaster contract
    /// @param _data Data sent through by SMPC
    /// @return success Required by Multichain
    /// @return result Required by Multichain
    function anyExecute(bytes memory _data) external returns (bool success, bytes memory result) {
        (bytes memory message, bytes[] memory signs) = abi.decode(_data, (bytes, bytes[]));
        (bytes32 hashed, Message[] memory _messages) = abi.decode(message, (bytes32, Message[]));

        require(hashed == keccak256(abi.encode(_messages)), "Hash doesn't match the plaintext messages");
        require(_checkSignedHashes(signs, hashed), "Hash has not been approved");
        // Comment this line for local tests
        // require(IAnyCallExecutor(anyCallExecutorAddress).context().from == VoteExecutorMaster, "Origin of message invalid");

        execute(_messages);
        executionHistory.push(_data);
        success=true;
        result="";
        emit MessageReceived(hashed);
        }


    /// @notice Executes all messages received after authentication
    /// @dev Loops through each command in the array and executes it.
    /// @param _messages Array of messages
    function execute(Message[] memory _messages) internal {
        for (uint256 i; i < _messages.length; i++) {
            Message memory currentMessage =  _messages[i];
            if (currentMessage.CommandIndex == 0) {
                (string memory ibAlluoSymbol, uint256 newAnnualInterest, uint256 newInterestPerSecond) = abi.decode(currentMessage.CommandData, (string, uint256, uint256));
                _changeAPY(newAnnualInterest, newInterestPerSecond, ibAlluoSymbol);
            }
        }
    }

    // We discused that we should be calling directly to handler, but this is a little inefficient.
    // We could save the list of ibAlluos in this contract. But at the moment, this is the only way to set interest through the handler 
    // using only the symbol of the ibAlluo.
    function _changeAPY(uint256 _newAnnualInterest, uint256 _newInterestPerSecond, string memory _ibAlluoSymbol) internal {
        IbAlluoSymbolToAddress[_ibAlluoSymbol].setInterest(_newAnnualInterest, _newInterestPerSecond);
    }

    function _reallocate(bytes memory data) internal {
    }

    /// @notice Checks the array of signatures from L1 for authentication
    /// @dev Grabs list of approved multisig signers and loops through eth_sign recovery and returns true if it exceeds minimum signs.
    /// @param _signs Array of signatures sent from L1
    /// @param _hashed The hash of the data from L1
    /// @return bool
    function _checkSignedHashes(bytes[] memory _signs, bytes32 _hashed) internal view returns (bool) {
        address[] memory owners = IGnosis(gnosis).getOwners();
        address[] memory uniqueSigners = new address[](owners.length);
        uint256 numberOfSigns;
        for (uint256 i; i < _signs.length; i++) {
            for (uint256 j; j < owners.length; j++) {
                if(_verify(_hashed, _signs[i], owners[j]) && _checkUniqueSignature(uniqueSigners, owners[j])){
                    uniqueSigners[numberOfSigns] = owners[j];
                    numberOfSigns++;
                    break;
                }
            }
        }
        return numberOfSigns >= minSigns ? true : false;
    }


    function _checkUniqueSignature(address[] memory _uniqueSigners, address _signer) public pure returns (bool) {
        for (uint256 k; k< _uniqueSigners.length; k++) {
            if (_uniqueSigners[k] ==_signer) {
                return false;
            }
        }
        return true;
    }
    /// Helper functions

    /**
    * @notice Set the address of the multisig.
    * @param _gnosisAddress  
    **/
    function setGnosis(address _gnosisAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosis = _gnosisAddress;
    }

    /// @notice Sets the minimum required signatures before data is accepted on L2.
    /// @param _minSigns New value
    function setMinSigns(uint256 _minSigns) public onlyRole(DEFAULT_ADMIN_ROLE) {
        minSigns = _minSigns;
    }
    
    function updateIbAlluoAddresses() public {
        address[] memory ibAlluoAddressList = handler.getListOfIbAlluos();
        for (uint256 i; i< ibAlluoAddressList.length; i++) {
            IIbAlluo ibAlluo = IIbAlluo(ibAlluoAddressList[i]);
            IbAlluoSymbolToAddress[ibAlluo.symbol()] = IIbAlluo(ibAlluoAddressList[i]);
        }
    }


    // Helper to simulate L1 Encoding
    /// @notice Simulates what gnosis is doing when calling VoteExecutorMaster
    /// @dev Loops through and just forms the bytes encoded data that VoteExecutorSlave takes as inputs.
    /// @param _hashed Keccak256 Hash of the array of messages we are sending as payload
    /// @param _messages Array of messages encoded with encodemessages()
    /// @return data Bytes encoded data that is used as the payload through anyCall
    function encodeData(bytes32 _hashed, Message[] memory _messages) public pure  returns (bytes memory data) {
        data = abi.encode(
                _hashed,
                _messages
            );
    }


    // Helper to simulate L1 Encoding
    /// @notice Simulates what gnosis is doing when calling VoteExecutorMaster to encode messages
    /// @dev Loops through and just forms the bytes encoded data that VoteExecutorSlave takes as inputs.
    /// @param _commandIndexes Array of action names ("changeAPY");
    /// @param _messages "actions" that are abi.encoded.
    /// @return messagesHash Keccak256 hashed messages used to sign.
    /// @return messages Struct form to input into encodeData

    function encodeAllMessages(uint256[] memory _commandIndexes, bytes[] memory _messages) public pure  returns (bytes32 messagesHash, Message[] memory messages, bytes memory inputData) {
        require(_commandIndexes.length == _messages.length, "Array length mismatch");
        messages = new Message[](_commandIndexes.length);
        for (uint256 i; i < _commandIndexes.length; i++) {
            messages[i] = Message(_commandIndexes[i], _messages[i]);
        }
        messagesHash = keccak256(abi.encode(messages));
        inputData = abi.encode(
                messagesHash,
                messages
            );
    }

    function encodeApyCommand(
        string memory _ibAlluoName, 
        uint256 _newAnnualInterest, 
        uint256 _newInterestPerSecond
    ) public pure  returns (uint256, bytes memory) {
        bytes memory encodedComand = abi.encode(_ibAlluoName, _newAnnualInterest, _newInterestPerSecond);
        return (0, encodedComand);
    }

    function _verify(bytes32 data, bytes memory signature, address account) internal pure returns (bool) {
        return data.toEthSignedMessageHash().recover(signature) == account;
    }
    
    /// Admin functions 
    function setAnyCallAddresses(address _newProxyAddress, address _newExecutorAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        anyCallAddress = _newProxyAddress;
        anyCallExecutorAddress = _newExecutorAddress;
    }

    function setVoteExecutorMaster(address _newAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        VoteExecutorMaster = _newAddress;
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

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override {
        require(upgradeStatus, "Handler: Upgrade not allowed");
        upgradeStatus = false;
    }
}
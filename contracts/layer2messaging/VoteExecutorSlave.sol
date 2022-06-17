// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";

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

    using Address for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;

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
    
    EnumerableSetUpgradeable.Bytes32Set private signedHashes;
    mapping(string => IIbAlluo) IbAlluoSymbolToAddress;
    
    struct Command {
        uint256 CommandIndex;
        bytes CommandData;
    }

    struct APYData {
        uint256 newAnnualInterest;
        uint256 newInterestPerSecond;
        string ibAlluo;
    }
    
    event MessageReceived(bytes32 indexed commandsHash);


    function initialize(address _multiSigWallet, address _handlerAddress) public initializer {
            __Pausable_init();
            __AccessControl_init();
            __UUPSUpgradeable_init();

            anyCallAddress = 0xD7c295E399CA928A3a14b01D760E794f1AdF8990;
            anyCallExecutorAddress = 0xe3aee52608Db94F2691a7F9Aba30235B14B7Bb70;
            handler = ILiquidityHandler(_handlerAddress);

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
        (bytes32 hashed, Command[] memory _commands) = abi.decode(_data, (bytes32, Command[]));

        require(hashed == keccak256(abi.encode(_commands)), "Hash doesn't match the plaintext commands");
        require(signedHashes.contains(hashed), "Hash has not been approved");
        // Comment this line for local tests
        // require(IAnyCallExecutor(anyCallExecutorAddress).context().from == VoteExecutorMaster, "Origin of message invalid");

        // Once checks are complete, execute commands.
        execute(_commands);
        executionHistory.push(_data);
        success=true;
        result="";
        emit MessageReceived(hashed);
        }


    /// @notice Executes all commands received after authentication
    /// @dev Loops through each command in the array and executes it.
    /// @param _commands Array of commands
    function execute(Command[] memory _commands) internal {
        for (uint256 i; i < _commands.length; i++) {
            Command memory currentCommand =  _commands[i];
            if (currentCommand.CommandIndex == 0) {
                (uint256 newAnnualInterest, uint256 newInterestPerSecond, string memory ibAlluoSymbol) = abi.decode(currentCommand.CommandData, (uint256, uint256, string));
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


    /// Helper functions
    /**
    * @notice Only the multisig can approve the hash for data integrity.
    * @dev A precaution against bridge hacks
    * @param _hash  Hash of payload sent from VoteExecutorMaster
    **/
    function approveHash(bytes32 _hash) public onlyRole(DEFAULT_ADMIN_ROLE) {
        signedHashes.add(_hash);
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
    /// @param _commands Array of commands encoded with encodeCommands()
    /// @return data Bytes encoded data that is used as the payload through anyCall
    function encodeData(bytes32 _hashed, Command[] memory _commands) public pure  returns (bytes memory data) {
        data = abi.encode(
                _hashed,
                _commands
            );
    }

    // Helper to simulate L1 Encoding
    /// @notice Simulates what gnosis is doing when calling VoteExecutorMaster to encode commands
    /// @dev Loops through and just forms the bytes encoded data that VoteExecutorSlave takes as inputs.
    /// @param _CommandIndexes Array of action names ("changeAPY");
    /// @param _messages "actions" that are abi.encoded.
    /// @return commands Struct form to input into encodeData
    /// @return hashedCommands Keccak256 hashed commands used to sign.
    function encodeCommands( uint256[] memory _CommandIndexes, bytes[] memory _messages) public pure  returns (Command[] memory commands, bytes32 hashedCommands) {
        require(_CommandIndexes.length == _messages.length, "Array length mismatch");
        commands = new Command[](_CommandIndexes.length);
        for (uint256 i; i < _CommandIndexes.length; i++) {
            Command memory currentCommand = Command(_CommandIndexes[i], _messages[i]);
            commands[i] = currentCommand;
        }
        hashedCommands = keccak256(abi.encode(commands));
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
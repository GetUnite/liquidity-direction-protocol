// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
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

contract VoteExecutorSlave {

    struct Command {
        string name;
        bytes data;
    }

    struct APYProposal {
        uint256 newAnnualInterest;
        uint256 newInterestPerSecond;
        address ibAlluoAddress;
    }

    string public lastMessage;
    address public lastCaller;
    address public VoteExecutorMaster;

    bytes[] public executionHistory;

    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private whitelist;

    // Anycall V6 Fantom Address
    address public anyCallAddress = 0xD7c295E399CA928A3a14b01D760E794f1AdF8990;
    address public anyCallExecutorAddress = 0xe3aee52608Db94F2691a7F9Aba30235B14B7Bb70;
    
    event MessageReceived(bytes32 indexed commandsHash);

    constructor() {
        whitelist.add(msg.sender);
    }

    modifier onlyWhitelist {
        require(whitelist.contains(msg.sender), "Only whitelisted addresses");
        _;
    }

    /// @notice Receives SMPC call from Multichain and executes command after security checks
    /// @dev Format of function name and return params are necessary (see docs: https://docs.multichain.org/developer-guide/anycall/anycall-v6/how-to-integrate-anycall-v6)
    // Carry out two security checks:
    // 1.) Confirm that the hash has been signed by the multisig 
    // 2.) Confirm that anyCall has been triggered by our VoteExecutorMaster contract
    /// @param _data Data sent through by SMPC
    /// @return success Required by Multichain
    /// @return result Required by Multichain
    function anyExecute(bytes memory _data) external returns (bool success, bytes memory result) {
        (bytes32 hashed, bytes memory signature, Command[] memory _commands) = abi.decode(_data, (bytes32, bytes, Command[]));

        require(hashed == keccak256(abi.encode(_commands)), "Hash doesn't match");
        address signer = recoverSigner(hashed, signature);
        require(whitelist.contains(signer), "Isn't whitelisted");
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
            if (keccak256(bytes(currentCommand.name)) == keccak256(bytes("changeAPY"))) {
                APYProposal memory apyProposal = abi.decode(currentCommand.data, (APYProposal));
                _changeAPY(apyProposal);
            }
        }
    }

    function _changeAPY(APYProposal memory _apyProposal) internal {
        IIbAlluo(_apyProposal.ibAlluoAddress).setInterest(_apyProposal.newAnnualInterest, _apyProposal.newInterestPerSecond);
    }

    function _reallocate(bytes memory data) internal {
    }


    /// Helper functions
    /**
    * @notice Recover the signer of hash, assuming it's an EOA account
    * @dev Only for EthSign signatures
    * @param _hash       Hash of message that was signed
    * @param _signature  Signature encoded as (bytes32 r, bytes32 s, uint8 v)
    **/
    function recoverSigner(
        bytes32 _hash,
        bytes memory _signature
    ) internal pure returns (address signer) {
        require(_signature.length == 65, "SignatureValidator#recoverSigner: invalid signature length");

        // Variables are not scoped in Solidity.
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(_signature, 32))
            // second 32 bytes
            s := mload(add(_signature, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(_signature, 96)))
        }

        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
        revert("SignatureValidator#recoverSigner: invalid signature 's' value");
        }

        if (v != 27 && v != 28) {
        revert("SignatureValidator#recoverSigner: invalid signature 'v' value");
        }

        // Recover ECDSA signer
        signer = ecrecover(
        keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)),
        v,
        r,
        s
        );
        
        // Prevent signer from being 0x0
        require(
        signer != address(0x0),
        "SignatureValidator#recoverSigner: INVALID_SIGNER"
        );

        return signer;
    }



    // Helper to simulate L1 Encoding
    /// @notice Simulates what gnosis is doing when calling VoteExecutorMaster
    /// @dev Loops through and just forms the bytes encoded data that VoteExecutorSlave takes as inputs.
    /// @param _hashed Keccak256 Hash of the array of messages we are sending as payload
    /// @param _signature Signed _hashed using private key on github actions 
    /// @param _commands Array of commands encoded with encodeCommands()
    /// @return data Bytes encoded data that is used as the payload through anyCall
    function encodeData(bytes32 _hashed, bytes memory _signature, Command[] memory _commands) public pure  returns (bytes memory data) {
        data = abi.encode(
                _hashed,
                _signature,
                _commands
            );
    }

    // Helper to simulate L1 Encoding
    /// @notice Simulates what gnosis is doing when calling VoteExecutorMaster to encode commands
    /// @dev Loops through and just forms the bytes encoded data that VoteExecutorSlave takes as inputs.
    /// @param _names Array of action names ("changeAPY");
    /// @param _messages "actions" that are abi.encoded.
    /// @return commands Struct form to input into encodeData
    /// @return hashedCommands Keccak256 hashed commands used to sign.
    function encodeCommands( string[] memory _names, bytes[] memory _messages) public pure  returns (Command[] memory commands, bytes32 hashedCommands) {
        require(_names.length == _messages.length, "Array length mismatch");
        commands = new Command[](_names.length);
        for (uint256 i; i < _names.length; i++) {
            Command memory currentCommand = Command(_names[i], _messages[i]);
            commands[i] = currentCommand;
        }
        hashedCommands = keccak256(abi.encode(commands));
    }

    /// Admin functions 
    function setAnyCallAddresses(address _newProxyAddress, address _newExecutorAddress) public onlyWhitelist {
        anyCallAddress = _newProxyAddress;
        anyCallExecutorAddress = _newExecutorAddress;
    }

    function setVoteExecutorMaster(address _newAddress) public onlyWhitelist {
        VoteExecutorMaster = _newAddress;
    }


    function addToWhitelist(address _newAdmin) public onlyWhitelist {
        whitelist.add(_newAdmin);
    }

    function removeFromWhitelist(address _remove) public onlyWhitelist {
        whitelist.remove(_remove);
    }

}
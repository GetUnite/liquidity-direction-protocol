// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "../interfaces/IGnosis.sol";
import "../interfaces/ILiquidityHandler.sol";
import "../interfaces/IIbAlluo.sol";
import "../interfaces/IAlluoStrategy.sol";
import "../interfaces/IExchange.sol";
import "../interfaces/IMultichain.sol";

interface IAnyCallExecutor {
    struct Context {
        address from;
        uint256 fromChainID;
        uint256 nonce;
    }

    function context() external returns (Context memory);
}

interface IAnyCall {
    function anyCall(
        address _to,
        bytes calldata _data,
        address _fallback,
        uint256 _toChainID,
        uint256 _flags
    ) external;
}

contract VoteExecutorSlave is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;
    using Address for address;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bool public upgradeStatus;
    string public lastMessage;
    address public lastCaller;
    bytes[] public executionHistory;

    // Anycall V6 Fantom Address
    address public anyCallAddress;
    address public anyCallExecutorAddress;

    ILiquidityHandler public handler;
    address public gnosis;
    uint256 public minSigns;

    mapping(string => IIbAlluo) public ibAlluoSymbolToAddress;
    mapping(bytes32 => uint256) public hashExecutionTime;

    mapping(address => address) public tokenToAnyToken;
    mapping(address => EnumerableSetUpgradeable.AddressSet)
        private strategyToEntryTokens;
    mapping(address => DepositQueue) public tokenToDepositQueue;
    EnumerableSetUpgradeable.AddressSet private primaryTokens;
    address public multichainRouter;
    mapping(string => LiquidityDirection) public liquidityDirection;

    address public exchangeAddress;
    GeneralBridging public generalBridgingInfo;
    mapping(address => TokenBridging) public tokenToBridgingInfo;
    address public voteExecutorMaster;

    CrossChainMessaging public messagingInfo;

    struct GeneralBridging {
        uint256 currentChain;
        address nextChainExecutor;
        uint256 nextChain;
    }

    struct CrossChainMessaging {
        address anyCallAddress;
        address anyCallExecutor;
        address nextChainExecutor;
        uint256 nextChain;
        address previousChainExecutor;
    }
    struct TokenBridging {
        bytes4 functionSignature;
        address multichainRouter;
        uint256 minimumAmount;
    }

    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    struct APYData {
        uint256 newAnnualInterest;
        uint256 newInterestPerSecond;
        string ibAlluo;
    }

    struct Deposit {
        address strategyAddress;
        uint256 amount;
        address strategyPrimaryToken;
        address entryToken;
        bytes data;
    }

    struct DepositQueue {
        Deposit[] depositList;
        uint256 depositNumber;
    }

    struct LiquidityDirection {
        address strategyAddress;
        uint256 chainId;
        bytes entryData;
        bytes exitData;
    }
    event MessageReceived(bytes32 indexed messagesHash);

    function initialize(
        address _multiSigWallet,
        address _handlerAddress
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        anyCallAddress = 0xC10Ef9F491C9B59f936957026020C321651ac078;
        anyCallExecutorAddress = 0x0C9f0ea6317038c9D7180Cf4A0aEeB58478D13A4;
        handler = ILiquidityHandler(_handlerAddress);
        gnosis = _multiSigWallet;
        minSigns = 1;
        // require(_multiSigWallet.isContract(), "Handler: Not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        exchangeAddress = 0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // 1. Fantom master
    // 2. Polygon Slave
    // 3. Arbitrum Slave
    // 1. --> anyCall --> 2. --> anyCall --> ArbitrumSlave
    // 1. --> try bridge funds to arbtirum slave --

    /// @notice Receives SMPC call from Multichain and executes command after security checks
    /// @dev Format of function name and return params are necessary (see docs: https://docs.multichain.org/developer-guide/anycall/anycall-v6/how-to-integrate-anycall-v6)
    // Carry out two security checks:
    // 1.) Confirm that the hash has been signed by the multisig
    // 2.) Confirm that anyCall has been triggered by our VoteExecutorMaster contract
    /// @param _data Data sent through by SMPC
    /// @return success Required by Multichain
    /// @return result Required by Multichain
    function anyExecute(
        bytes memory _data
    ) external returns (bool success, bytes memory result) {
        (bytes memory message, bytes[] memory signs) = abi.decode(
            _data,
            (bytes, bytes[])
        );
        (bytes32 hashed, Message[] memory _messages, uint256 timestamp) = abi
            .decode(message, (bytes32, Message[], uint256));
        require(
            hashed == keccak256(abi.encode(_messages, timestamp)),
            "Hash doesn't match"
        );
        require(
            _checkSignedHashes(signs, hashed),
            "Hash has not been approved"
        );
        // require(IAnyCallExecutor(messagingInfo.anyCallExecutor).context().from == voteExecutorMaster, "Origin of message invalid");
        require(hashExecutionTime[hashed] == 0, "Duplicate hash");
        execute(_messages);
        executionHistory.push(_data);
        hashExecutionTime[hashed] = block.timestamp;
        if (messagingInfo.nextChain != 0) {
            IAnyCall(messagingInfo.anyCallAddress).anyCall(
                messagingInfo.nextChainExecutor,
                _data,
                address(0),
                messagingInfo.nextChain,
                0
            );
        }
        success = true;
        result = "";
        emit MessageReceived(hashed);
    }

    /// @notice Executes all messages received after authentication
    /// @dev Loops through each command in the array and executes it.
    /// @param _messages Array of messages
    function execute(Message[] memory _messages) internal {
        for (uint256 i; i < _messages.length; i++) {
            Message memory currentMessage = _messages[i];
            if (currentMessage.commandIndex == 0) {
                (
                    string memory ibAlluoSymbol,
                    uint256 newAnnualInterest,
                    uint256 newInterestPerSecond
                ) = abi.decode(
                        currentMessage.commandData,
                        (string, uint256, uint256)
                    );
                _changeAPY(
                    newAnnualInterest,
                    newInterestPerSecond,
                    ibAlluoSymbol
                );
            } else if (currentMessage.commandIndex == 2) {
                // Handle all withdrawals first and then add all deposit actions to an array to be executed afterwards
                (
                    address strategyAddress,
                    uint256 delta,
                    uint256 chainId,
                    address strategyPrimaryToken,
                    address exitToken,
                    bytes memory data
                ) = abi.decode(
                        currentMessage.commandData,
                        (address, uint256, uint256, address, address, bytes)
                    );
                if (chainId == generalBridgingInfo.currentChain) {
                    console.log(
                        "Withdraw strategy",
                        strategyPrimaryToken,
                        delta
                    );
                    console.log(
                        "Balance before",
                        IERC20MetadataUpgradeable(strategyPrimaryToken)
                            .balanceOf(address(this))
                    );
                    IAlluoStrategy(strategyAddress).exitAll(
                        data,
                        delta,
                        strategyPrimaryToken,
                        address(this),
                        false
                    );
                    console.log(
                        "Balance After",
                        IERC20MetadataUpgradeable(strategyPrimaryToken)
                            .balanceOf(address(this))
                    );
                }
            } else if (currentMessage.commandIndex == 3) {
                // Add all deposits to the queue.
                (
                    address strategyAddress,
                    uint256 delta,
                    uint256 chainId,
                    address strategyPrimaryToken,
                    address entryToken,
                    bytes memory data
                ) = abi.decode(
                        currentMessage.commandData,
                        (address, uint256, uint256, address, address, bytes)
                    );
                if (chainId == generalBridgingInfo.currentChain) {
                    console.log("Deposit added", strategyAddress, delta);
                    tokenToDepositQueue[strategyPrimaryToken].depositList.push(
                        Deposit(
                            strategyAddress,
                            delta,
                            strategyPrimaryToken,
                            entryToken,
                            data
                        )
                    );
                }
            }
        }
        // _executeDeposits(true);
    }

    function _executeDeposits() internal {
        for (uint256 i; i < primaryTokens.length(); i++) {
            DepositQueue memory depositQueue = tokenToDepositQueue[
                primaryTokens.at(i)
            ];
            Deposit[] memory depositList = depositQueue.depositList;
            uint256 depositNumber = depositQueue.depositNumber;
            uint256 iters = depositList.length - depositNumber;
            console.log(
                "DEPOSIT NUMBER AND LENGTH",
                depositNumber,
                depositList.length
            );
            for (uint256 j; j < iters; j++) {
                Deposit memory depositInfo = depositList[depositNumber + j];
                address strategyPrimaryToken = depositInfo.strategyPrimaryToken;
                uint256 tokenAmount = depositInfo.amount /
                    10 **
                        (18 -
                            IERC20MetadataUpgradeable(strategyPrimaryToken)
                                .decimals());
                console.log(
                    "Deposit 18 amount",
                    depositInfo.amount,
                    tokenAmount
                );
                if (depositInfo.entryToken != strategyPrimaryToken) {
                    console.log("Before exchanging", tokenAmount);
                    IERC20MetadataUpgradeable(strategyPrimaryToken).approve(
                        exchangeAddress,
                        tokenAmount
                    );
                    tokenAmount = IExchange(exchangeAddress).exchange(
                        strategyPrimaryToken,
                        depositInfo.entryToken,
                        tokenAmount,
                        0
                    );
                    strategyPrimaryToken = depositInfo.entryToken;
                    console.log("After exchanging", tokenAmount);
                }

                IERC20MetadataUpgradeable(strategyPrimaryToken).safeTransfer(
                    depositInfo.strategyAddress,
                    tokenAmount
                );
                IAlluoStrategy(depositInfo.strategyAddress).invest(
                    depositInfo.data,
                    tokenAmount
                );
                tokenToDepositQueue[depositInfo.strategyPrimaryToken]
                    .depositNumber++;
            }
        }
    }

    function incrementDepositNumber(
        address primaryToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenToDepositQueue[primaryToken].depositNumber++;
    }

    // Public can only executeDeposits by bridging funds backwards.
    function executeDeposits() public {
        _executeDeposits();
    }

    function _changeAPY(
        uint256 _newAnnualInterest,
        uint256 _newInterestPerSecond,
        string memory _ibAlluoSymbol
    ) internal {
        ibAlluoSymbolToAddress[_ibAlluoSymbol].setInterest(
            _newAnnualInterest,
            _newInterestPerSecond
        );
    }

    function _bridgeFunds() internal {
        // primaryTokens = eth, usd, eur
        for (uint256 i; i < primaryTokens.length(); i++) {
            address primaryToken = primaryTokens.at(i);
            uint256 tokenBalance = IERC20MetadataUpgradeable(primaryToken)
                .balanceOf(address(this));
            DepositQueue memory currentDepositQueue = tokenToDepositQueue[
                primaryToken
            ];
            TokenBridging memory currentBridgingInfo = tokenToBridgingInfo[
                primaryToken
            ];
            if (
                currentDepositQueue.depositList.length ==
                currentDepositQueue.depositNumber &&
                currentBridgingInfo.minimumAmount <= tokenBalance
            ) {
                IERC20MetadataUpgradeable(primaryToken).approve(
                    currentBridgingInfo.multichainRouter,
                    tokenBalance
                );
                bytes memory data = abi.encodeWithSelector(
                    currentBridgingInfo.functionSignature,
                    tokenToAnyToken[primaryToken],
                    generalBridgingInfo.nextChainExecutor,
                    tokenBalance,
                    generalBridgingInfo.nextChain
                );

                currentBridgingInfo.multichainRouter.functionCall(data);
            }
        }
    }

    function bridgeFunds() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _bridgeFunds();
    }

    /// @notice Checks the array of signatures from L1 for authentication
    /// @dev Grabs list of approved multisig signers and loops through eth_sign recovery and returns true if it exceeds minimum signs.
    /// @param _signs Array of signatures sent from L1
    /// @param _hashed The hash of the data from L1
    /// @return bool
    function _checkSignedHashes(
        bytes[] memory _signs,
        bytes32 _hashed
    ) internal view returns (bool) {
        address[] memory owners = IGnosis(gnosis).getOwners();
        address[] memory uniqueSigners = new address[](owners.length);
        uint256 numberOfSigns;
        for (uint256 i; i < _signs.length; i++) {
            for (uint256 j; j < owners.length; j++) {
                if (
                    _verify(_hashed, _signs[i], owners[j]) &&
                    _checkUniqueSignature(uniqueSigners, owners[j])
                ) {
                    uniqueSigners[numberOfSigns] = owners[j];
                    numberOfSigns++;
                    break;
                }
            }
        }
        return numberOfSigns >= minSigns ? true : false;
    }

    function _checkUniqueSignature(
        address[] memory _uniqueSigners,
        address _signer
    ) public pure returns (bool) {
        for (uint256 k; k < _uniqueSigners.length; k++) {
            if (_uniqueSigners[k] == _signer) {
                return false;
            }
        }
        return true;
    }

    /// Helper functions

    function setTokenBridgingInfo(
        address _tokenAddress,
        bytes4 _selector,
        address _router,
        uint256 _minimumAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenToBridgingInfo[_tokenAddress].functionSignature = _selector;
        tokenToBridgingInfo[_tokenAddress].multichainRouter = _router;
        tokenToBridgingInfo[_tokenAddress].minimumAmount = _minimumAmount;
    }

    /**
     * @notice Set the address of the multisig.
     * @param _gnosisAddress
     **/
    function setGnosis(
        address _gnosisAddress
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosis = _gnosisAddress;
    }

    /// @notice Sets the minimum required signatures before data is accepted on L2.
    /// @param _minSigns New value
    function setMinSigns(
        uint256 _minSigns
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        minSigns = _minSigns;
    }

    /// @notice Updates all the ibAlluo addresses used when setting APY
    function updateAllIbAlluoAddresses() public {
        address[] memory ibAlluoAddressList = handler.getListOfIbAlluos();
        for (uint256 i; i < ibAlluoAddressList.length; i++) {
            IIbAlluo ibAlluo = IIbAlluo(ibAlluoAddressList[i]);
            ibAlluoSymbolToAddress[ibAlluo.symbol()] = IIbAlluo(
                ibAlluoAddressList[i]
            );
        }
    }

    /// @notice Updates specific ibAlluo addresses for symbols when setting APY
    /// @param _ibAlluoAddress Address of the ibAlluo you want to add to the mapping
    function updateSpecificIbAlluoAddress(address _ibAlluoAddress) public {
        IIbAlluo ibAlluo = IIbAlluo(_ibAlluoAddress);
        ibAlluoSymbolToAddress[ibAlluo.symbol()] = ibAlluo;
    }

    function setExchangeAddress(
        address _newExchange
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        exchangeAddress = _newExchange;
    }

    function setLiquidityDirection(
        string memory _codeName,
        address _strategyAddress,
        uint256 _chainId,
        bytes memory _entryData,
        bytes memory _exitData
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        liquidityDirection[_codeName] = LiquidityDirection(
            _strategyAddress,
            _chainId,
            _entryData,
            _exitData
        );
    }

    function addPrimaryToken(
        address _token
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        primaryTokens.add(_token);
    }

    function removePrimaryToken(
        address _token
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        primaryTokens.remove(_token);
    }

    // Helper to simulate L1 Encoding
    /// @notice Simulates what gnosis is doing when calling VoteExecutorMaster
    /// @dev Loops through and just forms the bytes encoded data that VoteExecutorSlave takes as inputs.
    /// @param _hashed Keccak256 Hash of the array of messages we are sending as payload
    /// @param _messages Array of messages encoded with encodemessages()
    /// @return data Bytes encoded data that is used as the payload through anyCall
    function encodeData(
        bytes32 _hashed,
        Message[] memory _messages
    ) public pure returns (bytes memory data) {
        data = abi.encode(_hashed, _messages);
    }

    function currentDepositsInQueue(
        address _primaryToken
    ) public view returns (Deposit[] memory) {
        Deposit[] memory list = tokenToDepositQueue[_primaryToken].depositList;
        uint256 currentIndex = tokenToDepositQueue[_primaryToken].depositNumber;
        Deposit[] memory depositsInQueue = new Deposit[](
            list.length - currentIndex
        );
        for (uint256 i; i < list.length - currentIndex; i++) {
            depositsInQueue[i] = list[currentIndex + i];
        }
        return depositsInQueue;
    }

    // Helper to simulate L1 Encoding
    /// @notice Simulates what gnosis is doing when calling VoteExecutorMaster to encode messages
    /// @dev Loops through and just forms the bytes encoded data that VoteExecutorSlave takes as inputs.
    /// @param _commandIndexes Array of action names ("changeAPY");
    /// @param _messages "actions" that are abi.encoded.
    /// @return messagesHash Keccak256 hashed messages used to sign.
    /// @return messages Struct form to input into encodeData

    function encodeAllMessages(
        uint256[] memory _commandIndexes,
        bytes[] memory _messages
    )
        public
        view
        returns (
            bytes32 messagesHash,
            Message[] memory messages,
            bytes memory inputData
        )
    {
        uint256 timestamp = block.timestamp;
        require(
            _commandIndexes.length == _messages.length,
            "Array length mismatch"
        );
        messages = new Message[](_commandIndexes.length);
        for (uint256 i; i < _commandIndexes.length; i++) {
            messages[i] = Message(_commandIndexes[i], _messages[i]);
        }
        messagesHash = keccak256(abi.encode(messages, timestamp));
        inputData = abi.encode(messagesHash, messages, timestamp);
    }

    function encodeApyCommand(
        string memory _ibAlluoName,
        uint256 _newAnnualInterest,
        uint256 _newInterestPerSecond
    ) public pure returns (uint256, bytes memory) {
        bytes memory encodedComand = abi.encode(
            _ibAlluoName,
            _newAnnualInterest,
            _newInterestPerSecond
        );
        return (0, encodedComand);
    }

    function encodeLiquidityCommand(
        string memory _codeName,
        address _strategyPrimaryToken,
        address _entryToken,
        uint256 _delta,
        bool _isDeposit
    ) public view returns (uint256, bytes memory) {
        LiquidityDirection memory direction = liquidityDirection[_codeName];
        if (!_isDeposit) {
            return (
                2,
                abi.encode(
                    direction.strategyAddress,
                    _delta,
                    direction.chainId,
                    _strategyPrimaryToken,
                    _entryToken,
                    direction.exitData
                )
            );
        } else {
            return (
                3,
                abi.encode(
                    direction.strategyAddress,
                    _delta,
                    direction.chainId,
                    _strategyPrimaryToken,
                    _entryToken,
                    direction.entryData
                )
            );
        }
    }

    function decodeLiquidityCommand(
        bytes memory _data
    ) public pure returns (address, uint256, uint256, address, bytes memory) {
        return abi.decode(_data, (address, uint256, uint256, address, bytes));
    }

    function _verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) internal pure returns (bool) {
        return data.toEthSignedMessageHash().recover(signature) == account;
    }

    /// Admin functions
    function setVoteExecutorMaster(
        address _newVoteExecutorMaster
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        voteExecutorMaster = _newVoteExecutorMaster;
    }

    function setAnyCallAddresses(
        address _newProxyAddress,
        address _newExecutorAddress
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        anyCallAddress = _newProxyAddress;
        anyCallExecutorAddress = _newExecutorAddress;
    }

    function setBridgingInfo(
        address _nextChainExecutor,
        uint256 _currentChain,
        uint256 _nextChain
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        generalBridgingInfo = GeneralBridging(
            _currentChain,
            _nextChainExecutor,
            _nextChain
        );
    }

    function setMessagingInfo(
        address _anyCallAddress,
        address _anyCallExecutor,
        address _nextChainExecutor,
        uint256 _nextChain,
        address _previousChainExecutor
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        messagingInfo = CrossChainMessaging(
            _anyCallAddress,
            _anyCallExecutor,
            _nextChainExecutor,
            _nextChain,
            _previousChainExecutor
        );
    }

    function setTokenToAnyToken(
        address _token,
        address _anyToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenToAnyToken[_token] = _anyToken;
    }

    function grantRole(
        bytes32 role,
        address account
    ) public override onlyRole(getRoleAdmin(role)) {
        // if (role == DEFAULT_ADMIN_ROLE) {
        //     require(account.isContract());
        // }
        _grantRole(role, account);
    }

    function changeUpgradeStatus(
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        require(upgradeStatus);
        upgradeStatus = false;
    }

    function multicall(
        address[] calldata destinations,
        bytes[] calldata calldatas
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = destinations.length;
        for (uint256 i = 0; i < length; i++) {
            destinations[i].functionCall(calldatas[i]);
        }
    }
}

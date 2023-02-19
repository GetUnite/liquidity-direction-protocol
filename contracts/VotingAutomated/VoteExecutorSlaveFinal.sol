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
import "../interfaces/IPriceFeedRouterV2.sol";

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

contract VoteExecutorSlaveFinal is
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
    address public voteExecutorMaster;
    bytes[] public executionHistory;

    // Anycall V6 Fantom Address
    address public anyCallAddress;
    address public anyCallExecutorAddress;

    ILiquidityHandler public handler;
    address public gnosis;
    uint256 public minSigns;

    uint256 public currentChain;

    uint256 public nextChain;
    address public nextChainExecutor;
    uint256 public previousChain;
    address public previousChainExecutor;

    mapping(string => IIbAlluo) public ibAlluoSymbolToAddress;

    mapping(bytes32 => uint256) public hashExecutionTime;

    struct Entry {
        uint256 directionId;
        uint256 percent;
    }

    Entry[] public entries;

    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    struct APYData {
        uint256 newAnnualInterest;
        uint256 newInterestPerSecond;
        string ibAlluo;
    }

    address public priceFeedRouter;
    uint64 public primaryTokenIndex;
    uint256 public fiatIndex;

    event MessageReceived(bytes32 indexed messagesHash);

    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant IBALLUO =
        0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6;
    uint256 public constant MULTIPLIER = 10**18;
    Message[] public messagess;

    function initialize(
        address _multiSigWallet,
        address _handlerAddress
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        anyCallAddress = 0xD7c295E399CA928A3a14b01D760E794f1AdF8990;
        anyCallExecutorAddress = 0xe3aee52608Db94F2691a7F9Aba30235B14B7Bb70;
        handler = ILiquidityHandler(_handlerAddress);
        gnosis = _multiSigWallet;
        minSigns = 1;
        require(_multiSigWallet.isContract(), "Handler: Not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
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
        require(
            IAnyCallExecutor(anyCallExecutorAddress).context().from ==
                voteExecutorMaster,
            "Origin of message invalid"
        );
        require(
            hashExecutionTime[hashed] == 0 ||
                block.timestamp >= hashExecutionTime[hashed] + 1 days,
            "Duplicate hash"
        );
        delete entries;
        execute(_messages);
        executionHistory.push(_data);
        hashExecutionTime[hashed] = block.timestamp;
        if (nextChain != 0) {
            IAnyCall(anyCallAddress).anyCall(
                nextChainExecutor,
                _data,
                address(0),
                nextChain,
                0
            );
        }
        success = true;
        result = "";
        emit MessageReceived(hashed);
    }

    function messageExecute(
        Message[] memory messages
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        execute(messages);
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
                (uint256 directionId, uint256 percent) = abi.decode(
                    currentMessage.commandData,
                    (uint256, uint256)
                );
                if (percent != 0) {
                    Entry memory e = Entry(directionId, percent);
                    entries.push(e);
                }
            } else if (currentMessage.commandIndex == 3) {
                int256 treasuryDelta = abi.decode(
                    currentMessage.commandData,
                    (int256)
                );

                (uint256 fiatPrice, uint8 fiatDecimals) = IPriceFeedRouterV2(
                    priceFeedRouter
                ).getPrice(USDC, fiatIndex);
                uint256 growingRatio = IIbAlluo(IBALLUO).growingRatio();
                if (treasuryDelta < 0) {
                    uint256 exactAmount = (uint256(-treasuryDelta) *
                        10 ** fiatDecimals) / fiatPrice;
                    IIbAlluo(IBALLUO).burn(
                        gnosis,
                        (exactAmount * MULTIPLIER) / growingRatio
                    );
                } else if (treasuryDelta > 0) {
                    uint256 exactAmount = (uint256(treasuryDelta) *
                        10 ** fiatDecimals) / fiatPrice;
                    IIbAlluo(IBALLUO).mint(
                        gnosis,
                        (exactAmount * MULTIPLIER) / growingRatio
                    );
                }
            }
        }
    }

    function getEntries()
        external
        view
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (uint256[] memory, uint256[] memory)
    {
        uint256[] memory drctId = new uint256[](entries.length);
        uint256[] memory pct = new uint256[](entries.length);
        for (uint256 i; i < entries.length; i++) {
            Entry memory e = entries[i];
            drctId[i] = e.directionId;
            pct[i] = e.percent;
        }
        return (drctId, pct);
    }

    function setEntries(
        Entry[] memory _entries
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        delete entries;
        for (uint256 i; i < _entries.length; i++) {
            entries.push(_entries[i]);
        }
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

    function _verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) internal pure returns (bool) {
        return data.toEthSignedMessageHash().recover(signature) == account;
    }

    /// Admin functions
    function setAnyCallAddresses(
        address _newProxyAddress,
        address _newExecutorAddress
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        anyCallAddress = _newProxyAddress;
        anyCallExecutorAddress = _newExecutorAddress;
    }

    function setVoteExecutorMaster(
        address _newAddress
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        voteExecutorMaster = _newAddress;
    }

    function setPriceRouterInfo(
        address _priceFeedRouter,
        uint256 _fiatIndex
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceFeedRouter = _priceFeedRouter;
        fiatIndex = _fiatIndex;
    }

    function grantRole(
        bytes32 role,
        address account
    ) public override onlyRole(getRoleAdmin(role)) {
        if (role == DEFAULT_ADMIN_ROLE) {
            require(account.isContract(), "Handler: Not contract");
        }
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
        require(upgradeStatus, "Handler: Upgrade not allowed");
        upgradeStatus = false;
    }
}

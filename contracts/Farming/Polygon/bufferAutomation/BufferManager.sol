//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../../../interfaces/ILiquidityHandler.sol";
import "../../../interfaces/IHandlerAdapter.sol";


contract BufferManager is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable 
    { 
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bool public upgradeStatus;
   
    // address of the anycall contract on polygon
    address public anycall;
    // adress of the Across bridge contract to initiate the swap
    address public spokepool;
    uint256 public epochDuration;
    address public gnosis;
    // address of the DepositDistributor on mainnet
    address public distributor;
    
    uint256 public minBridgeAmount;
    uint256 public lastExecuted;
    uint256 public bridgeInterval;

    bytes32 constant public UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant public GELATO = keccak256("GELATO");
    bytes32 constant public SWAPPER = keccak256("SWAPPER");

    ILiquidityHandler public handler;

    mapping(address => Epoch[]) public ibAlluoToEpoch;
    mapping(address => address) public ibAlluoToAdapter;
    mapping(address => uint256) public ibAlluoToMaxRefillPerEpoch;
    mapping(address => address) public ibAlluoToToken;
    mapping(address => address) public tokenToEth;

    EnumerableSetUpgradeable.AddressSet private activeIbAlluos;

    struct Epoch {
        uint256 startTime;
        uint256 refilledPerEpoch;
    }
     
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}
    
    /**
    * @dev 
    * param _epochDuration Value for refill function to work properly
    * param _bridgeGenesis Unix timestamp declaring a starting point for counter
    * param _bridgeInterval Min time to pass between bridging (UNIX timestamp)
    * param _minBridgeAmount Min amount of asset to allow bridging
    * param _gnosis Gnosis Multisig
    * param _gelato Gelato executor address
    * param _spokepool Address of the SpokePool Polygon contract of Accross Protocol Bridge
    * param _anycall Address of the Multichain Anycall contract
    * param _distributor Address of the DepositDistritor contract on mainnet, which receives the bridged funds
    */
    function initialize(
        uint256 _epochDuration,
        uint256 _brigeGenesis,
        uint256 _bridgeInterval,
        uint256 _minBridgeAmount,
        address _gnosis,
        address _gelato,
        address _spokepool,
        address _anycall,
        address _distributor
    ) public initializer {
       
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        epochDuration = _epochDuration;
        distributor = _distributor;
        lastExecuted = _brigeGenesis;
        bridgeInterval = _bridgeInterval;
        minBridgeAmount = _minBridgeAmount;

        spokepool = _spokepool;
        anycall = _anycall;

        _grantRole(DEFAULT_ADMIN_ROLE, _gnosis);
        _grantRole(UPGRADER_ROLE, _gnosis);
        _grantRole(GELATO, _gelato);
        _grantRole(SWAPPER, _gelato);
        _grantRole(SWAPPER, _gnosis);
    }

    /** 
    * @notice Initiates transfer only if adapter is filled, there are no queued withdrawals and 
    * balance of this contract exceeds the minimum required mark
    * @dev Function checker for gelato, after the balance crosses the threshold initates the swap function
    * @dev Checks minimumBridging amout, attempts to reffil the adapters
    * @return canExec Bool, if true - initiates the call by gelato
    * @return execPayLoad Data to be called by gelato
    */
    function checker() 
        external
        view
        returns(bool canExec, bytes memory execPayLoad) 
    {
        bool canExec;
        bytes memory execPayload;

        for(uint256 i; i < activeIbAlluos.length(); i++) {
            address iballuo = activeIbAlluos.at(i); 
            uint256 amount = IERC20Upgradeable(ibAlluoToToken[iballuo]).balanceOf(address(this));
            if(!isAdapterPendingWithdrawal(iballuo)) {
                if(amount >= minBridgeAmount * 10 ** IERC20MetadataUpgradeable(ibAlluoToToken[iballuo]).decimals() &&
                    block.timestamp >= lastExecuted + bridgeInterval) {
                        canExec = true;
                        address originToken = ibAlluoToToken[iballuo];
                        execPayload = abi.encodeWithSelector(
                        BufferManager.swap.selector,
                        amount * 10 ** IERC20MetadataUpgradeable(ibAlluoToToken[iballuo]).decimals(),
                        originToken,
                        // !!!change after mumbai testing
                        5 * 10 ** 16,
                        iballuo
                        );

                    break; 
                }
            } else if (adapterRequiredRefill(iballuo) > 0 &&
                    adapterRequiredRefill(iballuo) < amount) {
                    canExec = true;
                    execPayload = abi.encodeWithSelector(
                    BufferManager.refillBuffer.selector,
                    iballuo
                    );

                break;
            }
        }
        return (canExec, execPayload);
    }

    /**
    * @notice Function is called by gelato resolver,when checker flags it. Can only be called by
    * either Gelato or Multisig, in order to prevent malicious actions
    * @dev Bridges assets using Across Bridge and info about the amounts using Multichain AnyCallV6
    * @param amount Amount of the funds to be transferred
    * @param relayerFeePct Fee percantage for relayers on Across bridge side
    */
    function swap(uint256 amount, address originToken, uint64 relayerFeePct, address iballuo) external onlyRole(SWAPPER) {
        require(amount >= 700 * 10 ** IERC20MetadataUpgradeable(ibAlluoToToken[iballuo]).decimals(), "Swap: <minAmount!");
        require(block.timestamp >= lastExecuted + bridgeInterval, "Swap: <minInterval!");
        
        IERC20Upgradeable(originToken).approve(spokepool, amount);
        lastExecuted = block.timestamp;   
        ISpokePool(spokepool).deposit(distributor, originToken, amount, 1, relayerFeePct, uint32(block.timestamp));
        address tokenEth = tokenToEth[originToken];
        CallProxy(anycall).anyCall(
            // address of the collector contraact on mainnet
            distributor,
            abi.encode(
                tokenEth,
                amount
            ),
            address(0),
            1,
            // 0 flag to pay fee on destination chain
            0
            );   
    }
    
    /**
    * @dev Function serves as a leverage in case a swap gets stuck. Only called manually by multisig.
    * @param newRelayerFeePct Relayer fee Pct to be updated
    * @param depositId ID of the deposit to be sped up, needs to be accessed from the event emitted by
    * the swap call
    * @param depositorSignature Signed message containing the depositor address, this contract chain ID, the updated
    * relayer fee %, and the deposit ID. This signature is produced by signing a hash of data according to the
    * EIP-1271 standard.
    */
    function speedUp(uint64 newRelayerFeePct, uint32 depositId, bytes memory depositorSignature) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ISpokePool(spokepool).speedUpDeposit(
            address(this),
            newRelayerFeePct,
            depositId,
            depositorSignature
        );
    }
    
    /**
    * @dev Function checks if IBAlluos respective adapter has queued withdrawals
    * @param ibAlluo Address of the IBAlluo pool 
    * @return True if there is a pending withdrawal on correspoding to an IBAlluo pool adapter
    */
    function isAdapterPendingWithdrawal(address ibAlluo) public view returns (bool) {
        (,,uint256 totalWithdrawalAmount,) = handler.ibAlluoToWithdrawalSystems(ibAlluo);
        if (totalWithdrawalAmount > 0) {
            return true;
        } 
        return false;
    }
    
    /**
    * @notice Function checks the amount of asset that needs to be transferred for an adapter to be filled
    * @param _ibAlluo Address of an IBAlluo contract, which corresponding adapter is to be filled
    */
    function adapterRequiredRefill(address _ibAlluo) public view returns (uint256) {
        uint256 expectedAmount = handler.getExpectedAdapterAmount(_ibAlluo, 0);
        uint256 actualAmount = handler.getAdapterAmount(_ibAlluo);
        if (actualAmount < expectedAmount) {
            // Think of case if someone tries to break it by sending extra tokens to the buffer directly
            uint256 difference = expectedAmount - actualAmount;
            if (difference * 10000 / expectedAmount > 500) {
                return difference;
            }
        } else {
            return 0; 
        }
    }
    
    function _confirmEpoch(address _ibAlluo) internal returns (Epoch storage) {
        Epoch[] storage relevantEpochs = ibAlluoToEpoch[_ibAlluo];
        Epoch storage lastEpoch = relevantEpochs[relevantEpochs.length - 1];
        uint256 deadline = lastEpoch.startTime + epochDuration;
        if (block.timestamp > deadline) {
            uint256 cycles = (block.timestamp - deadline) / epochDuration;
            uint256 newStartTime = lastEpoch.startTime + (cycles * epochDuration);
            Epoch memory newEpoch = Epoch(newStartTime, 0);
            ibAlluoToEpoch[_ibAlluo].push(newEpoch);
        } 
        // This should work because we are pointing at a specific memory slot.
        Epoch storage finalEpoch = relevantEpochs[relevantEpochs.length - 1];
        return finalEpoch;
    }


    /**
    * @dev
    */
    function refillBuffer(address _ibAlluo) external onlyRole(GELATO) returns (bool) {
        uint256 refillAmount = adapterRequiredRefill(_ibAlluo);
        address adapterAddress = ibAlluoToAdapter[_ibAlluo];
        (address bufferToken,) = IHandlerAdapter(adapterAddress).getCoreTokens();
        Epoch storage currentEpoch = _confirmEpoch(_ibAlluo);
        require(ibAlluoToMaxRefillPerEpoch[_ibAlluo] >= currentEpoch.refilledPerEpoch + refillAmount, "Cumulative refills exceeds limit");
        require(refillAmount > 0, "No refill required");
        currentEpoch.refilledPerEpoch += refillAmount;
        IERC20Upgradeable(bufferToken).transfer(adapterAddress, refillAmount);
        if (isAdapterPendingWithdrawal(_ibAlluo)) {
            handler.satisfyAdapterWithdrawals(_ibAlluo);
            return true;
        }
        return false;
    }
    
    /**
    * @notice Initialize function faces stack too deep error, due to too many arguments
    * @param _activeIbAlluos Array of IBAlluo contract supported for bridging
    * @param _ibAlluoAdapters Array of corresponding Adapters
    * @param _ibAlluoTokens Tokens to be support for each of the adapters
    * @param _tokensEth Addresses of the same tokens on mainnet
    * @param _maxRefillPerEpoch Max value of asset for an adapter to be filled in span of a predefined interval
    */
    function initializeValues (
        address _handler,
        address[] memory _activeIbAlluos,
        address[] memory _ibAlluoAdapters,
        address[] memory _ibAlluoTokens,
        address[] memory _tokensEth,
        uint256[] memory _maxRefillPerEpoch,
        uint256 _epochDuration) public onlyRole(DEFAULT_ADMIN_ROLE) {
            handler = ILiquidityHandler(_handler);
            for (uint256 i; i < _activeIbAlluos.length; i++) {
                activeIbAlluos.add(_activeIbAlluos[i]);
                ibAlluoToAdapter[_activeIbAlluos[i]] = _ibAlluoAdapters[i];
                ibAlluoToToken[_activeIbAlluos[i]] = _ibAlluoTokens[i];
                tokenToEth[_activeIbAlluos[i]] = _tokensEth[i];
                ibAlluoToMaxRefillPerEpoch[_activeIbAlluos[i]] = _maxRefillPerEpoch[i];
                epochDuration = _epochDuration;

                Epoch memory newEpoch = Epoch(_epochDuration, 0);
                ibAlluoToEpoch[_activeIbAlluos[i]].push(newEpoch);
        }
    }
    
    /* ========== ADMIN CONFIGURATION ========== */

    function changeBridgeSettings(uint256 _minBridgeAmount, uint256 _bridgeInterval) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minBridgeAmount = _minBridgeAmount;
        bridgeInterval = _bridgeInterval;
    }

    function setMaxRefillPerEpoch(address _ibAlluo, uint256 _maxRefillPerEpoch) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToMaxRefillPerEpoch[_ibAlluo] = _maxRefillPerEpoch;
    }

    function setEpochDuration(uint256 _epochDuration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        epochDuration = _epochDuration;
    }

    /**
    * @notice Function is called by gnosis
    * @dev Adds IBAlluo pool to the list of active pools
    * @param ibAlluo Address of the IBAlluo pool to be added
    */
    function addIBAlluoPool(address ibAlluo, address adapter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!activeIbAlluos.contains(ibAlluo), "Already active");

        activeIbAlluos.add(ibAlluo);
        ibAlluoToAdapter[ibAlluo] = adapter;
    }
    
    /**
    * @notice Funtion is called by gnosis
    * @dev Removes IBAlluo pool from the list of active pools
    * @param ibAlluo Address of the IBAlluo pool to be removed
    */
    function removeIBAlluoPool(address ibAlluo) external onlyRole(DEFAULT_ADMIN_ROLE) returns(bool) {
        bool removed;
        for(uint256 i=0; i< activeIbAlluos.length(); i++) {
            if(activeIbAlluos.at(i) == ibAlluo) {
                activeIbAlluos.remove(activeIbAlluos.at(i));
                ibAlluoToAdapter[ibAlluo] = address(0);
                removed = true;
            } 
        }
        return removed;
    }
    
    function changeUpgradeStatus(bool _status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        require(upgradeStatus, "Manager: Upgrade not allowed");
        upgradeStatus = false;
    }
}

interface CallProxy {
    function anyCall(
        address _to,
        bytes calldata _data,
        address _fallback,
        uint256 _toChainID,
        uint256 _flags
    ) external;
}

interface ISpokePool {
    function deposit(
        address recipient,
        address originToken,
        uint256 amount,
        uint256 destinationChainId,
        uint64 relayerFeePct,
        uint32 quoteTimestamp
    ) external payable;

    function speedUpDeposit(
        address depositor,
        uint64 newRelayerFeePct,
        uint32 depositId,
        bytes memory depositorSignature
    ) external;
}
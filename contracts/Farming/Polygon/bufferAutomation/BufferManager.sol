//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
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
    address public anycall = 0xC10Ef9F491C9B59f936957026020C321651ac078;
    address public gelato;
    // adress of the Across bridge contract to initiate the swap
    address public spokepool;
    uint256 public epochDuration;
    address public gnosis;
    // address of the Distributor on mainnet
    address public distributor;
    // address of the Liquidity Handler
    ILiquidityHandler public handler; 

    bytes32 public constant SWAPPER = keccak256("SWAPPER");
    bytes32 constant public UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant public GELATO = keccak256("GELATO");

    ILiquidityHandler constant public handler = ILiquidityHandler(address(0));

    mapping(address => Epoch[]) public ibAlluoToEpoch;
    mapping(address => address) public ibAlluoToAdapter;
    mapping(address => uint256) public ibAlluoToMaxRefillPerEpoch;
    mapping(address => address) public ibAlluoToToken;
    mapping(address => address) public ibAlluoToEth;

    EnumerableSetUpgradeable.AddressSet private activeIbAlluos;

    
    struct Epoch {
        uint256 startTime;
        uint256 refilledPerEpoch;
    }

    struct BridgeInfo { 
        uint256 minBridgeAmount;
        uint256 lastBridged;
        uint256 bridgeInterval;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        uint256 _epochDuration,
        uint256 _brigeGenesis,
        uint256 _bridgeInterval,
        uint256 _minBridgeAmount,
        address _gnosis,
        address _gelato,
        address _spokepool,
        address _distributor,
        address[] memory _activeIbAlluos,
        address[] memory _ibAlluoAdapters,
        address[] memory _ibAlluoTokens,
        address[] memory _tokensEth,
        uint256[] memory _maxRefillPerEpoch
    ) public initializer {
       
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        epochDuration = _epochDuration;
        spokepool = _spokepool;
        distributor = _distributor;
        BridgeInfo.lastBridged = _brigeGenesis;
        BridgeInfo.bridgeInterval = _bridgeInterval;
        BridgeInfo.minBridgeAmount = _minBridgeAmount;

        for (uint256 i; i < _activeIbAlluos.length; i++) {
            activeIbAlluos.add(_activeIbAlluos[i]);
            ibAlluoToAdapter[_activeIbAlluos[i]] = _ibAlluoAdapters[i];
            ibAlluoToToken[_activeIbAlluos[i]] = _ibAlluoTokens[i];
            ibAlluoToEth[_activeIbAlluos[i]] = _tokensEth[i];
            ibAlluoToMaxRefillPerEpoch[_activeIbAlluos[i]] = _maxRefillPerEpoch[i];
        }

        _grantRole(DEFAULT_ADMIN_ROLE, _gnosis);
        _grantRole(UPGRADER_ROLE, _gnosis);
        _grantRole(GELATO, _gelato);
    }

    /** 
    * @notice Initiates transfer only if adapter is filled, there are no queued withdrawals and 
    * balance of this contract exceeds the minimum required mark
    * @dev Function checker for gelato, after the balance crosses the threshold initates the swap function
    * @return canExec Bool, if true - initiates the call by gelato
    * @return execPayLoad Data to be called by gelato
    */
    function checker() 
        external
        view
        returns(bool canExec, bytes memory execPayLoad) 
    {
        bytes memory execPayload;

        for(uint256 i = 0; i < activeIbAlluos.length; i++) {
            address iballuo = activeIbAlluos[i];
            uint256 amount = IERC20(IBAlluoToToken[iballuo]).balanceOf(address(this));
            if(!isAdapterPendingWithdrawal(iballuo)) {
                if(handler.getAdapterAmount(iballuo) >= handler.getExpectedAdapterAmount() &&
                // test math: min 700 usd
                   amount >= minBridgeAmount * 10 ** IERC20MetaData(IBAlluoToToken[iballuo]).decimals &&
                   block.timestamp >= BridgeInfo.lastBridged + BridgeInfo.interval) {
                        // set actual math
                        canExec = true;
                        execPayload = abi.encodeWithSelector(
                        swap.selector,
                        amount,
                        2 * 10 ** 18,
                        iballuo
                    );

                break; 
                }
            } else {
                canExec = true;
                execPayload = abi.encodeWithSelector(
                refillBuffer.selector,
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
    function swap(uint amount, uint64 relayerFeePct, iballuo) public {
        require(amount >= 700 * 10 ** IERC20MetaData(IBAlluoToToken[iballuo]).decimals, "Swap: <minAmount!");
        require(block.timestamp >= BridgeInfo.lastBridged + BridgeInfo.interval, "Swap: <minInterval!");

        IERC20(USDC).approve(spokepool, amount);   
        ISpokePool(USDC).deposit(collector, USDC, amount, 1, relayerFeePct, uint32(block.timestamp));
        address iballuo = tokenToInfo[originToken].iballuo;
        CallProxy(ANYCALLPOLYGON).anyCall(
            // address of the collector contraact on mainnet
            collector,
            abi.encode(
                ibAlluoToEth[iballuo],
                amount
            ),
            address(0),
            1,
            // 0 flag to pay fee on destination chain
            0
            );   
    }
    
    /**
    * @dev Function serves as a leverage in case a swap gets stuck
    */
    // function speedUp() external onlyRole(DEFAULT_ADMIN_ROLE) {

    // }
    /**
    * @dev Function checks if IBAlluos respective adapter has queued withdrawals
    * @param ibAlluo Address of the IBAlluo pool 
    * @return True if there is a pending withdrawal on correspoding to an IBAlluo pool adapter
    */
    function isAdapterPendingWithdrawal(address ibAlluo) public view returns (bool) {
        (,,uint256 totalWithdrawalAmount,) = liquidityHandler.ibAlluoToWithdrawalSystems(ibAlluo);
        if (totalWithdrawalAmount > 0) {
            return true;
        } 
        return false;
    }

    function adapterRequiredRefill(address _ibAlluo) public view returns (uint256) {
        uint256 expectedAmount = handler.getExpectedAdapterAmount(_ibAlluo, 0);
        uint256 actualAmount = handler.getAdapterAmount(_ibAlluo);
        // Think of case if someone tries to break it by sending extra tokens to the buffer directly
        uint256 difference = expectedAmount - actualAmount;
        if (difference * 10000 / expectedAmount > 500) {
            return difference;
        }
        return 0;
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
    function refillBuffer(address _ibAlluo) public onlyRole(GELATO) returns (bool) {
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

    function loopRefill() public onlyRole(GELATO) returns (bool) {
        for (uint256 i; i < activeIbAlluos.length(); i++) {
            refillBuffer(activeIbAlluos.at(i));
        }
        return true;
    }
    
    /**
    * @notice Function is called by gnos
    * @dev Adds IBAlluo pool to the list of active pools
    * @param ibAlluo Address of the IBAlluo pool to be added
    */
    function addIBAlluoPool(address ibAlluo) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IBAlluoToBridge.push(ibAlluo);
    }
    
    /**
    * @notice Funtion is called by gnosis
    * @dev Removes IBAlluo pool from the list of active pools
    * @param ibAlluo Address of the IBAlluo pool to be removed
    */
    function removeIBAlluoPool(address ibAlluo) external onlyRole(DEFAULT_ADMIN_ROLE) returns(bool) {
        bool removed;
        for(uint256 i=0; i<IBAlluoToBridge.length; i++) {
            if(IBAlluoToBridge[i] == ibAlluo) {
                delete IBAlluoToBridge[i];
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
}
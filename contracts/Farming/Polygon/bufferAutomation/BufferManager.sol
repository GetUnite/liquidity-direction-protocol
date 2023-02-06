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

import "../../../interfaces/IPriceFeedRouter.sol";
import "../../../interfaces/ILiquidityHandler.sol";
import "../../../interfaces/IHandlerAdapter.sol";
import "../../../interfaces/IVoteExecutorSlave.sol";
import "../../../interfaces/IIbAlluo.sol";

import {ISpokePool} from "../../../interfaces/ISpokePool.sol";
import {ICallProxy} from "../../../interfaces/ICallProxy.sol";

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

    event Bridge(
        address distributor,
        address originToken,
        address ethToken,
        uint256 amount,
        uint64 relayerFeePct,
        uint256[] directions,
        uint256[] percentage
    );

    bool public upgradeStatus;

    // address of the DepositDistributor on mainnet
    address public distributor;
    address public slave;
    // address of the anycall contract on polygon
    address public anycall;
    // adress of the Across bridge contract to initiate the swap
    address public spokepool;
    // address of the gnosis multisig
    address public gnosis;
    uint256 public epochDuration;
    
    // bridge settings
    uint256 public lastExecuted;
    uint256 public bridgeInterval;
    uint64 public relayerFeePct;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant GELATO = keccak256("GELATO");
    bytes32 public constant SWAPPER = keccak256("SWAPPER");

    // liquidity handler
    ILiquidityHandler public handler;

    mapping(address => Epoch[]) public ibAlluoToEpoch;
    mapping(address => address) public ibAlluoToAdapter;
    mapping(address => uint256) public ibAlluoToMaxRefillPerEpoch;
    mapping(address => address) public tokenToEth;
    mapping(address => uint256) public tokenToMinBridge;

    // EnumerableSet of currently supported IBAlluo
    EnumerableSetUpgradeable.AddressSet private activeIbAlluos;

    // Data used to prevent draining the gnosis by setting a relevant limit to be used
    struct Epoch {
        uint256 startTime;
        uint256 refilledPerEpoch;
    }

    uint256 public bridgeCap;
    // min pct of the deviation from expectedAdapterRefill to trigger the refill (with 2 decimals, e.g. 5% = 500)
    uint256 public refillThreshold; 
    // iballuo to pct to add on top of refills to prevent slippage (5% = 500)
    mapping(address => uint256) public slippageControl;
    mapping(address => uint256) public tokenToMaxBridge;
    EnumerableSetUpgradeable.AddressSet private nonBridgeTokens;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /**
     * @dev
     * param _epochDuration Value for refill function to work properly
     * param _bridgeGenesis Unix timestamp declaring a starting point for counter
     * param _bridgeInterval Min time to pass between bridging (Unix timestamp)
     * param _gnosis Gnosis Multisig
     * param _spokepool Address of the SpokePool Polygon contract of Accross Protocol Bridge
     * param _anycall Address of the Multichain Anycall contract
     * param _distributor Address of the DepositDistritor contract on mainnet, which receives the bridged funds
     */
    function initialize(
        uint256 _epochDuration,
        uint256 _brigeGenesis,
        uint256 _bridgeInterval,
        address _gnosis,
        address _spokepool
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        epochDuration = _epochDuration;
        lastExecuted = _brigeGenesis;
        bridgeInterval = _bridgeInterval;

        spokepool = _spokepool;
        gnosis = _gnosis;

        _grantRole(DEFAULT_ADMIN_ROLE, _gnosis);
        _grantRole(UPGRADER_ROLE, _gnosis);
        _grantRole(GELATO, _gnosis);
        _grantRole(SWAPPER, _gnosis);
    }

    /**
     * @notice Initiates transfer only if adapter is filled, there are no queued withdrawals and
     * balance of this contract exceeds the minimum required mark
     * @dev Function checker for gelato, after the balance crosses the threshold initates the swap function
     * @dev Checks minimumBridging amout, attempts to reffil the adapters
     * @return canExec Bool, if true - initiates the call by gelato
     * @return execPayload Data to be called by gelato
     */
    function checkerBridge()
        external
        view
        returns (bool canExec, bytes memory execPayload)
    {
        for (uint256 i; i < activeIbAlluos.length(); i++) {
            (address iballuo, address token, uint256 amount) = getValues(i);
            uint256 tokenCap = tokenToMaxBridge[token] / 10 * 10 ** (18-IERC20MetadataUpgradeable(token).decimals());
            if (IERC20Upgradeable(token).balanceOf(address(this)) > tokenCap) {
                amount = tokenToMaxBridge[token];
            }
            if (
                adapterRequiredRefill(iballuo) == 0 && canBridge(token, amount)
            ) {
                canExec = true;
                execPayload = abi.encodeWithSelector(
                    BufferManager.swap.selector,
                    amount,
                    token
                );

                break;
            }
        }

        return (canExec, execPayload);
    }

    /**
     * @dev Triggers GELATO to refill buffer
     * @dev Checks buffer balance, balance of the gnosis and compares if he can execute the refill
     * @return canExec bool, serves as a flag for gelato
     * @return execPayload encoded call to refillBuffer with correct values
     */
    function checkerRefill()
        external
        view
        returns (bool canExec, bytes memory execPayload)
    {
        for (uint256 i; i < activeIbAlluos.length(); i++) {
            (address iballuo, address token, ) = getValues(i);
            if (canRefill(iballuo, token) && checkEpoch(iballuo, token)) {
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
     * @notice Function is called by gelato when checker flags it. Can only be called by
     * either Gelato or Multisig
     * @dev Bridges assets using Across Bridge by UMA Protocol (Source: https://across.to/)
     * @dev Bridges data for liquidity direction using Multichain AnyCallV6
     * @param amount Amount of the funds to be transferred
     * @param originToken Address of the token to be bridged
     */
    function swap(
        uint256 amount,
        address originToken
    ) external whenNotPaused onlyRole(SWAPPER) {
        require(
            canBridge(originToken, amount),
            "Buffer: <minAmount or <bridgeInterval"
        );
        lastExecuted = block.timestamp;
        if(!nonBridgeTokens.contains(originToken)){
        IERC20Upgradeable(originToken).approve(spokepool, amount);
        ISpokePool(spokepool).deposit(
            distributor,
            originToken,
            amount,
            1,
            relayerFeePct,
            uint32(block.timestamp)
        );
        address tokenEth = tokenToEth[originToken];
        if(anycall != address(0)) {
            (
            uint256[] memory direction,
            uint256[] memory percentage
            ) = IVoteExecutorSlave(slave).getEntries();
            ICallProxy(anycall).anyCall(
            // address of the collector contract on mainnet
            distributor,
            abi.encode(direction, percentage, tokenEth, amount),
            address(0),
            1,
            // 0 flag to pay fee on destination chain
            0
        );

        emit Bridge(
            distributor,
            originToken,
            tokenEth,
            amount,
            relayerFeePct,
            direction,
            percentage
        );
          }
        } else {
            withdrawGnosis(originToken, amount);
        }
    }

    /**
     * @dev Function checks if IBAlluos respective adapter has queued withdrawals
     * @param _ibAlluo Address of the IBAlluo pool
     * @return isAdapterPendingWithdrawal bool - true if there is a pending withdrawal on correspoding to an IBAlluo pool adapter
     */
    function isAdapterPendingWithdrawal(
        address _ibAlluo
    ) public view returns (bool) {
        (, , uint256 totalWithdrawalAmount, ) = handler
            .ibAlluoToWithdrawalSystems(_ibAlluo);
        if (totalWithdrawalAmount > 0) {
            return true;
        }
        return false;
    }

    /**
     * @notice Function checks the amount of asset that needs to be transferred for an adapter to be filled
     * @notice Liquidity Handler works differently for wbtc/weth and fiat-pegged assets, in first scenario getExpectedAdapteramount
     * and getAdapterAmount return token value in 18 decimals, while 2nd scenario (stablecoins) return their fiat value.
     * Function checks the adapter id and adapts the amount to the 18decimal token value format
     * @param _ibAlluo Address of an IBAlluo contract, which corresponding adapter is to be filled
     * @return requiredRefill Amount to be refilled in token with 18 decimals
     */
    function adapterRequiredRefill(
        address _ibAlluo
    ) public view returns (uint256) {
        uint256 expectedAmount = handler.getExpectedAdapterAmount(_ibAlluo, 0);
        uint256 actualAmount = handler.getAdapterAmount(_ibAlluo);
        (, , uint refillRequested,) = handler.ibAlluoToWithdrawalSystems(_ibAlluo);
        uint256 difference;
        if(refillRequested == 0) {
            return 0;
        }
        uint amountToExpectedAdapter = refillRequested * 10000 / expectedAmount;
        if (amountToExpectedAdapter <= refillThreshold) {
            return 0;
        } else {
            difference = refillRequested + (refillRequested * refillThreshold / 10000);
        }
        uint id = ILiquidityHandler(handler).getAdapterId(_ibAlluo); // id 3 and 4 are weth and wbtc, which must not follow fiat logic
        address priceFeedRouter = IIbAlluo(_ibAlluo).priceFeedRouter();
        if (priceFeedRouter != address(0) && id!=3 && id!=4) {
            address adapter = ibAlluoToAdapter[_ibAlluo];
            address token = IHandlerAdapter(adapter).getCoreTokens();
            (uint256 price, uint8 priceDecimals) = IPriceFeedRouter(
                priceFeedRouter
            ).getPrice(token, IIbAlluo(_ibAlluo).fiatIndex());

            difference = (difference * (10 ** priceDecimals)) / price;
        }
        return difference;
    }

    /**
     * @notice Prevents from draining unrestricted amount of funds from gnosis
     * @dev Function returns relevant refill settings by IBAlluo address
     * @param _ibAlluo address of the IBAlluo
     * @return Epoch struct with settings
     */

    function _confirmEpoch(address _ibAlluo) internal returns (Epoch storage) {
        Epoch[] storage relevantEpochs = ibAlluoToEpoch[_ibAlluo];
        Epoch storage lastEpoch = relevantEpochs[relevantEpochs.length - 1];
        uint256 deadline = lastEpoch.startTime + epochDuration;
        if (block.timestamp > deadline) {
            uint256 cycles = (block.timestamp - deadline) / epochDuration;
            if (cycles != 0) {
                uint256 newStartTime = lastEpoch.startTime +
                    (cycles * epochDuration);
                Epoch memory newEpoch = Epoch(newStartTime, 0);
                ibAlluoToEpoch[_ibAlluo].push(newEpoch);
            }
        }
        Epoch storage finalEpoch = relevantEpochs[relevantEpochs.length - 1];
        return finalEpoch;
    }

    /**
     * @notice adapterRequiredRefill() and deposit() operate with 18 decimals, so balances need to be adjusted
     * @dev Refills corresponding IBAlluo adapter with prior checks and triggers executing queued withdrawals on the adapter
     * @dev First checks if buffer has enough funds to refill adapter. If not - checks if funds on buffer and gnosis multisig
     * together are enough to satisfy adapters. Uses all the available funds in buffer, takes rest from gnosis.
     * @dev After successful refill calls deposit() on corresponding adapter, instructing to leave all the funds in pool.
     * If there are any queued withdrawals on adapter - satisfies them
     * @param _ibAlluo address of corresponding IBAlluo
     */
    function refillBuffer(
        address _ibAlluo
    ) external whenNotPaused onlyRole(GELATO) returns (bool) {
        uint256 totalAmount = adapterRequiredRefill(_ibAlluo);

        require(totalAmount > 0, "No refill required");

        address adapterAddress = ibAlluoToAdapter[_ibAlluo];
        address bufferToken = IHandlerAdapter(adapterAddress).getCoreTokens();
        uint256 decDif = 18 - IERC20MetadataUpgradeable(bufferToken).decimals();
        uint256 bufferBalance = IERC20Upgradeable(bufferToken).balanceOf(
            address(this)
        );
        uint256 gnosisBalance = IERC20Upgradeable(bufferToken).balanceOf(
            gnosis
        );

        bufferBalance = bufferBalance * 10 ** decDif;
        gnosisBalance = gnosisBalance * 10 ** decDif;
        // a dynamic percent of suplus to counter fiat slippage/slippage of the pools
        totalAmount += (totalAmount * slippageControl[_ibAlluo]) / 10000;

        if (bufferBalance < totalAmount) {
            if (totalAmount < bufferBalance + gnosisBalance) {
                refillGnosis(
                    totalAmount,
                    bufferBalance,
                    bufferToken,
                    _ibAlluo,
                    adapterAddress,
                    decDif
                );
                return true;
            } else {
                return false;
            }
        } else {
        IERC20Upgradeable(bufferToken).approve(_ibAlluo, totalAmount / 10 ** decDif);
        IIbAlluo(_ibAlluo).deposit(bufferToken, totalAmount / 10 ** decDif);
        IERC20MetadataUpgradeable(_ibAlluo).transfer(gnosis, IERC20MetadataUpgradeable(_ibAlluo).balanceOf(address(this)));
        if (isAdapterPendingWithdrawal(_ibAlluo)) {
            handler.satisfyAdapterWithdrawals(_ibAlluo);
        }
        return true;
        }
    }

    /**
     * @notice All the amounts are 18 decimals
     * @dev Internal function called by refillBuffer() in a scenario of using gnosis funds to execute the refill
     * @param totalAmount Required amount to fully refill the adapter
     * @param bufferBalance Amount of the asset on buffer
     * @param bufferToken Address of the token used to refill
     * @param ibAlluo Address of the ibAlluo binded to the adapter
     * @param adapterAddress Address of the adapter to be refilled
     * @param decDif Decimal difference, see notice in refillBuffer() for details
     */
    function refillGnosis(
        uint256 totalAmount,
        uint256 bufferBalance,
        address bufferToken,
        address ibAlluo,
        address adapterAddress,
        uint256 decDif
    ) internal {
        uint256 gnosisAmount = totalAmount - bufferBalance;

        Epoch storage currentEpoch = _confirmEpoch(ibAlluo);

        require(
            ibAlluoToMaxRefillPerEpoch[ibAlluo] >=
                currentEpoch.refilledPerEpoch + gnosisAmount,
            "Cumulative refills exceeds limit"
        );

        currentEpoch.refilledPerEpoch += gnosisAmount;
        IERC20Upgradeable(bufferToken).transferFrom(
            gnosis,
            address(this),
            gnosisAmount / 10 ** decDif
        );
        IERC20Upgradeable(bufferToken).approve(ibAlluo, totalAmount / 10 ** decDif);
        IIbAlluo(ibAlluo).deposit(
            bufferToken,
            totalAmount / 10 ** decDif
        );
        if (isAdapterPendingWithdrawal(ibAlluo)) {
            handler.satisfyAdapterWithdrawals(ibAlluo);
        }
        IERC20MetadataUpgradeable(ibAlluo).transfer(gnosis, IERC20MetadataUpgradeable(ibAlluo).balanceOf(address(this)));
    }

    /**
     * @dev View function to trigger bridging
     * @param token Token to bridge
     * @param amount Amount to bridge
     */
    function canBridge(
        address token,
        uint256 amount
    ) public view returns (bool) {
        uint256 amount18 = amount *
            10 ** (18 - IERC20MetadataUpgradeable(token).decimals());
        if (
            amount18 >= tokenToMinBridge[token] &&
            block.timestamp >= lastExecuted + bridgeInterval &&
            amount18 <= tokenToMaxBridge[token]
        ) {
            return true;
        }
        return false;
    }

    /**
     * @dev View function to trigger refillBuffer
     * @param _iballuo Address of the IBAlluo
     * @param token Address of the correspondin primary token of the pool
     */
    function canRefill(
        address _iballuo,
        address token
    ) public view returns (bool) {
        uint256 balance = IERC20Upgradeable(token).balanceOf(address(this));
        uint256 decDif = 18 - IERC20MetadataUpgradeable(token).decimals();
        uint256 gnosisBalance = IERC20Upgradeable(token).balanceOf(gnosis);
        balance = balance * 10 ** decDif;
        gnosisBalance = gnosisBalance * 10 ** decDif;
        uint256 refill = adapterRequiredRefill(_iballuo);
        if (refill > 0 && refill < gnosisBalance + balance) {
            return true;
        }
        return false;
    }

    /**
     * @dev Internal function for readabilty of checker functions
     * @param i Index in a loop in checkerRefill and checkerBridge
     * @return address Iballuo address
     * @return address Token of the respective iballuo
     * @return amount Amount to be bridged/refill in corresponding to token decimals
     */
    function getValues(
        uint256 i
    ) internal view returns (address, address, uint256) {
        address iballuo = activeIbAlluos.at(i);
        address token = IHandlerAdapter(ibAlluoToAdapter[iballuo])
            .getCoreTokens();
        uint256 amount = IERC20Upgradeable(token).balanceOf(address(this));

        return (iballuo, token, amount);
    }

    /**
    * @dev View function used by refillChecker to check if a refill can be executed without draining the gnosis
    * @param _iballuo iballuo of the respective adapter
    * @param _token token of the respective iballuo/adapter
    * @return bool True if conditions for refill are met, false if not
    */
    function checkEpoch(address _iballuo, address _token) public view returns(bool) {
        Epoch[] memory relevantEpochs = ibAlluoToEpoch[_iballuo];
        Epoch memory lastEpoch = relevantEpochs[relevantEpochs.length - 1];
        uint256 deadline = lastEpoch.startTime + epochDuration;
        if (block.timestamp > deadline) {
            lastEpoch.refilledPerEpoch = 0;
        }
        uint256 rrefill = adapterRequiredRefill(_iballuo);  
        uint256 bbalance = IERC20Upgradeable(_token).balanceOf(address(this)) * 10 ** (18 - IERC20MetadataUpgradeable(_token).decimals());
        // Checking if required refill is more than the buffer balance in order to prevent underflow, 
        // then checking if gnosisAmount to be refilled doesn't exceed the maximum allowed gnosis refill limit  
        if(rrefill<bbalance) {
            return true;
        } else if (rrefill > bbalance && ibAlluoToMaxRefillPerEpoch[_iballuo] >= rrefill + lastEpoch.refilledPerEpoch - bbalance) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @notice Initialize function faces stack too deep error, due to too many arguments. Used to safely set-up/upgrage
     * iballuos and corresponding settings
     * @param _activeIbAlluos Array of IBAlluo contract supported for bridging
     * @param _ibAlluoAdapters Array of corresponding Adapters
     * @param _tokensEth Addresses of the same tokens on mainnet
     * @param _minBridgeAmount Min amount of asset to trigget bridging for each of the iballuo
     * @param _maxRefillPerEpoch Max value of asset for an adapter to be filled in span of a predefined interval
     */
    function initializeValues(
        address _handler,
        address[] memory _activeIbAlluos,
        address[] memory _ibAlluoAdapters,
        address[] memory _tokensEth,
        uint256[] memory _minBridgeAmount,
        uint256[] memory _maxRefillPerEpoch,
        uint256 _epochDuration
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        handler = ILiquidityHandler(_handler);

        for (uint256 i; i < _activeIbAlluos.length; i++) {
            activeIbAlluos.add(_activeIbAlluos[i]);
            ibAlluoToAdapter[_activeIbAlluos[i]] = _ibAlluoAdapters[i];
            address token = IHandlerAdapter(_ibAlluoAdapters[i])
                .getCoreTokens();
            tokenToMinBridge[token] = _minBridgeAmount[i];
            tokenToEth[token] = _tokensEth[i];
            ibAlluoToMaxRefillPerEpoch[_activeIbAlluos[i]] = _maxRefillPerEpoch[
                i
            ];
            epochDuration = _epochDuration;

            Epoch memory newEpoch = Epoch(block.timestamp, 0);
            ibAlluoToEpoch[_activeIbAlluos[i]].push(newEpoch);
        }
    }

    /* ========== ADMIN CONFIGURATION ========== */

    /**
     * @dev Admin function to change bridge interval
     * @param _bridgeInterval interval in seconds, to put limitations for an amount to be bridged
     */
    function changeBridgeInterval(
        uint256 _bridgeInterval
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridgeInterval = _bridgeInterval;
    }

    /**
     * @dev Admin function to set minimum amount for each token that will serve as threshold to trigger bridging
     * @param _token Address of the token
     * @param _minAmount Minimum amount to allow bridging
     */
    function setMinBridgeAmount(
        address _token,
        uint256 _minAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenToMinBridge[_token] = _minAmount;
    }

    /**
    * @dev Admin function to set bridge cap
    * @param _cap Max amount that can be bridged 
    */
    function setBridgeCap(address _token, uint256 _cap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenToMaxBridge[_token] = _cap;
    }

    /**
     * @dev Admin function to manually set relayersFeePct for bridging
     * @param _relayerFeePct relayerFeePct in uint64
     */
    function setRelayerFeePct(
        uint64 _relayerFeePct
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        relayerFeePct = _relayerFeePct;
    }

    /**
     * @dev Admin function to change the address of VoteExecutorSlave contract
     * @param _slave Address of the VoteExecutorSlave contract
     */
    function setVoteExecutorSlave(
        address _slave
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slave = _slave;
    }

    /**
     * @dev Admin function to set anycall contract address
     * @param _anycall Address of the anycall contract
     */
    function setAnycall(
        address _anycall
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        anycall = _anycall;
    }

    /**
     * @dev Admin function to set Distributor contract address
     * @param _distributor Address of the Distributor contract on ETH mainnet
     */
    function setDistributor(
        address _distributor
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        distributor = _distributor;
    }

    /**
    * @dev Admin function to set spokepool address
    */
    function setSpokePool(address _spokePool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        spokepool = _spokePool;
    }

    /**
     * @notice Needed for bridging
     * @dev Admin function to change the address of the respective token on Mainnet
     * @param _token address of the token on Polygon
     * @param _tokenEth address of the same token on Mainnet
     */
    function setEthToken(
        address _token,
        address _tokenEth
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenToEth[_token] = _tokenEth;
    }

    /**
     * @dev Admin function for setting max amount an adapter can be refilled per interval
     * @param _ibAlluo address of the IBAlluo of the respective adapter
     * @param _maxRefillPerEpoch max amount to be refilled
     */
    function setMaxRefillPerEpoch(
        address _ibAlluo,
        uint256 _maxRefillPerEpoch
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToMaxRefillPerEpoch[_ibAlluo] = _maxRefillPerEpoch;
    }

    /**
    * @notice Prevents buffer from refilling adapters with "dust" amount
    * @dev Admin function to set a minimum deviation from expectedAdapterAmount that would trigger a refill
    * @param _pct Minimum percentage of deviation to trigger the refill (format: 5% = 500)
    */
    function setRefillThresholdPct(uint _pct) external onlyRole(DEFAULT_ADMIN_ROLE) {
        refillThreshold = _pct;
    }

    /**
     * @dev Admin function for setting the aforementioned interval
     * @param _epochDuration time of the epoch in seconds
     */
    function setEpochDuration(
        uint256 _epochDuration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        epochDuration = _epochDuration;
    }

    /**
     * @notice Function is called by gnosis
     * @dev Adds IBAlluo pool to the list of active pools
     * @param ibAlluo Address of the IBAlluo pool to be added
     */
    function addIBAlluoPool(
        address ibAlluo,
        address adapter
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!activeIbAlluos.contains(ibAlluo), "Already active");

        activeIbAlluos.add(ibAlluo);
        ibAlluoToAdapter[ibAlluo] = adapter;
    }

    /**
    * @dev Adds tokens that are not supported by Across, thus follow different briging logic
    * @param _token Token that should follow deviant logic
    */
    function addNonBridgeToken (address _token) external onlyRole(DEFAULT_ADMIN_ROLE){
        nonBridgeTokens.add(_token);
    }

    /**
    * @dev Sets a leverage value, that allows countering slippage in a scenario it is required
    * @notice Needed to sustain refill logic for the adapters interacting with volatile pools
    * @param _iballuo Address of the ibAlluo
    * @param _pct Pct of surplus (e.g. 1% = 100)
    */
    function setSlippageControl (address _iballuo, uint _pct) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippageControl[_iballuo] = _pct;
    }

    /**
     * @notice Funtion is called by gnosis
     * @dev Removes IBAlluo pool from the list of active pools
     * @param ibAlluo Address of the IBAlluo pool to be removed
     */
    function removeIBAlluoPool(
        address ibAlluo
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bool) {
        bool removed;
        for (uint256 i = 0; i < activeIbAlluos.length(); i++) {
            if (activeIbAlluos.at(i) == ibAlluo) {
                activeIbAlluos.remove(activeIbAlluos.at(i));
                ibAlluoToAdapter[ibAlluo] = address(0);
                removed = true;
            }
        }
        return removed;
    }

    /**
    * @notice if _amount == 0 withdraws all
    * @dev Admin function to employ assets not eligible for refill/bridging logic in circulation by returning it to gnosis
    * @param _token Address of the token to withdraw
    * @param _amount Amount of the token to withdraw
    */
    
    function withdrawGnosis(address _token, uint256 _amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if(_amount != 0){
        IERC20Upgradeable(_token).transfer(gnosis, _amount);
        } else {
            IERC20Upgradeable(_token).transfer(gnosis, IERC20Upgradeable(_token).balanceOf(address(this)));
        }
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function changeUpgradeStatus(
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        require(upgradeStatus, "Manager: Upgrade not allowed");
        upgradeStatus = false;
    }
}

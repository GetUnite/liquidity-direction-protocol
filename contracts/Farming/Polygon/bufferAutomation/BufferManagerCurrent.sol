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

import "../../../interfaces/ILiquidityHandler.sol";
import "../../../interfaces/IHandlerAdapter.sol";
import "../../../interfaces/IVoteExecutorSlave.sol";
import "../../../interfaces/ISpokePool.sol";
import "../../../interfaces/ICallProxy.sol";

contract BufferManagerCurrent is
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
    uint256 public bridgeRefilled;

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

        spokepool = _spokepool;
        anycall = _anycall;
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
            if (
                adapterRequiredRefill(iballuo) == 0 && canBridge(token, amount)
            ) {
                canExec = true;
                execPayload = abi.encodeWithSelector(
                    BufferManagerCurrent.swap.selector,
                    amount,
                    token,
                    iballuo
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
            if (canRefill(iballuo, token)) {
                canExec = true;
                execPayload = abi.encodeWithSelector(
                    BufferManagerCurrent.refillBuffer.selector,
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
    ) external onlyRole(SWAPPER) {
        require(
            canBridge(originToken, amount),
            "Buffer: <minAmount or <bridgeInterval"
        );

        if (block.timestamp > lastExecuted + bridgeInterval) {
            bridgeRefilled = 0;
        }
        lastExecuted = block.timestamp;
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
     * @param _ibAlluo Address of an IBAlluo contract, which corresponding adapter is to be filled
     * @return requiredRefill Amount to be refilled with 18 decimals
     */
    function adapterRequiredRefill(
        address _ibAlluo
    ) public view returns (uint256) {
        uint256 expectedAmount = handler.getExpectedAdapterAmount(_ibAlluo, 0);
        uint256 actualAmount = handler.getAdapterAmount(_ibAlluo);
        if (actualAmount >= expectedAmount) {
            return 0;
        }
        uint256 difference = expectedAmount - actualAmount;
        if ((difference * 10000) / expectedAmount <= 500) {
            return 0;
        }
        return difference;
    }

    /**
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
    ) external onlyRole(GELATO) returns (bool) {
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
        // 2 percent on top to be safe against pricefeed and lp slippage
        totalAmount += (totalAmount * 200) / 10000;

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
            IERC20Upgradeable(bufferToken).transfer(
                adapterAddress,
                totalAmount / 10 ** decDif
            );
            IHandlerAdapter(adapterAddress).deposit(
                bufferToken,
                totalAmount,
                totalAmount
            );
            bridgeRefilled += totalAmount;
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

        currentEpoch.refilledPerEpoch += totalAmount;
        IERC20Upgradeable(bufferToken).transferFrom(
            gnosis,
            adapterAddress,
            gnosisAmount / 10 ** decDif
        );
        if (gnosisAmount != totalAmount) {
            bridgeRefilled += totalAmount;
            IERC20Upgradeable(bufferToken).transfer(
                adapterAddress,
                bufferBalance / 10 ** decDif
            );
        }
        IHandlerAdapter(adapterAddress).deposit(
            bufferToken,
            totalAmount,
            totalAmount
        );
        if (isAdapterPendingWithdrawal(ibAlluo)) {
            handler.satisfyAdapterWithdrawals(ibAlluo);
        }
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
            amount >= tokenToMinBridge[token] &&
            block.timestamp >= lastExecuted + bridgeInterval &&
            bridgeRefilled + amount18 <= bridgeCap
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
     */
    function setBridgeCap(uint256 _cap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridgeCap = _cap;
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

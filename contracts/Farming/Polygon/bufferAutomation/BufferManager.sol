// SPDX-License-Identifier: MIT
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
import "../../../interfaces/ILiquidityHandler.sol";
import "../../../interfaces/IHandlerAdapter.sol";
import "hardhat/console.sol";

contract BufferManager is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable {

    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bytes32 constant public UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 constant public GELATO = keccak256("GELATO");
    ILiquidityHandler constant public handler = ILiquidityHandler(address(0));

    mapping(address => Epoch[]) public ibAlluoToEpoch;
    mapping(address => address) public ibAlluoToAdapter;
    mapping(address => uint256) public ibAlluoToMaxRefillPerEpoch;

    EnumerableSetUpgradeable.AddressSet private activeIbAlluos;

    bool public upgradeStatus;
    uint256 public epochDuration;
    address public gnosis;

    struct Epoch {
        uint256 startTime;
        uint256 refilledPerEpoch;
    }
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        uint256 _epochDuration,
        address _gnosis,
        address[] memory _activeIbAlluos,
        address[] memory _ibAlluoAdapters,
        uint256[] memory _maxRefillPerEpoch
    ) public initializer {
       
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        epochDuration = _epochDuration;

        for (uint256 i;i < _activeIbAlluos.length; i++) {
            activeIbAlluos.add(_activeIbAlluos[i]);
            ibAlluoToAdapter[_activeIbAlluos[i]] = _ibAlluoAdapters[i];
            ibAlluoToMaxRefillPerEpoch[_activeIbAlluos[i]] = _maxRefillPerEpoch[i];
        }

        _grantRole(DEFAULT_ADMIN_ROLE, _gnosis);
        _grantRole(UPGRADER_ROLE, _gnosis);
    }


    function refillBuffer(address _ibAlluo) public onlyRole(GELATO) returns (bool) {
        uint256 refillAmount = adapterRequiredRefill(_ibAlluo);
        address adapterAddress = ibAlluoToAdapter[_ibAlluo];
        (address bufferToken,) = IHandlerAdapter(adapterAddress).getCoreTokens();
        Epoch storage currentEpoch = _confirmEpoch(_ibAlluo);
        require(ibAlluoToMaxRefillPerEpoch[_ibAlluo] >= currentEpoch.refilledPerEpoch + refillAmount, "Cumulative refills exceeds limit");
        require(refillAmount > 0, "No refill required");
        currentEpoch.refilledPerEpoch += refillAmount;
        IERC20Upgradeable(bufferToken).transferFrom(gnosis, adapterAddress, refillAmount);
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

    function isAdapterPendingWithdrawal(address _ibAlluo) public view returns (bool) {
        (,,uint256 totalWithdrawalAmount,) = handler.ibAlluoToWithdrawalSystems(_ibAlluo);
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
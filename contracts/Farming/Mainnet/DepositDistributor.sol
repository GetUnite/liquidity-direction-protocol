// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

// import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

// import "../../interfaces/ILiquidityHandler.sol";

// /**
// * @title Collector
// * @notice Parking contract deployed on mainnet storing assets deployed from other chains.
// *
// */

// contract DepositDistributor  is
//     Initializable,
//     PausableUpgradeable,
//     AccessControlUpgradeable,
//     UUPSUpgradeable
//     {
//     using AddressUpgradeable for address;
//     using SafeERC20Upgradeable for IERC20Upgradeable;
//     using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;

//     bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
//     bool public upgradeStatus;
//     address private gnosis;
//     ILiquidityHandler public constant handler;
//     address private voteExecutor;

//     mapping(address => address) tokenPolEth;

//     struct FundsInfo {
//         uint amount;
//         address test;
//     }

//     struct Entry {
//         // Percentage of the total contract balance
//         // that goes to the exact strategy
//         // with 2 desimals, so 6753 == 67.53%
//         uint256 weight;
//         // strategy that distributes money to a specific pool
//         address strategyAddress;
//         // Preferred token for which most exchanges will be made
//         address entryToken;
//         // Token with which we enter the pool
//         address poolToken;
//         //
//         bytes data;
//     }

//     Entry[] public entries;

//     /// @custom:oz-upgrades-unsafe-allow constructor
//     constructor() initializer {}

//     function initialize(
//         address _multiSigWallet,
//         address _handlerAddress,
//         address _executorAddress,
//         address[] memory token) public initializer
//         {
//         __Pausable_init();
//         __AccessControl_init();
//         __UUPSUpgradeable_init();

//         handler = ILiquidityHandler(_handlerAddress);
//         gnosis  = _multiSigWallet;

//         require(_multiSigWallet.isContract(), "Multisig: Not contract");

//         _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
//         _grantRole(UPGRADER_ROLE, _multiSigWallet);

//     }

//     // function calculateAll() public {

//     // }

//     function anyExecute(bytes memory _data) external returns (bool success, bytes memory result){
//         (Entry memory _msg) = abi.decode(_data, (FundsInfo));
//         success=true;
//         result="";
//     }

//     function grantRole(bytes32 role, address account)
//     public
//     override
//     onlyRole(getRoleAdmin(role)) {
//         _grantRole(role, account);
//     }

//     function changeUpgradeStatus(bool _status)
//     external
//     onlyRole(DEFAULT_ADMIN_ROLE) {
//         upgradeStatus = _status;
//     }

//     function _authorizeUpgrade(address newImplementation)
//     internal
//     onlyRole(UPGRADER_ROLE)
//     override {
//         require(upgradeStatus, "Collector: Upgrade not allowed");
//         upgradeStatus = false;
//     }
// }

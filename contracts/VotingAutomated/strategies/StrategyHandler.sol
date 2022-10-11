// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "hardhat/console.sol";

// import "../interfaces/ILiquidityHandler.sol";
// import "../interfaces/IAlluoToken.sol";
// import "../interfaces/ILocker.sol";
// import "../interfaces/IGnosis.sol";
// import "../interfaces/IAlluoStrategyNew.sol";
// import "../interfaces/IMultichain.sol";
// import "../interfaces/IAlluoStrategyV2.sol";
// import "../interfaces/IExchange.sol";                                                                 
// import "../interfaces/IWrappedEther.sol";
import "../../interfaces/IIbAlluo.sol";
import "../../Farming/priceFeedsV2/PriceFeedRouterV2.sol";
import "../../interfaces/IAlluoStrategyV2.sol";

contract StrategyHandler is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable {

    using ECDSAUpgradeable for bytes32;
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.UintToAddressMap;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    address public gnosis;
    address public exchangeAddress;
    address public priceFeed;

    bool public upgradeStatus;
    uint256 public lastTimeCalculated;

    mapping(string => uint256) public directionNameToId;
    mapping(uint256 => LiquidityDirection) public liquidityDirection;

    // asset id: usd = 0, eur = 1, eth = 2, btc = 3 
    //can be changed to array
    mapping(uint256 => AssetInfo) private assetIdToAssetInfo;

    uint8 public numberOfAssets = 4;

    struct LiquidityDirection {
        address strategyAddress; //frax convex , mim
        uint256 assetId;
        uint256 chainId;
        bytes entryData;
        bytes exitData;
        bytes rewardsData;
    }

    struct AssetInfo {
        mapping(uint256 => address) primaryTokens; // chainId --> primary
        address ibAlluo;
        EnumerableSetUpgradeable.UintSet activeDirections;
        EnumerableSetUpgradeable.AddressSet needToTransferFrom;
        uint256 amountDeployed; // in 18d
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _multiSigWallet, 
        address _secondAdmin
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "Executor: Not contract");
        gnosis = _multiSigWallet;
        exchangeAddress = 0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec;

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        // For tests only
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        _grantRole(DEFAULT_ADMIN_ROLE, _secondAdmin);
        _grantRole(UPGRADER_ROLE, _secondAdmin);
    }

    // receive() external payable {
    //     if(msg.sender != address(wETH)){
    //         wETH.deposit{value : msg.value}();
    //     }
    // }returns()

    function calculateRewards() external onlyRole(DEFAULT_ADMIN_ROLE) {

        uint256 timePass = block.timestamp - lastTimeCalculated;
        for (uint256 i; i < numberOfAssets; i++) {
            uint256 newAmountDeployed;
            AssetInfo storage info = assetIdToAssetInfo[i];
            for (uint256 j; j < info.activeDirections.length(); j++) {
                LiquidityDirection memory direction = liquidityDirection[info.activeDirections.at(j)];
                newAmountDeployed += IAlluoStrategyV2(direction.strategyAddress).getDeployedAmount(direction.rewardsData);
                if(!info.needToTransferFrom.contains(direction.strategyAddress)){
                    info.needToTransferFrom.add(direction.strategyAddress);
                }
            }
            address primaryToken = info.primaryTokens[1];
            for (uint256 j = info.needToTransferFrom.length(); j > 0 ; j--) {
                address strategyAddress = info.needToTransferFrom.at(j-1);
                IAlluoStrategyV2(strategyAddress).getRewards(primaryToken);
                info.needToTransferFrom.remove(strategyAddress);
            }
            (uint256 fiatPrice, uint8 fiatDecimals) = PriceFeedRouterV2(priceFeed).getPrice(primaryToken, i);
            uint256 totalRewardsBalance = IERC20Upgradeable(primaryToken).balanceOf(address(this));
            uint8 primaryDecimals = IERC20MetadataUpgradeable(primaryToken).decimals();
            uint256 totalRewards = PriceFeedRouterV2(priceFeed).decimalsConverter(
                fiatPrice * totalRewardsBalance, 
                fiatDecimals + primaryDecimals, 
                18
            );
            
            uint256 interest = IIbAlluo(info.ibAlluo).annualInterest();
            uint256 expectedAmount = info.amountDeployed + (info.amountDeployed * interest * timePass / 31536000  / 10000);
            uint256 actualAmount = newAmountDeployed + totalRewards;

            if(actualAmount > expectedAmount){

                uint256 surplus = actualAmount - expectedAmount;
                surplus = PriceFeedRouterV2(priceFeed).decimalsConverter(
                    surplus, 
                    18, 
                    primaryDecimals
                );
                if(surplus < totalRewardsBalance){
                    //transfer surplus to booster
                    // all what left to executor
                }
                else{
                    // ???
                }
            }
            else{
                //transfer all rewards to executor
                // ???
            }
            // record last total amount
            // what if tvl changes
            // 1m
            // 500k
        }
        lastTimeCalculated = block.timestamp;
    }

    function getLiquidityDirectionByName(string memory _codeName) external view returns(uint256, address, LiquidityDirection memory){
        uint256 directionId = directionNameToId[_codeName];
        LiquidityDirection memory direction = liquidityDirection[directionId];
        address primaryToken = assetIdToAssetInfo[direction.assetId].primaryTokens[direction.chainId];
        //change primT to full asset info
        return (directionId, primaryToken, direction);
    }

    function addToActiveDirections(uint256 _directionId) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if(!assetIdToAssetInfo[liquidityDirection[_directionId].assetId].activeDirections.contains(_directionId)){
            assetIdToAssetInfo[liquidityDirection[_directionId].assetId].activeDirections.add(_directionId);
        }
    }

    function removeFromActiveDirections(uint256 _directionId) public onlyRole(DEFAULT_ADMIN_ROLE) {
        assetIdToAssetInfo[liquidityDirection[_directionId].assetId].activeDirections.remove(_directionId);
    }   

    function setGnosis(address _gnosisAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosis = _gnosisAddress;
    }

    function setExchangeAddress(address _newExchange) public onlyRole(DEFAULT_ADMIN_ROLE) {
        exchangeAddress = _newExchange;
    }

    function setLiquidityDirection(
        string memory _codeName,
        uint256 _directionId,
        address _strategyAddress, 
        uint256 _assetId, 
        uint256 _chainId, 
        bytes memory _entryData, 
        bytes memory _exitData,
        bytes memory _rewardsData
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        directionNameToId[_codeName] = _directionId;
        liquidityDirection[_directionId] = LiquidityDirection(
            _strategyAddress, 
            _assetId, 
            _chainId, 
            _entryData, 
            _exitData, 
            _rewardsData
        );
    }

    function setAssetInfo(
        uint256 _assetId,
        uint256[] calldata  _chainIds, 
        address[] calldata _primaryTokens,
        address _ibAlluo
    )external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_chainIds.length == _primaryTokens.length);
        assetIdToAssetInfo[_assetId].ibAlluo = _ibAlluo;
        for (uint256 i; i < _chainIds.length; i++) {
            assetIdToAssetInfo[_assetId].primaryTokens[_chainIds[i]] = _primaryTokens[i];
        }
    }


    function grantRole(bytes32 role, address account)
    public
    override
    onlyRole(getRoleAdmin(role)) {
        // if (role == DEFAULT_ADMIN_ROLE) {
        //     require(account.isContract(), "Handler: Not contract");
        // }
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
        require(upgradeStatus, "Executor: Upgrade not allowed");
        upgradeStatus = false;
    }
}

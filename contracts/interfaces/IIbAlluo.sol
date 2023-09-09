// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IIbAlluo {
    event AdminChanged(address previousAdmin, address newAdmin);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event BeaconUpgraded(address indexed beacon);
    event BurnedForWithdraw(address indexed user, uint256 amount);
    event CreateFlow(
        address indexed from,
        address indexed to,
        int96 amountPerSecond
    );
    event CreateFlowWithTimestamp(
        address indexed from,
        address indexed to,
        int96 amountPerSecond,
        uint256 indexed endTimestamp
    );
    event DeletedFlow(address indexed from, address indexed to);
    event DepositTokenStatusChanged(address token, bool status);
    event Deposited(address indexed user, address token, uint256 amount);
    event Initialized(uint8 version);
    event InterestChanged(
        uint256 oldYearInterest,
        uint256 newYearInterest,
        uint256 oldInterestPerSecond,
        uint256 newInterestPerSecond
    );
    event NewHandlerSet(address oldHandler, address newHandler);
    event Paused(address account);
    event PriceInfo(uint256 price, uint8 priceDecimals);
    event RoleAdminChanged(
        bytes32 indexed role,
        bytes32 indexed previousAdminRole,
        bytes32 indexed newAdminRole
    );
    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event Transfer(address indexed from, address indexed to, uint256 value);
    event TransferAssetValue(
        address indexed from,
        address indexed to,
        uint256 tokenAmount,
        uint256 assetValue,
        uint256 growingRatio
    );
    event Unpaused(address account);
    event UpdateTimeLimitSet(uint256 oldValue, uint256 newValue);
    event UpdatedFlow(
        address indexed from,
        address indexed to,
        int96 amountPerSecond
    );
    event Upgraded(address indexed implementation);

    function CFA_ID() external view returns (bytes32);

    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function GELATO() external view returns (bytes32);

    function UPGRADER_ROLE() external view returns (bytes32);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function annualInterest() external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function approveAssetValue(
        address spender,
        uint256 amount
    ) external returns (bool);

    function autoInvestMarketToSuperToken(
        address
    ) external view returns (address);

    function balanceOf(address account) external view returns (uint256);

    function burn(address account, uint256 amount) external;

    function cfaV1Lib() external view returns (address host, address cfa);

    function changeTokenStatus(address _token, bool _status) external;

    function changeUpgradeStatus(bool _status) external;

    function combinedBalanceOf(address _address) external view returns (int256);

    function convertToAssetValue(
        uint256 _amountInTokenValue
    ) external view returns (uint256);

    function createFlow(
        address receiver,
        int96 flowRate,
        uint256 toWrap
    ) external;

    function createFlow(
        address receiver,
        int96 flowRate,
        uint256 toWrap,
        uint256 timestamp
    ) external;

    function decimals() external view returns (uint8);

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) external returns (bool);

    function deleteFlow(address receiver) external;

    function deposit(
        address _token,
        uint256 _amount
    ) external returns (uint256 alluoMinted);

    function exchangeAddress() external view returns (address);

    function fiatIndex() external view returns (uint256);

    function forceWrap(address sender) external;

    function formatPermissions() external view returns (bytes memory);

    function getBalance(address _address) external view returns (int256);

    function getBalanceForTransfer(
        address _address
    ) external view returns (int256);

    function getListSupportedTokens() external view returns (address[] memory);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function grantRole(bytes32 role, address account) external;

    function growingRatio() external view returns (uint256);

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) external returns (bool);

    function initialize(
        string memory _name,
        string memory _symbol,
        address _multiSigWallet,
        address _handler,
        address[] memory _supportedTokens,
        uint256 _interestPerSecond,
        uint256 _annualInterest,
        address _trustedForwarder,
        address _exchangeAddress
    ) external;

    function interestPerSecond() external view returns (uint256);

    function isTrustedForwarder(address forwarder) external view returns (bool);

    function lastInterestCompound() external view returns (uint256);

    function liquidityHandler() external view returns (address);

    function mint(address account, uint256 amount) external;

    function name() external view returns (string memory);

    function pause() external;

    function paused() external view returns (bool);

    function priceFeedRouter() external view returns (address);

    function proxiableUUID() external view returns (bytes32);

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function setAutoInvestMarketToSuperToken(
        address[] memory markets,
        address[] memory superTokens
    ) external;

    function setExchangeAddress(address newExchangeAddress) external;

    function setInterest(
        uint256 _newAnnualInterest,
        uint256 _newInterestPerSecond
    ) external;

    function setLiquidityHandler(address newHandler) external;

    function setPriceRouterInfo(
        address _priceFeedRouter,
        uint256 _fiatIndex
    ) external;

    function setSuperToken(address _superToken) external;

    function setSuperfluidEndResolver(address _superfluidEndResolver) external;

    function setSuperfluidResolver(address _superfluidResolver) external;

    function setTrustedForwarder(address newTrustedForwarder) external;

    function stopFlowWhenCritical(address sender, address receiver) external;

    function superToken() external view returns (address);

    function superfluidEndResolver() external view returns (address);

    function superfluidResolver() external view returns (address);

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function symbol() external view returns (string memory);

    function totalAssetSupply() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function transferAssetValue(
        address to,
        uint256 amount
    ) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function trustedForwarder() external view returns (address);

    function unpause() external;

    function updateFlow(
        address receiver,
        int96 flowRate,
        uint256 toWrap
    ) external;

    function updateRatio() external;

    function updateTimeLimit() external view returns (uint256);

    function upgradeStatus() external view returns (bool);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external payable;

    function withdraw(
        address _targetToken,
        uint256 _amount
    ) external returns (uint256 targetTokenReceived, uint256 ibAlluoBurned);

    function withdrawTo(
        address _recipient,
        address _targetToken,
        uint256 _amount
    ) external returns (uint256 targetTokenReceived, uint256 ibAlluoBurned);
}

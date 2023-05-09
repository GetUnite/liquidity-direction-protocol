// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./../../interfaces/IVelodromePool.sol";
import "./../../interfaces/IBeefyVaultV6.sol";
import "./PriceFeedRouterV2.sol";

contract BeefyTokenPriceTool is AccessControl {
    address public beefyTokenImplementation =
        0x507D0ec51c87d2e4Eb36dfed28D0C7f09243dBa4;
    address public velodromePoolImplementation =
        0xdB7A2c373a3420ECE5672e03D3988C89eE3c1bfB;
    PriceFeedRouterV2 public priceRouter =
        PriceFeedRouterV2(0x7E6FD319A856A210b9957Cd6490306995830aD25);
    address public gnosis;

    constructor(address _gnosis) {
        _grantRole(DEFAULT_ADMIN_ROLE, _gnosis);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gnosis = _gnosis;
    }

    function addMooVelodromeTokenToPriceRouter(
        IBeefyVaultV6 mooToken,
        address coreToken,
        address referenceStrategy
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IVelodromePool pool = IVelodromePool(mooToken.want());
        bool isResultToken0 = coreToken == pool.token0();
        require(
            isResultToken0 || pool.token1() == coreToken,
            "BeefyTokenPriceTool: !in pair"
        );

        bytes memory initializerCall = abi.encodeWithSignature(
            "initialize(address,address,bool,address)",
            gnosis,
            mooToken,
            isResultToken0,
            referenceStrategy
        );
        bytes memory initCode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(beefyTokenImplementation, initializerCall)
        );

        address proxy = Create2.deploy(0, bytes32(block.timestamp), initCode);

        priceRouter.setCryptoStrategy(proxy, address(mooToken));
    }

    function addTokenViaVelodromeToPriceRouter(
        address token, // token you want to add to the price router
        IVelodromePool pool, // pool that has to be used
        address referenceStrategy // strategy for opposite token in pair
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bool isResultToken0 = token == pool.token1();
        require(
            isResultToken0 || pool.token0() == token,
            "BeefyTokenPriceTool: !in pair"
        );

        bytes memory initializerCall = abi.encodeWithSignature(
            "initialize(address,address,address,bool)",
            gnosis,
            referenceStrategy,
            address(pool),
            isResultToken0
        );
        bytes memory initCode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(velodromePoolImplementation, initializerCall)
        );

        address proxy = Create2.deploy(0, bytes32(block.timestamp), initCode);

        priceRouter.setCryptoStrategy(proxy, token);
    }

    function changeBeefyImplementation(
        address _beefyTokenImplementation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        beefyTokenImplementation = _beefyTokenImplementation;
    }

    function changeVelodromeImplementation(
        address _velodromePoolImplementation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        velodromePoolImplementation = _velodromePoolImplementation;
    }

    function changePriceRouter(
        address _priceRouter
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceRouter = PriceFeedRouterV2(_priceRouter);
    }

    function changeGnosis(
        address _gnosis
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosis = _gnosis;
    }
}

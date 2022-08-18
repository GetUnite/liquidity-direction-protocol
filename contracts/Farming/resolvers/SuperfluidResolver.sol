// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./../../interfaces/superfluid/IConstantFlowAgreementV1.sol";
import "./../../interfaces/IIbAlluo.sol";
import "hardhat/console.sol";

contract SuperfluidResolver is AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    mapping(address => mapping(address=>EnumerableSet.AddressSet)) private ibAlluoToStreamingData;
    mapping(address => EnumerableSet.AddressSet) private ibAlluoToActiveStreamers;
    address[] public ibAlluoAddresses;
    address CFAContract;
    bytes32 public constant GELATO = keccak256("GELATO");

    event WrappedTokenToPreventLiquidation(address indexed sender, address indexed receiver);
    event ClosedStreamToPreventLiquidation(address indexed sender, address indexed receiver);

    constructor(
        address[] memory _ibAlluoAddresses, address _CFAContract, address _gelato
    ) {
        for (uint i; i < _ibAlluoAddresses.length; i++) {
            _grantRole(DEFAULT_ADMIN_ROLE, _ibAlluoAddresses[i]);
        }
        ibAlluoAddresses = _ibAlluoAddresses;
        CFAContract = _CFAContract;
        _grantRole(GELATO, _gelato);
    }


    function addToChecker(address _sender, address _receiver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToStreamingData[msg.sender][_sender].add(_receiver);
        if (!ibAlluoToActiveStreamers[msg.sender].contains(_sender)) {  
            ibAlluoToActiveStreamers[msg.sender].add(_sender);
        }
    }

    function removeFromChecker(address _sender, address _receiver) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToStreamingData[msg.sender][_sender].remove(_receiver);
        if (ibAlluoToStreamingData[msg.sender][_sender].length() == 0) {
            ibAlluoToActiveStreamers[msg.sender].remove(_sender);
        } 
    }


    function checker() external view returns (bool canExec, bytes memory execPayload) {
        for (uint256 i; i < ibAlluoAddresses.length; i++) {
            address ibAlluo = ibAlluoAddresses[i];
            for (uint256 j; j < ibAlluoToActiveStreamers[ibAlluo].length(); j++) {
                address sender = ibAlluoToActiveStreamers[ibAlluo].at(j);
                if (_isUserCloseToLiquidation(sender, ibAlluo)) {
                    address[] memory receivers = ibAlluoToStreamingData[ibAlluo][sender].values();
                    // Liquidate all streams that belong to the sender
                    return(true, abi.encodeWithSelector(SuperfluidResolver.liquidateSender.selector, sender, receivers));
                }
            }
        }
        return (canExec, execPayload);
    }


    function _isUserCloseToLiquidation(address _sender, address _token) internal view returns (bool dangerZone) {
        ISuperfluidToken superToken = ISuperfluidToken(IIbAlluo(_token).superToken());
        (, int96 flowRate,,) = IConstantFlowAgreementV1(CFAContract).getAccountFlowInfo(superToken, _sender);
        (int256 realTimeBalance,,,) = superToken.realtimeBalanceOfNow(_sender);
        dangerZone= true ? realTimeBalance < -(int256(flowRate) * int256(16200)) : false;
    }

    function _isUserCloseToLiquidationAfterWrapping(address _sender, address _token) internal view returns (bool dangerZone) {
        ISuperfluidToken superToken = ISuperfluidToken(IIbAlluo(_token).superToken());
        (, int96 flowRate,,) = IConstantFlowAgreementV1(CFAContract).getAccountFlowInfo(superToken, _sender);
        (int256 realTimeBalance,,,) = superToken.realtimeBalanceOfNow(_sender);
        uint256 ibAlluoBalance = IIbAlluo(_token).balanceOf(_sender);
        dangerZone = true ? realTimeBalance + int256(ibAlluoBalance) < -(int256(flowRate) * int256(16200)) : false;
    }

    function liquidateSender(address _sender, address[] memory _receivers, address _token) external onlyRole(GELATO) {
        for (uint256 i; i < _receivers.length; i++) {
            if(_isUserCloseToLiquidationAfterWrapping(_sender, _token)) {
                IIbAlluo(_token).stopFlowWhenCritical(_sender, _receivers[i]);
                emit ClosedStreamToPreventLiquidation(_sender, _receivers[i]);
            } else {
                IIbAlluo(_token).forceWrap(_sender);
                emit WrappedTokenToPreventLiquidation(_sender, _receivers[i]);

            }
        }
    }
}

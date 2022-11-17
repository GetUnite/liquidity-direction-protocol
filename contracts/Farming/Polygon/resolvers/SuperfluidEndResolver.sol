// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../../../interfaces/superfluid/IConstantFlowAgreementV1.sol";
import "../../../interfaces/IIbAlluo.sol";
import "hardhat/console.sol";

contract SuperfluidEndResolver is AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    mapping(address => mapping(address=>EnumerableSet.AddressSet)) private ibAlluoToStreamingData;
    mapping(address => EnumerableSet.AddressSet) private ibAlluoToActiveStreamers;
    mapping(address => mapping(address => mapping(address => uint256))) private ibAlluoStreamDataToTimestamp;

    address[] public ibAlluoAddresses;
    bytes32 public constant GELATO = keccak256("GELATO");

    event WrappedTokenToPreventLiquidation(address indexed sender, address indexed receiver);
    event ClosedStreamEndDate(address indexed sender, address indexed receiver);

    constructor(
        address[] memory _ibAlluoAddresses,address _gelato
    ) {
        for (uint i; i < _ibAlluoAddresses.length; i++) {
            _grantRole(DEFAULT_ADMIN_ROLE, _ibAlluoAddresses[i]);
        }
        ibAlluoAddresses = _ibAlluoAddresses;
        _grantRole(GELATO, _gelato);
        _grantRole(GELATO, msg.sender);
    }


    function addToChecker(address _sender, address _receiver, uint256 duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToStreamingData[msg.sender][_sender].add(_receiver);
        if (!ibAlluoToActiveStreamers[msg.sender].contains(_sender)) {  
            ibAlluoToActiveStreamers[msg.sender].add(_sender);
        }
        ibAlluoStreamDataToTimestamp[msg.sender][_sender][_receiver]= block.timestamp + duration;
    }

    function removeFromChecker(address _sender, address _receiver) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToStreamingData[msg.sender][_sender].remove(_receiver);
        if (ibAlluoToStreamingData[msg.sender][_sender].length() == 0) {
            ibAlluoToActiveStreamers[msg.sender].remove(_sender);
        } 
        ibAlluoStreamDataToTimestamp[msg.sender][_sender][_receiver]= 0;
    }


    function checker() external view returns (bool canExec, bytes memory execPayload) {
        for (uint256 i; i < ibAlluoAddresses.length; i++) {
            address ibAlluo = ibAlluoAddresses[i];
            for (uint256 j; j < ibAlluoToActiveStreamers[ibAlluo].length(); j++) {
                address sender = ibAlluoToActiveStreamers[ibAlluo].at(j);
                address[] memory receivers = ibAlluoToStreamingData[ibAlluo][sender].values();
                (bool isClose, address receiver) = _isStreamCloseToEndDate(sender, ibAlluo, receivers);
                if (isClose) {
                    return(true, abi.encodeWithSelector(SuperfluidEndResolver.liquidateSender.selector, sender, receiver, ibAlluo));
                }
            }
        }
        return (canExec, execPayload);
    }


    function _isStreamCloseToEndDate(address _sender, address _token, address[] memory _receivers) internal view returns (bool, address) {
        for (uint256 i; i < _receivers.length; i++) {
            uint256 timestamp = ibAlluoStreamDataToTimestamp[_token][_sender][_receivers[i]];
            if (timestamp != 0 && block.timestamp >= timestamp) {
                return (true, _receivers[i]);
            }
        }
        return (false, address(0));
    }

    function liquidateSender(address _sender, address _receiver, address _token) external onlyRole(GELATO) {
        try IIbAlluo(_token).stopFlowWhenCritical(_sender, _receiver) {
        } catch {
            ibAlluoToStreamingData[_token][_sender].remove(_receiver);
            if (ibAlluoToStreamingData[_token][_sender].length() == 0) {
                ibAlluoToActiveStreamers[_token].remove(_sender);
            } 
            ibAlluoStreamDataToTimestamp[_token][_sender][_receiver]= 0;
        }
        emit ClosedStreamEndDate(_sender, _receiver);
    }
}
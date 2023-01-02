// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../../../interfaces/superfluid/IConstantFlowAgreementV1.sol";
import "../../../interfaces/IIbAlluo.sol";
import "hardhat/console.sol";

contract SuperfluidEndResolver is AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    mapping(address => mapping(address => EnumerableSet.AddressSet))
        private ibAlluoToStreamingData;
    mapping(address => EnumerableSet.AddressSet)
        private ibAlluoToActiveStreamers;
    mapping(address => mapping(address => mapping(address => uint256)))
        private ibAlluoStreamDataToTimestamp;

    address[] public ibAlluoAddresses;
    bytes32 public constant GELATO = keccak256("GELATO");

    event WrappedTokenToPreventLiquidation(
        address indexed sender,
        address indexed receiver
    );
    event ClosedStreamEndDate(address indexed sender, address indexed receiver);

    constructor(address[] memory _ibAlluoAddresses, address _multisig) {
        for (uint i; i < _ibAlluoAddresses.length; i++) {
            _grantRole(DEFAULT_ADMIN_ROLE, _ibAlluoAddresses[i]);
        }
        ibAlluoAddresses = _ibAlluoAddresses;

        _grantRole(GELATO, 0x0391ceD60d22Bc2FadEf543619858b12155b7030);
        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
        _grantRole(GELATO, _multisig);
    }

    function migratePreExistingStreams(
        address[] memory _tokens,
        address[] memory _from,
        address[] memory _to,
        uint256[] memory _timestamps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _tokens.length == _from.length &&
                _from.length == _to.length &&
                _to.length == _timestamps.length,
            "SuperfluidEndResolver: INVALID_INPUT_LENGTH"
        );
        for (uint i; i < _tokens.length; i++) {
            ibAlluoToStreamingData[_tokens[i]][_from[i]].add(_to[i]);
            ibAlluoToActiveStreamers[_tokens[i]].add(_from[i]);
            ibAlluoStreamDataToTimestamp[_tokens[i]][_from[i]][
                _to[i]
            ] = _timestamps[i];
        }
    }

    function addToChecker(
        address _sender,
        address _receiver,
        uint256 duration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToStreamingData[msg.sender][_sender].add(_receiver);
        if (!ibAlluoToActiveStreamers[msg.sender].contains(_sender)) {
            ibAlluoToActiveStreamers[msg.sender].add(_sender);
        }
        ibAlluoStreamDataToTimestamp[msg.sender][_sender][_receiver] =
            block.timestamp +
            duration;
    }

    function removeFromChecker(
        address _sender,
        address _receiver
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        ibAlluoToStreamingData[msg.sender][_sender].remove(_receiver);
        if (ibAlluoToStreamingData[msg.sender][_sender].length() == 0) {
            ibAlluoToActiveStreamers[msg.sender].remove(_sender);
        }
        ibAlluoStreamDataToTimestamp[msg.sender][_sender][_receiver] = 0;
    }

    function checker()
        external
        view
        returns (bool canExec, bytes memory execPayload)
    {
        for (uint256 i; i < ibAlluoAddresses.length; i++) {
            address ibAlluo = ibAlluoAddresses[i];
            for (
                uint256 j;
                j < ibAlluoToActiveStreamers[ibAlluo].length();
                j++
            ) {
                address sender = ibAlluoToActiveStreamers[ibAlluo].at(j);
                address[] memory receivers = ibAlluoToStreamingData[ibAlluo][
                    sender
                ].values();
                (bool isClose, address receiver) = _isStreamCloseToEndDate(
                    sender,
                    ibAlluo,
                    receivers
                );
                if (isClose) {
                    return (
                        true,
                        abi.encodeWithSelector(
                            SuperfluidEndResolver.liquidateSender.selector,
                            sender,
                            receiver,
                            ibAlluo
                        )
                    );
                }
            }
        }
        return (canExec, execPayload);
    }

    function _isStreamCloseToEndDate(
        address _sender,
        address _token,
        address[] memory _receivers
    ) internal view returns (bool, address) {
        for (uint256 i; i < _receivers.length; i++) {
            uint256 timestamp = ibAlluoStreamDataToTimestamp[_token][_sender][
                _receivers[i]
            ];
            if (timestamp != 0 && block.timestamp >= timestamp) {
                return (true, _receivers[i]);
            }
        }
        return (false, address(0));
    }

    function isStreamCloseToEndDate(
        address _sender,
        address _token,
        address _receiver
    ) public view returns (bool) {
        uint256 timestamp = ibAlluoStreamDataToTimestamp[_token][_sender][
            _receiver
        ];
        if (timestamp != 0 && block.timestamp >= timestamp) {
            return true;
        }
        return false;
    }

    function liquidateSender(
        address _sender,
        address _receiver,
        address _token
    ) external onlyRole(GELATO) {
        if (!isStreamCloseToEndDate(_sender, _token, _receiver)) {
            return;
        }
        try IIbAlluo(_token).stopFlowWhenCritical(_sender, _receiver) {} catch {
            ibAlluoToStreamingData[_token][_sender].remove(_receiver);
            if (ibAlluoToStreamingData[_token][_sender].length() == 0) {
                ibAlluoToActiveStreamers[_token].remove(_sender);
            }
            ibAlluoStreamDataToTimestamp[_token][_sender][_receiver] = 0;
        }
        emit ClosedStreamEndDate(_sender, _receiver);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface IVoteExecutorMaster {

    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    //vote creation stage

    function encodeApyCommand(
        string memory _ibAlluoName, //exact ibAlluo symbol
        uint256 _newAnnualInterest, 
        uint256 _newInterestPerSecond
    ) external pure returns (
        uint256, // command index == 0
        bytes memory
    );

    function encodeMintCommand(
        uint256 _newMintAmount, 
        uint256 _period  // for how many days is this amount
    ) external pure returns (
        uint256, // command index == 1
        bytes memory // comcand
    );

    //after vote stage

    function encodeAllCommands(
        uint256[] memory _commandIndexes, 
        bytes[] memory _commands
    ) external pure returns (
        bytes32 messagesHash, 
        Message[] memory messages,
        bytes memory inputData  // final data for subitData()
    );

    function submitData(bytes memory data) external;
}

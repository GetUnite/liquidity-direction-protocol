// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/utils/Address.sol";

contract PseudoMultisigWallet {
    using Address for address;
    address[] public owners;

    constructor(bool _isFork) {
        uint256 id;
        owners.push(msg.sender);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := chainid()
        }

        if(!_isFork){
            // solhint-disable-next-line reason-string
            require(
                id == 1337 || id == 31337,
                "Do not deploy this contract on public networks!"
            );
        }

    }

    function executeCall(address destination, bytes calldata _calldata)
        external
        returns (bytes memory)
    {
        require(_checkCaller(msg.sender));
        return destination.functionCall(_calldata);
    }

    function addOwners(address _newOwner) external {
        require(msg.sender == owners[0]);
        owners.push(_newOwner);
    }
    
    function _checkCaller(address _caller) internal view returns (bool validCaller) {
        for (uint i; i < owners.length; i++) {
            if (owners[i] == _caller) {
                validCaller = true;
            }
        }
    }
    
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
}

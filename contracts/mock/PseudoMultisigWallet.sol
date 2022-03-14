// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/utils/Address.sol";

contract PseudoMultisigWallet {
    using Address for address;

    constructor(bool _isFork) {
        uint256 id;
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
        return destination.functionCall(_calldata);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../contracts/LiquidityBufferVault.sol";

contract Resolver is AccessControl {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Withdrawal {
        // address of user that did withdrawal
        address user;
        // address of token that user chose to receive
        address token;
        // amount to recieve
        uint256 amount;
        // withdrawal time
        uint256 time;
    };

    event RequestSatified(
        uint256 timeSatisfied
    );

    
    address public liquidityBufferAddress;

    //current liquidityBuffer on Polygon: 0xa248Ba96d72005114e6C941f299D315757877c0e
    constructor(address _newAdmin, address _liquidityBuffer) public {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        liquidityBufferAddress = _liquidityBuffer;
    }
    
    function checker()
        external
        returns (bool canExec, bytes memory execPayload)
    {
        uint256 latestRequest = LiquidityBufferVault(liquidityBufferAddress).lastWithdrawalRequest();
        uint256 latestProcessed = LiquidityBufferVault(liquidityBufferAddress).lastSatisfiedWithdrawal();

        if( latestRequest != latestProcessed ){
            Withdrawal latestWithdrawal = LiquidityBufferVault(liquidityBufferAddress).withdrawals(latestProcessed);
            if(LiquidityBufferVault(liquidityBufferAddress).getBufferAmount() > latestWithdrawal.amount){
                LiquidityBufferVault(liquidityBufferAddress).satisfyWithdrawals();
                RequestSatified(block.timestamp);
            }
        }

    }

    function changeLiquidityBuffer(address _liquidityBuffer) external {
        liquidityBufferAddress = _liquidityBuffer;
    }
}
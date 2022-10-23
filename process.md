# Migration algorithm

1. Checkout to new code branch, check that .openzeppelin files are clear from changes
2. (G) Pause old vlAlluo contract
3. (G) Execute liquidity pool transition
4. (S) Deploy new vlAlluo contract
5. (S) Deploy `cvxDistributor` contract
6. (S) Upgrade `VoteExecutorV2` contract
    1. Check upgrade conditions
7. (G) Call `initRewards()` on upgraded `VoteExecutorV2`
8. (G) Grant `PROTOCOL_ROLE` on cvxDistributor to upgraded `VoteExecutorV2`
9. (G) Call `setCvxDistributor(address)` on new vlAlluo with deployed `cvxDistributor` contract address
10. (S) Run script to download all lockers data from old vlAlluo, review new values to be set for each locker
11. (G?) If all values look good, call `migrationLock(address[],uint256[])` on new vlAlluo to migrate all current lockers from old contract
12. (G) Call `migrateWithdrawOrClaimValues(address[],bool)` to migrate current debts to new contract (`true` is to migrate pending withdrawals, `false` is to migrate claim for users who don't have vlAlluo). Please note that attempt to migrate claim for user who has any of vlAlluo will be reverted, use `migrationLock` for those users.
13. (G) Top up CVX balance of `cvxDistributor` via `VoteExecutorV2`, if needed
14. Push .openzeppelin files


# CVX Rewards distribution algorithm

1. (G) Unwind votes or top up `VoteExecutorV2` with any token listed on `Exchange`
2. (G) Call `deliverRewards(address,address,uint256)` on `VoteExecutorV2`. 
    Params:
    1. `cvxDistributor` - address of `cvxDistributor` contract
    2. `tokenFrom` - address of token to exchange to WETH (note: if `tokenFrom` is WETH, exchange step will be skipped and much less gas would be consumed)
    3. `amount` - amount of `tokenFrom` value to be distributed.
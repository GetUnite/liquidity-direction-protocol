# ibAlluo functions usage
## Deposit

Deposits are executed by calling function:
```solidity
function deposit(
    address _token,
    uint256 _amount
) external returns (uint256);
```
Here parameters meaning will be exactly same as before:
- `token` - address of token that will be deposited
- `amount` - amount of specified tokens that will be taken from the user

The only thing that changes here is ibAlluoUSD and ibAlluoEUR token mint amount (ibAlluoETH and ibAlluoBTC are working in same way).

ibAlluo mint amount is calculated by this formula:

`mintAmount = amount * tokenPrice / growingRatio`

where:
- `amount` - amount of tokens deposited
- `tokenPrice` - price of the token given by `PriceFeedRouterV2` contract
- `growingRatio` - ratio that always increases every second at APY rate

`PriceFeedRouterV2` is deployed on:
- Polygon Mainnet: `0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2`
- Mumbai Testnet: `0x6008dC24B8f7a49191847f32994df7e9F29737cc`

Note that `deposit` contract function has a return value. When executing transaction, the return value can be only seen if it was emitted in any event. At any point of time, you may use `deposit` as a view function, in order to pre-calculate amount of ibAlluo minted, if needed:
```ts
const ibAlluoToBeMinted = await ibAlluoUSD.callStatic.deposit(usdc.address, depositAmount)
```
Function call above won't emit any transaction on blockchain and will act just like regular view function. However, it does not silence any errors that may occur inside this function (e.g. if query is made for user who deposits without making any approve, this function will throw an exception)

### Events
Events that may be emitted by depositing are:

`Transfer(address indexed from, address indexed to, uint256 value);`
- `from` - when depositing, always zero address
- `to` - depositor address
- `value` - amount of ibAlluo minted 

`TransferAssetValue(address indexed from, address indexed to, uint256 tokenAmount, uint256 assetValue, uint256 growingRatio);`
- `from` - when depositing, always zero address 
- `to` - depositor address
- `tokenAmount` - amount of ibAlluo minted
- `assetValue` - amount of deposited tokens, converted to 18 decimals (e.g. if 10.0 USDC or 10.0 DAI are deposited, raw value of this param will be same in both cases and will be equal 10000000000000000000) 
- `growingRatio` - growing ratio value that was used in calculations

`Deposited(address indexed user, address token, uint256 amount);`
- `user` - depositor address
- `token` - deposited token
- `amount` - amount of deposited tokens

`PriceInfo(uint256 price, uint8 priceDecimals)`
- `price` - price of deposited token (in USD or EUR, depending on which ibAlluo is called)
- `priceDecimals` - precision of given price, could be varibale and greater than 18

### Frontend data to display
As I understand, for the deposit transaction the only data that has to be calculated and shown in frontend (moblile app) is transaction deposit history in USD. I think correct way to do this would be:
1. query both events `Deposited` (filtering by targer user address) and `PriceInfo`
2. for each `Deposited` event: find `PriceInfo` event, that was emitted in same transaction (condition: `depositedQueryFilterResult[i].transactionHash == priceInfoQueryFliterResult[j].transactionHash`)
3. if `PriceInfo` event was found in `Deposited` transaction, USD value of deposit would be: `(deposited.args.amount * priceInfo.args.price) div (10 ^ priceInfo.args.priceDecimals)`
4. else, use old calculations.

### Example #1 - growingRatio = 1:
Assuming that `growingRatio` is 1.0 (meaning that ibAlluo did not give any APY since contract deployment) and function `getPrice(USDC_ADDRESS, 1)` returns 1.01 (meaning that 1 USDC currently costs 1.01 USD)

If user calls `deposit(USDC_ADDRESS, 100.0)` on ibAlluoUSD, 101.0 ibAlluoUSD tokens will be minted to the user.

Displayed USD value of deposit would be: `100.0 USDC * 1.01 USD/USDC = 101.0 USD`

Note: function `getPrice` accepts 2 params - token address and fiat id. On Polygon these fiat ids are set:
- 1 - USD
- 2 - EUR
- 3 - GBP

### Example #2 - real growingRatio:
Assuming that `growingRatio` is 1.054 (meaning that whoever has deposited into ibAlluo when `growingRatio` was exactly 1.0 now has exactly 1.054 times more money) and function `getPrice(PAR_ADDRESS, 2)` returns 0.98 (meaning that 1 PAR currently costs 0.98 EUR)

If user calls `deposit(PAR_ADDRESS, 100.0)` on ibAlluoEUR, 92.97912... ibAlluoEUR tokens will be minted to the user.

Displayed EUR value of deposit would be: `100.0 PAR * 0.98 EUR/PAR = 98.0 EUR`

## Withdraw
Withdrawals are executed by calling either of these functions:
```solidity
function withdrawTo(
    address _recipient,
    address _targetToken,
    uint256 _amount
) public returns (uint256 targetTokenReceived, uint256 ibAlluoBurned);

function withdraw(
    address _targetToken,
    uint256 _amount
) external returns (uint256 targetTokenReceived, uint256 ibAlluoBurned);
```

Here parameters meaning will be slightly different from what we had before:
- `recipient` - receiver of withdrawn tokens
- `targetToken` - token to withdraw
- `amount` - USD (or EUR) value to withdraw, in 18 decimals

If you use this as view function, return values would be:
- `targetTokenReceived` - how much `targetToken` is going to be received
- `ibAlluoBurned` - how much ibAlluo tokens will be taken from user

So, now this function will be always recalculating for token price. Amount of tokens that user is going to receive is calculated by this formula:

`tokenReceivedAmount = amount / price`

where:
- `amount` - amount of USD (or EUR) value requested
- `price` - price of target token in USD (or EUR) given by `PriceFeedRouterV2`

### Events
Events that may be emitted by withdrawing are: 

`PriceInfo(uint256 price, uint8 priceDecimals)`
- `price` - price of target token (in USD or EUR, depending on which ibAlluo is called)
- `priceDecimals` - precision of given price, could be varibale and greater than 18

`TransferAssetValue(address indexed from, address indexed to, uint256 tokenAmount, uint256 assetValue, uint256 growingRatio);`
- `from` - withdrawing user address
- `to` - when withdrawing, always zero address
- `tokenAmount` - amount of ibAlluo burned
- `assetValue` - amount of target token received
- `growingRatio` - growing ratio value that was used in calculations

`BurnedForWithdraw(address indexed user, uint256 amount)`
- `user` - withdrawing user address
- `amount` - amount of ibAlluo burned

### Secondary events (emitted by other contract)
`AddedToQueue(address ibAlluo, address indexed user, address token, uint256 amount, uint256 queueIndex, uint256 requestTime);` - from Liquidity Handler
- `ibAlluo` - ibAlluo contract address
- `user` - user who was added to the withdrawal queue
- `token` - token that was requested to withdraw
- `amount` - amount of tokens that would be sent, if withdrawal would be satisfied immideatley
- `queueIndex` - position in withdrawal queue
- `requestTime` - timestamp when user was added

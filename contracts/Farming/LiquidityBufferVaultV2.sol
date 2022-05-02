// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IbAlluoV2.sol";
import "hardhat/console.sol";

contract LiquidityBufferVaultV2 is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable 
{
    
    using Address for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // admin and reserves address
    address public wallet;

    // size of the acceptable slippage with 2 decimals
    // 125 = 1.25%
    uint32 public slippage;

    // address of main contract with which users will interact  
    address public alluoLp;

    //flag for upgrades availability
    bool public upgradeStatus;

    //flag for chainlink keepers that withdrawal can be satisfied 
    bool public keepersTrigger;

    // percent of total alluoLp value which will go to curve pool
    // 525 = 5.25%
    uint32 public bufferPercentage;

    // amount which needed to satisfy all users in withdrawal list
    uint256 public totalWithdrawalAmount;

    // max waiting withdrawals time after which them should be satisfyed
    uint256 public maxWaitingTime;

    struct Withdrawal {
        // address of user that did withdrawal
        address user;
        // address of token that user chose to receive
        address token;
        // amount to recieve
        uint256 amount;
        // withdrawal time
        uint256 time;
    }

    // list of Withdrawals in queue
    mapping(uint256 => Withdrawal) public withdrawals;

    // index of last withdrawal in queue
    uint256 public lastWithdrawalRequest;
    // index of last satisfied withdrawal in queue
    uint256 public lastSatisfiedWithdrawal;


    event EnoughToSatisfy(
        uint256 inBufferAfterDeposit, 
        uint256 totalAmountInWithdrawals
    );

    event WithdrawalSatisfied(
        address indexed user, 
        address token, 
        uint256 amount, 
        uint256 queueIndex,
        uint256 satisfiedTime
    );

    event AddedToQueue(
        address indexed user, 
        address token, 
        uint256 amount,
        uint256 queueIndex,
        uint256 requestTime
    );

    struct InputToken {
        address tokenAddress;
        uint32 swapProtocol;
        address poolAddress;
    }
    mapping(address => InputToken) public inputTokenMapping;
    mapping(uint32 => address) public adaptors;

    //  This is the primary token the contract will convert all holdings to.
    address public primaryToken;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet, address _alluoLp) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "Buffer: Not contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _alluoLp);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);

        wallet = _multiSigWallet;
        bufferPercentage = 500;
        slippage = 200;

        alluoLp = _alluoLp;
        maxWaitingTime = 3600 * 23;
    }

    /** @notice Allow multisig wallet to take out funds. This is when there is no adaptor/pool used.
     ** @param _token Address of the token input
     ** @param _amount Amount of tokens (correct decimals, 10**18 DAI, 10**6 USDC)
     */
    function sendFundsToMultiSig(address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        IERC20Upgradeable(_token).transfer(wallet, _amount);
    }


    /** @notice Deposits tokens into an LP using the adaptor.
    * @dev If there is no adaptor, do nothing.
    **     Otherwise, delegateCall the adaptor .
    * NOTE: Input _amount is 10**18. Make sure to standardise it for the token in the adaptor contract (10**18 DAI, 10**6 USDC/USDT)
    ** @param _adaptor Address of the adaptor used
    ** @param _tokenFrom Address of the token.
    ** @param _pool Address of liquidity pool to be used.
    ** @param _amount Amount of tokens in 10**18
    */
    function enterAdaptorDelegateCall(
        address _adaptor,
        address _tokenFrom,
        address _pool,
        uint256 _amount
        ) internal whenNotPaused returns (uint256) {
        if (_adaptor == address(0)) {
            return _amount;
        } else {
            bytes memory returnedData = _adaptor.functionDelegateCall(
                abi.encodeWithSelector(bytes4(keccak256(bytes("enterAdaptor(address,address,address,uint256,address,uint256)"))),
                _tokenFrom, primaryToken, wallet , _amount, _pool, slippage)
            );
            return abi.decode(returnedData, (uint256));
        }
    }

    /** @notice Converts tokens to main tokens using the adaptor. 
    * @dev If there is no adaptor, do nothing.
    **     Otherwise, delegateCall the adaptor .
    * NOTE: Input _amount is 10**18. Make sure to standardise it for the token in the adaptor contract (10**18 DAI, 10**6 USDC/USDT)
    ** @param _adaptor Address of the adaptor used
    ** @param _tokenFrom Address of the token.
    ** @param _pool Address of liquidity pool to be used.
    ** @param _amount Amount of tokens in 10**18
    */
    function convertTokenToPrimaryToken(
        address _adaptor,
        address _tokenFrom,
        address _pool,
        uint256 _amount
    ) internal whenNotPaused returns (uint256) {
        if (_adaptor == address(0)) {
            return _amount;
        } else {
            bytes memory returnedData = _adaptor.functionDelegateCall(
                abi.encodeWithSelector(bytes4(keccak256(bytes("convertTokenToPrimaryToken(address,uint256,address)"))),
                _tokenFrom, _amount, _pool)
            );
            return abi.decode(returnedData, (uint256));
        }
    }

    /** @notice Removes tokens from LP using the adaptor.
    * @dev If there is no adaptor, do nothing.
    **     Otherwise, delegateCall the adaptor .
    * NOTE: Input _amount is 10**18. Make sure to standardise it for the token in the adaptor contract (10**18 DAI, 10**6 USDC/USDT)
    ** @param _adaptor Address of the adaptor used
    ** @param _user Address of the user (msg.sender)
    ** @param _tokenFrom Address of the token.
    ** @param _pool Address of liquidity pool to be used.
    ** @param _amount Amount of tokens in 10**18
    */
    function exitAdaptorDelegateCall(
        address _adaptor,
        address _user,
        address _tokenFrom,
        address _pool,
        uint256 _amount
        ) internal whenNotPaused returns (uint256) {
        if (_adaptor == address(0)) {
            IERC20Upgradeable(_tokenFrom).safeTransfer(_user, _amount);
            return _amount;
        } else {
            bytes memory returnedData = _adaptor.functionDelegateCall(
                abi.encodeWithSelector(bytes4(keccak256(bytes("exitAdaptor(address,address,address,address,uint256,address,uint256)"))),
                _user, _tokenFrom, primaryToken, wallet, _amount, _pool, slippage )
            );
            console.log("POOL", _pool);
            return abi.decode(returnedData, (uint256));
        }
    }


    /** @notice DelegateCalls the adaptor to check liquid balance.
    * @dev If there is no adaptor, funds are being held on the contract so just .balanceOf
    **     Otherwise, delegateCall the adaptor .
    ** @param _adaptor Address of the adaptor used
    ** @param _tokenFrom Address of the token.
    ** @param _pool Address of liquidity pool to be used.
    */
    function exitAdaptorDelegateCallBalanceCheck (
        address _adaptor,
        address _tokenFrom,
        address _pool
        ) internal whenNotPaused returns (uint256) {
        // This returns all the immediately liquidatable funds
        // Liquidatable: All funds on chain
        // Not liquidatable: Funds which have been bridged.
         if (_adaptor == address(0)) {
            return IERC20Upgradeable(_tokenFrom).balanceOf(address(this));
        } else {
            bytes memory returnedData = _adaptor.functionDelegateCall(
                abi.encodeWithSelector(bytes4(keccak256(bytes("exitAdaptorGetBalance(address)"))),
                _pool)
            );
            return abi.decode(returnedData, (uint256)); 
        }
    }

    /** @notice DelegateCalls the adaptor to ERC approve the different tokens.
    * @dev Only delegateCall if the adaptor is active.
    ** @param _adaptor Address of the adaptor used
    ** @param _pool Address of liquidity pool to be used.
    */
    function approveAllDelegateCall (
        address _adaptor,
        address _pool) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
         if (_adaptor != address(0)) {
            bytes memory returnedData = _adaptor.functionDelegateCall(
                abi.encodeWithSelector(bytes4(keccak256(bytes("AdaptorApproveAll(address)"))), _pool)
            );
        } 
    }

    /** @notice Check withdrawal queue and satsify all withdrawals possible.
    * @dev Checks if there are outstanding withdrawal and if there are, loops around until there are not enough funds to satisfy anymore 
    **     or until all withdrawals ar satisfied.
    */
    function satisfyWithdrawals() public whenNotPaused{
        if (lastWithdrawalRequest != lastSatisfiedWithdrawal) {
            uint256 inBuffer = getBufferAmount();
            while (lastSatisfiedWithdrawal != lastWithdrawalRequest) {
                Withdrawal memory withdrawal = withdrawals[lastSatisfiedWithdrawal + 1];
                uint256 amount = withdrawal.amount;
                if (amount <= inBuffer) {
                    InputToken memory currentToken = inputTokenMapping[withdrawal.token];
                    address adaptor = adaptors[currentToken.swapProtocol];
                    // Amount is in 10**18
                    exitAdaptorDelegateCall(adaptor, withdrawal.user, withdrawal.token, currentToken.poolAddress, amount);
                    inBuffer -= amount;
                    totalWithdrawalAmount -= amount;
                    lastSatisfiedWithdrawal++;
                    keepersTrigger = false;
                    
                    emit WithdrawalSatisfied(
                        withdrawal.user, 
                        withdrawal.token, 
                        amount, 
                        lastSatisfiedWithdrawal,
                        block.timestamp
                    );

                } else {
                    break;
                }
            }
        }
    }

    /** @notice Called by ibAlluo, deposits tokens into the buffer.
    * @dev Deposits funds, checks whether buffer is filled or insufficient, and then acts accordingly.
    ** @param _user Address of depositor (msg.sender)
    ** @param _token Address of token (USDC, DAI, USDT...)
    ** @param _amount Amount of tokens in correct deimals (10**18 for DAI, 10**6 for USDT)
    */
    function deposit(address _user, address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 inBuffer = getBufferAmount();
        IERC20Upgradeable(_token).safeTransferFrom(_user, address(this), _amount);
        _amount = _amount * 10** (18 - ERC20(_token).decimals());
        uint256 expectedBufferAmount = getExpectedBufferAmount(_amount);
        InputToken memory currentToken = inputTokenMapping[_token];
        address adaptor = adaptors[currentToken.swapProtocol];

        if (inBuffer < expectedBufferAmount) {
            if (expectedBufferAmount < inBuffer + _amount) {
                // Only deposit the amount exceeding the min buffer into the adaptor
                // Convert/Keep remainder input tokens to primary token
                uint256 toBeDeposited = inBuffer + _amount - expectedBufferAmount;
                uint256 remainder = _amount - toBeDeposited;
                enterAdaptorDelegateCall(adaptor, _token, currentToken.poolAddress, toBeDeposited);
                convertTokenToPrimaryToken(adaptor, _token, currentToken.poolAddress, remainder);
                // This can be costly for users. Use gelato instead to call satisfyWithdrawals();
                // satisfyWithdrawals();
            } else {
                // Else, if ,after the deposit, the buffer is not filled, just hold funds, but convert to primary token. (do nothing)
                // This includes if outstanding withdrawals exist. Therefore, convert and satisfyWithdrawals() to confirm.
                convertTokenToPrimaryToken(adaptor, _token, currentToken.poolAddress, _amount);
                // This can be costly for users. Use gelato instead to call satisfyWithdrawals();
                // satisfyWithdrawals();

            }
          
        } else {
            // If there is sufficient funds in the buffer, immediately send all funds to adaptor
            // Now do delegate call and deposit funds in a LP using an LP
            enterAdaptorDelegateCall(adaptor,  _token, currentToken.poolAddress, _amount);
        }
    }



    /** @notice Called by ibAlluo, withdraws otkens form the buffer.
    * @dev Attempt to withdraw. If there are insufficient funds, you are added to the queue.
    ** @param _user Address of depositor (msg.sender)
    ** @param _token Address of token (USDC, DAI, USDT...)
    ** @param _amount Amount of tokens in correct deimals (10**18 for DAI, 10**6 for USDT)
    */
    function withdraw(address _user, address _token, uint256 _amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        uint256 inBuffer = getBufferAmount();
        InputToken memory currentToken = inputTokenMapping[_token];
        address adaptor = adaptors[currentToken.swapProtocol];
        // Convert amount to 10**18 as we require consistency in coin decimals.
        _amount = _amount * 10** (18 - ERC20(_token).decimals());
        if (inBuffer >= _amount && lastWithdrawalRequest == lastSatisfiedWithdrawal) {
            // If there are enough funds to payout + all requests are satisfied,
            exitAdaptorDelegateCall(adaptor, _user, _token, currentToken.poolAddress, _amount);
            emit WithdrawalSatisfied(_user, _token, _amount, 0, block.timestamp);
        } else {
            // Else, if there aren't enough funds, add to queue.
            lastWithdrawalRequest++;
            uint256 timeNow = block.timestamp;
            withdrawals[lastWithdrawalRequest] = Withdrawal({
                user: _user,
                token: _token,
                amount: _amount,
                time: timeNow
            });
            totalWithdrawalAmount += _amount;
            emit AddedToQueue(_user, _token, _amount, lastWithdrawalRequest, timeNow);
        }
    }

    
    function setSlippage(uint32 _newSlippage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippage = _newSlippage;
    }

    function setBufferPersentage(uint32 _newPercentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bufferPercentage = _newPercentage;
    }
    
    function getExpectedBufferAmount(uint256 _newAmount) public view returns(uint256) {
        // Expected buffer amount = 
        //  (newDeposit + totalSupply ibAlluo * index) * bufferPercentage + outstanding withdrawals
        // This is in 10**18.
        return (_newAmount + IERC20Upgradeable(alluoLp).totalSupply()* IbAlluoV2(alluoLp).growingRatio()/10**18) * bufferPercentage / 10000 + totalWithdrawalAmount;
    }

    // This is a view function but incorrectly compiles due to the architecture of delegateCall.
    function getBufferAmount() public  returns(uint256) {
        InputToken memory currentToken = inputTokenMapping[primaryToken];
        address adaptor = adaptors[currentToken.swapProtocol];
        return exitAdaptorDelegateCallBalanceCheck(adaptor, primaryToken, currentToken.poolAddress);
    }


    /** @notice Called by admin to register new adaptors.
    ** @param _adaptors Array of adaptor addresses
    ** @param protocolIds Array of protocol id (these are not addresses! Ex. 0 = Uniswap adaptor, 1 = Curve adaptor... 
    **                     InputToken.swapProtocol points to this index and InputToken.,poolAddress gives the actual pool address
    */
    function registerAdaptors(
        address[] calldata _adaptors,
        uint32[] calldata protocolIds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = _adaptors.length;
        require(length == protocolIds.length, "Buffer: length discrepancy");
        for (uint256 i = 0; i < length; i++) {
            adaptors[protocolIds[i]] = _adaptors[i];
        }
    }

    /** @notice Called by admin to unregister adaptors.
    ** @param protocolIds Array of protocol id (these are not addresses! Ex. 0 = Uniswap adaptor, 1 = Curve adaptor... 
    **                     InputToken.swapProtocol points to this index and InputToken.,poolAddress gives the actual pool address
    */
    function unregisterAdaptors(
        uint32[] calldata protocolIds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = protocolIds.length;
        for (uint256 i = 0; i < length; i++) {
            delete adaptors[protocolIds[i]];
        }
    }

    /** @notice Called by admin to register data for input tokens. (Ex. USDC, DAI, USDT )
    ** @param inputTokenAddresses Array of input token addresses (address for USDC, DAI, USDT...)
    ** @param protocolIds Array of protocol id (these are not addresses! Ex. 0 = Uniswap adaptor, 1 = Curve adaptor... 
    **                     InputToken.swapProtocol points to this index and InputToken.,poolAddress gives the actual pool address
    ** @param poolAddresses Array of the liquidity pool addresses used to swap.
    */
    function registerInputTokens(
        address[] calldata inputTokenAddresses,
        uint32[] calldata protocolIds,
        address[] calldata poolAddresses
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = inputTokenAddresses.length;
        require(length == protocolIds.length && length == poolAddresses.length, "Buffer: length discrepancy");
        for (uint256 i = 0; i < length; i++) {
            InputToken memory currentToken = InputToken(inputTokenAddresses[i], protocolIds[i], poolAddresses[i]);
            inputTokenMapping[inputTokenAddresses[i]] = currentToken;
        }
    }

    /** @notice Called by admin to unregister inputToken data.
    ** @param inputTokenAddresses Array of input token addresses (address for USDC, DAI, USDT...)
    */
    function unregisterInputTokens(
        address[] calldata inputTokenAddresses
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = inputTokenAddresses.length;
        for (uint256 i = 0; i < length; i++) {
            delete inputTokenMapping[inputTokenAddresses[i]];
        }
    }

    /** @notice Called by admin to set the main token that funds are held in.
    ** @param newPrimaryToken Address of the token. Ex. Main token for USD buffer is USDC.
    */
    function setPrimaryToken(address newPrimaryToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        primaryToken = newPrimaryToken;
    }

    function setWallet(address newWallet)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newWallet.isContract(), "Buffer: Not contract");

        wallet = newWallet;
    }

    function setAlluoLp(address newAlluoLp)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newAlluoLp.isContract(), "Buffer: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, newAlluoLp);
        if (alluoLp != wallet) {
            _revokeRole(DEFAULT_ADMIN_ROLE, alluoLp);
        }
        alluoLp = newAlluoLp;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        if(role == DEFAULT_ADMIN_ROLE){
            require(account.isContract(), "Buffer: Not contract");
        }
        _grantRole(role, account);
    }


    function changeUpgradeStatus(bool _status)
    external
    onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function getWithdrawalPosition(uint256 _index) external view returns(uint256){
        if(_index != 0 && _index <= lastWithdrawalRequest && _index > lastSatisfiedWithdrawal ){
            return _index - lastSatisfiedWithdrawal;
        }
        else{
            return 0;
        }
    }

    function isUserWaiting(address _user) external view returns(bool){
        if(lastWithdrawalRequest != lastSatisfiedWithdrawal){
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].user == _user){
                    return true;
                }
            }
        }
        return false;
    }

    function getUserActiveWithdrawals(address _user) external view returns(uint256[] memory){
        if(lastWithdrawalRequest != lastSatisfiedWithdrawal){
            uint256 userRequestAmount;
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].user == _user){
                    userRequestAmount++;
                }
            }
            uint256[] memory indexes = new uint256[](userRequestAmount);
            uint256 counter;
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].user == _user){
                    indexes[counter] = i;
                    counter++;
                }
            }
            return indexes;
        }
        uint256[] memory empty;
        return empty;
    }

    function getCloseToLimitWithdrawals()external view returns(uint256[] memory, uint256 amount){
        if(lastWithdrawalRequest != lastSatisfiedWithdrawal){
            uint256 counter;
            for(uint i = lastSatisfiedWithdrawal + 1; i <= lastWithdrawalRequest; i++){
                if(withdrawals[i].time >= maxWaitingTime){
                    amount += withdrawals[i].amount;
                    counter++;
                }
            }
            uint256[] memory indexes = new uint256[](counter);
            if(counter !=0){
                uint256 newCounter;
                for(uint i = lastSatisfiedWithdrawal + 1; i <= lastSatisfiedWithdrawal + counter; i++){
                    indexes[newCounter] = i;
                    newCounter++;
                }
            }
            return (indexes, amount);
        }
        uint256[] memory empty;
        return (empty, 0);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override {
        require(upgradeStatus, "Buffer: Upgrade not allowed");
        upgradeStatus = false;
    }
}

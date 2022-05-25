// // SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../testnet/FakeBalancer.sol";


contract AlluoLockedV3ForTest is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ERC20 token locked on the contract and earned by locker as reward.
    IERC20Upgradeable public alluoToken;
    IERC20Upgradeable public weth;    
    // Locking's reward amount produced per distribution time.
    uint256 public rewardPerDistribution;
    // Locking's reward distribution time.
    uint256 public constant distributionTime = 86400; 
    // Amount of currently locked tokens from all users.
    uint256 public totalLocked;

    // Аuxiliary parameter (tpl) for locking's math
    uint256 private tokensPerLock;
    // Аuxiliary parameter for locking's math
    uint256 private rewardProduced;
    // Аuxiliary parameter for locking's math
    uint256 private allProduced;
    // Аuxiliary parameter for locking's math
    uint256 private producedTime;

    //period of locking after lock function call
    uint256 public depositLockDuration;
    //period of locking after unlock function call
    uint256 public withdrawLockDuration;

    // Amount of locked tokens waiting for withdraw (in Alluo).
    uint256 public waitingForWithdrawal;
    // Amount of currently claimed rewards by the users.
    uint256  public totalDistributed;
    // flag for allowing upgrade
    bool public upgradeStatus;

    //erc20-like interface
    struct TokenInfo {
        string name;
        string symbol;
        uint8 decimals;
    }

    TokenInfo private token;

    // Locker contains info related to each locker.
    struct Locker {
        uint256 amount; // Tokens currently locked to the contract and vote power (in lp)
        uint256 rewardAllowed; // Rewards allowed to be paid out
        uint256 rewardDebt; // Param is needed for correct calculation locker's share
        uint256 distributed; // Amount of distributed tokens
        uint256 unlockAmount; // Amount of tokens which is available to withdraw (in alluo)
        uint256 depositUnlockTime; // The time when tokens are available to unlock
        uint256 withdrawUnlockTime; // The time when tokens are available to withdraw
    }

    // Lockers info by token holders.
    mapping(address => Locker) public _lockers;

    address public alluoBalancerLp;

    /**
     * @dev Emitted in `updateWithdrawLockDuration` when the lock time after unlock() was changed
     */
    event WithdrawLockDurationUpdated(uint256 time, uint256 timestamp);

    /**
     * @dev Emitted in `updateDepositLockDuration` when the lock time after lock() was changed
     */
    event DepositLockDurationUpdated(uint256 time, uint256 timestamp);

    /**
     * @dev Emitted in `setReward` when the new rewardPerDistribution was set
     */
    event RewardAmountUpdated(uint256 amount, uint256 produced);

    /**
     * @dev Emitted in `lock` when the user locked the tokens
     */
    event TokensLocked(
        address indexed sender,
        address tokenAddress, 
        uint256 tokenAmount, 
        uint256 lpAmount, 
        uint256 time
    );

    /**
     * @dev Emitted in `unlock` when the user unbinded his locked tokens
     */
    event TokensUnlocked(
        address indexed sender,
        uint256 alluoAmount,
        uint256 lpAmount,
        uint256 time
    );
    
    /**
     * @dev Emitted in `withdraw` when the user withdrew his locked tokens from the contract
     */
    event TokensWithdrawed(
        address indexed sender,
        uint256 alluoAmount,
        uint256 time
    );

    /**
     * @dev Emitted in `claim` when the user claimed his reward tokens
     */
    event TokensClaimed(
        address indexed sender,
        uint256 alluoAmount, 
        uint256 time
    );

    // allows to see balances on etherscan  
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Contract constructor without parameters
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}
 
    /**
     * @dev Contract initializer 
     */
     function initialize(
        address _multiSigWallet,
        address _token,
        uint256 _rewardPerDistribution,
        address _balancer,
        address _weth
    ) public initializer{
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();


        _setupRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _setupRole(UPGRADER_ROLE, _multiSigWallet);

        token = TokenInfo({
            name: "Vote Locked Alluo Token",
            symbol: "vlAlluo",
            decimals: 18
        });

        rewardPerDistribution = _rewardPerDistribution; // set it to zero at the begining
        producedTime = block.timestamp;

        depositLockDuration = 60; // should we set lower? 
        withdrawLockDuration = 120;

        alluoToken = IERC20Upgradeable(_token);
        weth = IERC20Upgradeable(_weth);

        alluoBalancerLp = _balancer;

        alluoToken.approve(_balancer, type(uint256).max);
        weth.approve(_balancer, type(uint256).max);
    }

    function decimals() public view returns (uint8) {
        return token.decimals;
    }

    function name() public view returns (string memory) {
        return token.name;
    }

    function symbol() public view returns (string memory) {
        return token.symbol;
    }

    /**
     * @dev Calculates the necessary parameters for locking
     * @return Totally produced rewards
     */
    function produced() private view returns (uint256) {
        return
            allProduced +
            (rewardPerDistribution * (block.timestamp - producedTime)) /
            distributionTime;
    }

    /**
     * @dev Updates the produced rewards parameter for locking
     */
    function update() public whenNotPaused {
        uint256 rewardProducedAtNow = produced();
        if (rewardProducedAtNow > rewardProduced) {
            uint256 producedNew = rewardProducedAtNow - rewardProduced;
            if (totalLocked > 0) {
                tokensPerLock =
                    tokensPerLock +
                    (producedNew * 1e20) /
                    totalLocked;
            }
            rewardProduced = rewardProduced + producedNew;
        }
    }

    /**
     * @dev Locks specified amount Alluo tokens in the contract
     * @param _amount An amount of Alluo tokens to lock
     */
    function lock(uint256 _amount) public {

        Locker storage locker = _lockers[msg.sender];

        alluoToken.safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        uint256 lpAmount = FakeBalancer(alluoBalancerLp).enterPoolAlluo(_amount);

        if (totalLocked > 0) {
            update();
        }

        locker.rewardDebt =
            locker.rewardDebt +
            ((lpAmount * tokensPerLock) / 1e20);
        totalLocked = totalLocked + lpAmount;
        locker.amount = locker.amount + lpAmount;
        locker.depositUnlockTime = block.timestamp + depositLockDuration;

        emit TokensLocked(msg.sender, address(alluoToken), _amount, lpAmount, block.timestamp );
        emit Transfer(address(0), msg.sender, lpAmount);
    }

    /**
     * @dev Locks specified amount WETH in the contract
     * @param _amount An amount of WETH tokens to lock
     */
    function lockWETH(uint256 _amount) public {

        Locker storage locker = _lockers[msg.sender];

         weth.safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        uint256 lpAmount = FakeBalancer(alluoBalancerLp).enterPoolWeth(_amount);

        if (totalLocked > 0) {
            update();
        }

        locker.rewardDebt =
            locker.rewardDebt +
            ((lpAmount * tokensPerLock) / 1e20);
        totalLocked = totalLocked + lpAmount;
        locker.amount = locker.amount + lpAmount;
        locker.depositUnlockTime = block.timestamp + depositLockDuration;

        emit TokensLocked(msg.sender, address(weth), _amount, lpAmount, block.timestamp);
        emit Transfer(address(0), msg.sender, lpAmount);
    }

    /**
     * @dev Migrates all balances from old contract
     * @param _users list of lockers from old contract
     * @param _amounts list of amounts each equal to the share of locker on old contract
     *          (locked amount + unlocked + claim)
     */
    function migrationLock(address[] memory _users, uint256[] memory _amounts) external onlyRole(DEFAULT_ADMIN_ROLE){

        for(uint i = 0; i < _users.length; i++){
            Locker storage locker = _lockers[_users[i]];

            if (totalLocked > 0) {
                update();
            }

            locker.rewardDebt =
                locker.rewardDebt +
                ((_amounts[i] * tokensPerLock) / 1e20);
            totalLocked = totalLocked + _amounts[i];
            locker.amount = _amounts[i];
            locker.depositUnlockTime = block.timestamp + depositLockDuration;

            emit TokensLocked(_users[i], address(0), 0, _amounts[i], block.timestamp);
            emit Transfer(address(0), _users[i], _amounts[i]);
        }
    }

    /**
     * @dev Unbinds specified amount of tokens
     * @param _amount An amount to unbid
     */
    function unlock(uint256 _amount) public {
        Locker storage locker = _lockers[msg.sender];

        require(
            locker.depositUnlockTime <= block.timestamp,
            "Locking: tokens not available"
        );

        require(
            locker.amount >= _amount,
            "Locking: not enough lp tokens"
        );

        update();

        uint256 alluoAmount = FakeBalancer(alluoBalancerLp).exitPoolAlluo(_amount);

        locker.rewardAllowed =
            locker.rewardAllowed +
            ((_amount * tokensPerLock) / 1e20);
        locker.amount -= _amount;
        totalLocked -= _amount;

        waitingForWithdrawal += alluoAmount;

        locker.unlockAmount += alluoAmount;
        locker.withdrawUnlockTime = block.timestamp + withdrawLockDuration;

        emit TokensUnlocked(msg.sender, alluoAmount, _amount, block.timestamp);
        emit Transfer(msg.sender, address(0), _amount);
    }

    /**
     * @dev Unbinds all amount
     */
    function unlockAll() public {
        Locker storage locker = _lockers[msg.sender];

        require(
            locker.depositUnlockTime <= block.timestamp,
            "Locking: tokens not available"
        );

        uint256 amount = locker.amount;

        require(amount > 0, "Locking: not enough lp tokens");

        update();

        uint256 alluoAmount = FakeBalancer(alluoBalancerLp).exitPoolAlluo(amount);

        locker.rewardAllowed =
            locker.rewardAllowed +
            ((amount * tokensPerLock) / 1e20);
        locker.amount = 0;
        totalLocked -= amount;

        waitingForWithdrawal += alluoAmount;

        locker.unlockAmount += alluoAmount;
        locker.withdrawUnlockTime = block.timestamp + withdrawLockDuration;

        emit TokensUnlocked(msg.sender, alluoAmount, amount, block.timestamp);
        emit Transfer(msg.sender, address(0), amount);
    }

    /**
     * @dev Unlocks unbinded tokens and transfers them to locker's address
     */
    function withdraw() public whenNotPaused {
        Locker storage locker = _lockers[msg.sender];

        require(
            locker.unlockAmount > 0,
            "Locking: not enough tokens"
        );

        require(
            block.timestamp >= locker.withdrawUnlockTime,
            "Locking: tokens not available"
        );

        uint256 amount = locker.unlockAmount;
        locker.unlockAmount = 0;
        waitingForWithdrawal -= amount;

        alluoToken.safeTransfer(msg.sender, amount);
        emit TokensWithdrawed(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Сlaims available rewards
     */
    function claim() public {
        if (totalLocked > 0) {
            update();
        }

        uint256 reward = calcReward(msg.sender, tokensPerLock);
        require(reward > 0, "Locking: Nothing to claim");

        Locker storage locker = _lockers[msg.sender];

        locker.distributed = locker.distributed + reward;
        totalDistributed += reward;

        alluoToken.safeTransfer(msg.sender, reward);
        emit TokensClaimed(msg.sender, reward, block.timestamp);
    }

    /**
     * @dev Сalculates available reward
     * @param _locker Address of the locker
     * @param _tpl Tokens per lock parameter
     */
    function calcReward(address _locker, uint256 _tpl)
        private
        view
        returns (uint256 reward)
    {
        Locker storage locker = _lockers[_locker];

        reward =
            ((locker.amount * _tpl) / 1e20) +
            locker.rewardAllowed -
            locker.distributed -
            locker.rewardDebt;

        return reward;
    }

    /**
     * @dev Returns locker's available rewards
     * @param _locker Address of the locker
     * @return reward Available reward to claim
     */
    function getClaim(address _locker) public view returns (uint256 reward) {
        uint256 _tpl = tokensPerLock;
        if (totalLocked > 0) {
            uint256 rewardProducedAtNow = produced();
            if (rewardProducedAtNow > rewardProduced) {
                uint256 producedNew = rewardProducedAtNow - rewardProduced;
                _tpl = _tpl + ((producedNew * 1e20) / totalLocked);
            }
        }
        reward = calcReward(_locker, _tpl);

        return reward;
    }

    /**
     * @dev Returns balance of the specified locker
     * @param _address Locker's address
     * @return amount of vote/locked tokens
     */
    function balanceOf(address _address)
        external
        view
        returns (uint256 amount)
    {
        return _lockers[_address].amount;
    }

    /**
     * @dev Returns unlocked balance of the specified locker
     * @param _address Locker's address
     * @return amount of unlocked tokens
     */
    function unlockedBalanceOf(address _address)
        external
        view
        returns (uint256 amount)
    {
        return _lockers[_address].unlockAmount;
    }

    /**
     * @dev convers amount of Alluo to Lp based on current ratio
     * @param _amount amount of Alluo tokens
     * @return amount amount of Lp tokens
     */
    function converAlluoToLp(uint256 _amount)
        external
        view
        returns (uint256)
    {
        uint256 alluoPerLp = FakeBalancer(alluoBalancerLp).alluoPerLp();
        return 
        _amount * 100 / alluoPerLp;
    }

    /**
     * @dev convers amount of Lp to Alluo tokens based on current ratio
     * @param _amount amount of Lp tokens
     * @return amount amount of Alluo tokens
     */
    function convertLpToAlluo(uint256 _amount)
        external
        view
        returns (uint256)
    {
        uint256 alluoPerLp = FakeBalancer(alluoBalancerLp).alluoPerLp();
        return _amount * alluoPerLp / 100;
    }

    /**
     * @dev Returns total amount of locked tokens (in lp)
     * @return amount of locked 
     */
    function totalSupply() external view returns (uint256 amount) {
        return totalLocked;
    }

    /**
     * @dev Returns information about the specified locker
     * @param _address Locker's address
     * @return locked_ Locked amount of tokens (in lp)
     * @return unlockAmount_ Unlocked amount of tokens (in Alluo)
     * @return claim_  Reward amount available to be claimed
     * @return depositUnlockTime_ Timestamp when tokens will be available to unlock
     * @return withdrawUnlockTime_ Timestamp when tokens will be available to withdraw
     */
    function getInfoByAddress(address _address)
        external
        view
        returns (
            uint256 locked_,
            uint256 unlockAmount_,
            uint256 claim_,
            uint256 depositUnlockTime_,
            uint256 withdrawUnlockTime_
        )
    {
        Locker memory locker = _lockers[_address];
        locked_ = locker.amount;
        unlockAmount_ = locker.unlockAmount;
        depositUnlockTime_ = locker.depositUnlockTime;
        withdrawUnlockTime_ = locker.withdrawUnlockTime;
        claim_ = getClaim(_address);

        return (
            locked_,
            unlockAmount_,
            claim_,
            depositUnlockTime_,
            withdrawUnlockTime_
        );
    }

    /* ========== ADMIN CONFIGURATION ========== */

    ///@dev Pauses the locking
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    ///@dev Unpauses the locking
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Adds reward tokens to the contract
     * @param _amount Specifies the amount of tokens to be transferred to the contract
     */
    function addReward(uint256 _amount) external {
        alluoToken.safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );
    }

    /**
     * @dev Sets amount of reward during `distributionTime`
     * @param _amount Sets total reward amount per `distributionTime`
     */
    function setReward(uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allProduced = produced();
        producedTime = block.timestamp;
        rewardPerDistribution = _amount;
        emit RewardAmountUpdated(_amount, allProduced);
    }

    /**
     * @dev Allows to update the time when the rewards are available to unlock
     * @param _depositLockDuration Date in unix timestamp format
     */
    function updateDepositLockDuration(uint256 _depositLockDuration)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        depositLockDuration = _depositLockDuration;
        emit DepositLockDurationUpdated(_depositLockDuration, block.timestamp);
    }
    
    /**
     * @dev Allows to update the time when the rewards are available to withdraw
     * @param _withdrawLockDuration Date in unix timestamp format
     */
    function updateWithdrawLockDuration(uint256 _withdrawLockDuration)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        withdrawLockDuration = _withdrawLockDuration;
        emit WithdrawLockDurationUpdated(_withdrawLockDuration, block.timestamp);
    }

    function withdrawTokens(
        address withdrawToken,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {

        IERC20Upgradeable(withdrawToken).safeTransfer(to, amount);
    }


    /**
     * @dev allows and prohibits to upgrade contract
     * @param _status flag for allowing upgrade from gnosis
     */
    function changeUpgradeStatus(bool _status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    { 
        require(upgradeStatus, "Locking: Upgrade not allowed");
        upgradeStatus = false;
    } 
}

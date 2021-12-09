// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TeamVesting is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // cliff period when tokens are frozen
    uint32 public constant CLIFF_MONTHS = 6;

    // period of time when tokens are getting available
    uint32 public constant VESTING_MONTHS_COUNT = 24;

    // seconds in 1 month
    uint32 public constant MONTH = 2628000;

    // tokens that will be delivered
    IERC20 public immutable token;

    struct UserInfo {
        uint256 accumulated;
        uint256 paidOut;
    }

    // user info storage
    mapping(address => UserInfo) public users;

    // from this timestamp tokens are gradually getting available
    uint256 public vestingStartTime;

    // sum of all tokens to be paid
    uint256 public totalTokensToPay;

    // sum of all tokens has been paid
    uint256 public totalTokensPaid;

    // from this timestamp 100% of tokens are available
    uint256 public vestingEndTime;

    // vesting duration
    uint40 public immutable vestingPeriod;

    // is vesting countdown live
    bool public isStarted;

    event UsersBatchAdded(address[] users, uint256[] amounts);

    event CountdownStarted(uint256 vestingStartTime, uint256 vestingEndTime);

    event TokensClaimed(address indexed user, uint256 amount);

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);

        vestingPeriod = MONTH * VESTING_MONTHS_COUNT;
    }

    /**
     * @dev add private users and assign amount to claim. Before calling,
     * ensure that contract balance is more or equal than total token payout
     * @param _user  An array of users' addresses.
     * @param _amount An array of amount values to be assigned to users respectively.
     */
    function addPrivateUser(address[] memory _user, uint256[] memory _amount)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _user.length; i++) {
            users[_user[i]].accumulated = _amount[i];
            totalTokensToPay += _amount[i];
        }

        // solhint-disable-next-line reason-string
        require(
            totalTokensToPay - totalTokensPaid <=
                token.balanceOf(address(this)),
            "Vesting: total tokens to pay exceed balance"
        );

        emit UsersBatchAdded(_user, _amount);
    }

    /**
     * @dev Start vesting countdown. Can only be called by contract owner.
     */
    function startCountdown() external onlyOwner {
        // solhint-disable-next-line reason-string
        require(!isStarted, "Vesting: countdown is already started");

        // solhint-disable-next-line not-rely-on-time
        vestingStartTime = block.timestamp + (MONTH * CLIFF_MONTHS);

        // solhint-disable-next-line not-rely-on-time
        vestingEndTime = vestingStartTime + vestingPeriod;
        isStarted = true;

        emit CountdownStarted(vestingStartTime, vestingEndTime);
    }

    /**
     * @dev Claims available tokens from the contract.
     */
    function claimToken() external nonReentrant {
        UserInfo storage userInfo = users[msg.sender];

        // solhint-disable-next-line reason-string
        require(
            (userInfo.accumulated - userInfo.paidOut) > 0,
            "Vesting: not enough tokens to claim"
        );

        uint256 availableAmount = calcAvailableToken(userInfo.accumulated);
        availableAmount -= userInfo.paidOut;

        userInfo.paidOut += availableAmount;

        totalTokensPaid += availableAmount;

        token.safeTransfer(msg.sender, availableAmount);

        emit TokensClaimed(msg.sender, availableAmount);
    }

    function getAvailableAmount(address user) public view returns (uint256) {
        UserInfo storage userInfo = users[user];
        uint256 availableAmount = calcAvailableToken(userInfo.accumulated);
        return (availableAmount - userInfo.paidOut);
    }

    /**
     * @dev calcAvailableToken - calculate available tokens
     * @param _amount  An input amount used to calculate vesting's output value.
     * @return availableAmount_ An amount available to claim.
     */
    function calcAvailableToken(uint256 _amount)
        private
        view
        returns (uint256 availableAmount_)
    {
        // solhint-disable-next-line not-rely-on-time
        if (!isStarted || block.timestamp <= vestingStartTime) {
            return 0;
        }

        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp > vestingEndTime) {
            return _amount;
        }

        return
            (_amount *
                // solhint-disable-next-line not-rely-on-time
                (block.timestamp - vestingStartTime)) / vestingPeriod;
    }
}

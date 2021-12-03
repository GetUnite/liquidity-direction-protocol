// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InvestorsVesting is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // constant for percent calculation
    uint8 public constant PERCENT_PRECISION = 100;

    // 10% will be allocated upfront on TGE
    uint8 public constant TGE_AVAILIBLE_PERCENT = 10;

    // 90% vesting over 12 months linearly
    uint8 public constant VESTING_PERCENT = 90;

    // do I need to say something here? :)
    uint8 public constant MONTHS_COUNT = 12;

    // seconds in 1 month
    uint24 public constant MONTH = 2630000;

    // Tokens that will be delivered
    IERC20 public immutable token;

    struct UserInfo {
        uint256 accumulated;
        uint256 paidOut;
    }

    // user info storage
    mapping(address => UserInfo) public users;

    // from this timestamp 10% of tokens are available and rest of 90% are
    // gradually getting available
    uint256 public vestingStartTime;

    // sum of all tokens to be paid
    uint256 public totalTokensToPay;

    // sum of all tokens has been paid
    uint256 public totalTokensPaid;

    // from this timestamp 100% of tokens are available
    uint256 public vestingEndTime;

    uint32 public immutable vestingPeriod;

    // is vesting countdown live
    bool public isStarted;

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);

        uint32 _vestingPeriod = MONTHS_COUNT * MONTH;
        vestingPeriod = _vestingPeriod;
    }

    /**
     * @dev AddPrivateUser - add private users to whitelist
     *                       and assign amount to claim
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
    }

    /**
     * @dev Start vesting countdown.
     */
    function startCountdown() external onlyOwner {
        require(!isStarted, "Countdown is already started");

        // solhint-disable-next-line not-rely-on-time
        vestingStartTime = block.timestamp;

        // solhint-disable-next-line not-rely-on-time
        vestingEndTime = block.timestamp + vestingPeriod;
        isStarted = true;
    }

    /**
     * @dev Claims available tokens from the contract.
     */
    function claimToken() external nonReentrant {
        require(isStarted, "Countdown not started");

        UserInfo storage userInfo = users[msg.sender];

        require(
            (userInfo.accumulated - userInfo.paidOut) > 0,
            "Not enough tokens to claim."
        );

        uint256 availableAmount = calcAvailableToken(userInfo.accumulated);
        availableAmount = availableAmount - userInfo.paidOut;

        userInfo.paidOut = userInfo.paidOut + availableAmount;

        totalTokensPaid += availableAmount;

        token.safeTransfer(msg.sender, availableAmount);
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
        if (block.timestamp < vestingStartTime) {
            return 0;
        } else {
            availableAmount_ =
                (_amount * (PERCENT_PRECISION - TGE_AVAILIBLE_PERCENT)) /
                PERCENT_PRECISION;
        }

        // solhint-disable-next-line not-rely-on-time
        if (block.timestamp > vestingEndTime) {
            return _amount;
        }

        if (
            // solhint-disable-next-line not-rely-on-time
            block.timestamp >= vestingStartTime &&
            // solhint-disable-next-line not-rely-on-time
            block.timestamp <= vestingEndTime
        ) {
            uint256 producedAmount = ((_amount - availableAmount_) *
                // solhint-disable-next-line not-rely-on-time
                (block.timestamp - vestingStartTime)) / vestingPeriod;

            availableAmount_ = availableAmount_ + producedAmount;
        }
        return availableAmount_;
    }
}

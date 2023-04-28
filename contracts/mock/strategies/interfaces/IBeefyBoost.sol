// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IBeefyBoost {
    function balanceOf(address account) external view returns (uint256);

    function closePreStake() external;

    function duration() external view returns (uint256);

    function earned(address account) external view returns (uint256);

    function exit() external;

    function getReward() external;

    function inCaseTokensGetStuck(address _token) external;

    function inCaseTokensGetStuck(
        address _token,
        address _to,
        uint256 _amount
    ) external;

    function initialize(
        address _stakedToken,
        address _rewardToken,
        uint256 _duration,
        address _manager,
        address _treasury
    ) external;

    function isPreStake() external view returns (bool);

    function lastTimeRewardApplicable() external view returns (uint256);

    function lastUpdateTime() external view returns (uint256);

    function manager() external view returns (address);

    function notifiers(address) external view returns (bool);

    function notifyAlreadySent() external;

    function notifyAmount(uint256 _amount) external;

    function openPreStake() external;

    function owner() external view returns (address);

    function periodFinish() external view returns (uint256);

    function renounceOwnership() external;

    function rewardBalance() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function rewardPerTokenStored() external view returns (uint256);

    function rewardRate() external view returns (uint256);

    function rewardToken() external view returns (address);

    function rewards(address) external view returns (uint256);

    function setNotifier(address _notifier, bool _enable) external;

    function setRewardDuration(uint256 _duration) external;

    function setTreasury(address _treasury) external;

    function setTreasuryFee(uint256 _fee) external;

    function stake(uint256 amount) external;

    function stakedToken() external view returns (address);

    function totalSupply() external view returns (uint256);

    function transferOwnership(address newOwner) external;

    function treasury() external view returns (address);

    function treasuryFee() external view returns (uint256);

    function userRewardPerTokenPaid(address) external view returns (uint256);

    function withdraw(uint256 amount) external;
}

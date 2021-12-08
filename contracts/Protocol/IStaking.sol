// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// Generated from pool contract ABI (https://polygonscan.com/address/0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c#code)
// and interface generator (https://bia.is/tools/abi2solidity/)
interface IStaking {
    function add(
        uint256 _allocPoint,
        address _want,
        bool _withUpdate,
        address _strat
    ) external;

    function deposit(uint256 _pid, uint256 _wantAmt) external;

    function inCaseTokensGetStuck(address _token, uint256 _amount) external;

    function owner() external view returns (address);

    function poolInfo(uint256)
        external
        view
        returns (
            address want,
            uint256 allocPoint,
            uint256 lastRewardBlock,
            uint256 accAUTOPerShare,
            address strat
        );

    function poolLength() external view returns (uint256);

    function renounceOwnership() external;

    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external;

    function stakedWantTokens(uint256 _pid, address _user)
        external
        view
        returns (uint256);

    function totalAllocPoint() external view returns (uint256);

    function transferOwnership(address newOwner) external;

    function userInfo(uint256, address) external view returns (uint256 shares);

    function withdraw(uint256 _pid, uint256 _wantAmt) external;
}

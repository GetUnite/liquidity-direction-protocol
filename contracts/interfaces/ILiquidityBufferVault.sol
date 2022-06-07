
// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface ILiquidityBufferVault {
    struct AdapterInfo {
        string name; // USD Curve-Aave
        uint256 percentage; //500 == 5.00%
        address adapterAddress; // 0x..
        bool status; // active
    }

  function DAI (  ) external view returns ( address );
  function USDC (  ) external view returns ( address );
  function USDT (  ) external view returns ( address );
  function alluoLp (  ) external view returns ( address );
  function approveAll (  ) external;
  function bufferPercentage (  ) external view returns ( uint32 );
  function changeUpgradeStatus ( bool _status ) external;
  function curvePool (  ) external view returns ( address );
  function deposit ( address _token, uint256 _amount ) external;
  function deposit ( address _token, uint256 _amount, address _targetToken) external;
  function getBufferAmount (  ) external view returns ( uint256 );
  function getCloseToLimitWithdrawals (  ) external view returns (uint256[] calldata, uint256 amount );
  function getExpectedBufferAmount ( uint256 _newAmount ) external view returns ( uint256 );
  function getUserActiveWithdrawals ( address _user ) external view returns ( uint256[] calldata);
  function getWithdrawalPosition ( uint256 _index ) external view returns ( uint256 );
  function isUserWaiting ( address _user ) external view returns ( bool );
  function keepersTrigger (  ) external view returns ( bool );
  function lastSatisfiedWithdrawal (  ) external view returns ( uint256 );
  function lastWithdrawalRequest (  ) external view returns ( uint256 );
  function maxWaitingTime (  ) external view returns ( uint256 );
  function removeTokenByAddress ( address _address, uint256 _amount ) external;
  function satisfyWithdrawals (  ) external;
  function setAlluoLp ( address newAlluoLp ) external;
  function setBufferPersentage ( uint32 _newPercentage ) external;
  function setCurvePool ( address newPool ) external;
  function setSlippage ( uint32 _newSlippage ) external;
  function setWaitingTime ( address newAlluoLp ) external;
  function setWallet ( address newWallet ) external;
  function slippage (  ) external view returns ( uint32 );
  function totalWithdrawalAmount (  ) external view returns ( uint256 );
  function upgradeStatus (  ) external view returns ( bool );
  function wallet (  ) external view returns ( address );
  function withdraw ( address _user, address _token, uint256 _amount ) external;
  function withdraw ( address _user, address _token, uint256 _amount, address _outputToken ) external;
  function withdrawals ( uint256 ) external view returns ( address user, address token, uint256 amount, uint256 time );
  function getAdapterId(address _ibAlluo) external view returns(uint256);
  function adapterIdsToAdapterInfo (uint256) external view returns (AdapterInfo memory );
  function getAdapterCoreTokensFromIbAlluo(address _ibAlluo) external view returns (address,address);
}
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Vesting.sol";
import "hardhat/console.sol";

contract VestingRouter is Ownable {
    event Released(uint256 amount);
    event Revoked();

    struct UserInfo {
        address activeVesting;
        address[] vestingHistory;
    }
   
    IERC20 mxsToken;

    mapping(address => UserInfo) userVesting;
   
    constructor(address _token) {
        mxsToken = ERC20(_token);
    }
   
    function createVesting(address _beneficiary, uint256 _tokenAmount, uint256 _duration, uint256 _cliff, bool _revokable) public onlyOwner {
        require(userVesting[_beneficiary].activeVesting == address(0), "Address already has an active vesting contract");
        Vesting vestingContract = new Vesting(_beneficiary, block.timestamp, _cliff, _duration, _revokable, _tokenAmount, address(mxsToken));
        mxsToken.transfer(address(vestingContract), _tokenAmount);
        userVesting[_beneficiary].activeVesting = address(vestingContract);
        userVesting[_beneficiary].vestingHistory.push(address(vestingContract));
    }
   
    function userInfo(address account) public view returns(address activeVesting, address[] memory vestingHistory) {
        UserInfo memory _userInfo = userVesting[account];
        return(_userInfo.activeVesting, _userInfo.vestingHistory);
    }
   
    function userVestingInfo(address _account) public view returns(
        address vestingAddress,
        uint256 releasedAmount,
        uint256 releasableAmount,
        uint256 vestedAmount,
        uint256 allocation,
        uint256 reflectionsReceived,
        bool complete
    ) {
        return vestingInfo(userVesting[_account].activeVesting);
    }
   
    function vestingInfo(address _vestingAddress) public view returns (
        address vestingAddress,
        uint256 releasedAmount,
        uint256 releasableAmount,
        uint256 vestedAmount,
        uint256 allocation,
        uint256 reflectionsReceived,
        bool complete
    ) {
        Vesting vestingContract = Vesting(_vestingAddress);
        vestingAddress = _vestingAddress;
        releasedAmount = vestingContract.released();
        releasableAmount = vestingContract.releasableAmount();
        vestedAmount = vestingContract.vestedAmount();
        allocation = vestingContract.initialAllocation();
        reflectionsReceived = vestingContract.reflections();
        complete = vestingContract.complete();
    }
   
    function revoke(address _vestingAddress) public onlyOwner {
        Vesting vestingContract = Vesting(_vestingAddress);
        require(address(vestingContract) != address(0), "Cannot release an invalid address");
        require(!vestingContract.complete(), "Vesting is already complete");
       
        vestingContract.revoke();
        userVesting[vestingContract.beneficiary()].activeVesting = address(0);
    }
   
    function release(address _vestingAddress) public {
        Vesting vestingContract = Vesting(_vestingAddress);
        require(address(vestingContract) != address(0), "Cannot release an invalid address");
        require(!vestingContract.complete(), "Vesting is already complete");
        require(vestingContract.beneficiary() == msg.sender, "Sender must be beneficiary");

        vestingContract.release();
       
        if (vestingContract.complete()) {
            userVesting[vestingContract.beneficiary()].activeVesting = address(0);
        }
    }
}

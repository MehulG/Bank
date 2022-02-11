// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract Bank {
    address public coin;
    address public owner;
    uint256[3] public totalRewardPool;
    uint256 public timePeriod;
    uint256 public createTime;
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;

    constructor(address _coin, uint256 _timePeriod) {
        coin = _coin;
        owner = msg.sender;
        timePeriod = _timePeriod;
        createTime = block.timestamp;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function setRewardPool(uint256 _amount) external onlyOwner {
        require(totalRewardPool[0] == 0, "RewardPool already set");
        require(_amount != 0, "_amount can not be 0");
        IERC20(coin).transferFrom(msg.sender, address(this), _amount);
        totalRewardPool[0] = (_amount * 20) / 100;
        totalRewardPool[1] = (_amount * 30) / 100;
        totalRewardPool[2] = (_amount * 50) / 100;
    }

    function deposit(uint256 _amount) external {
        require(totalRewardPool[0] != 0, "RewardPool not set");
        require(_amount != 0, "_amount can not be 0");
        require(
            block.timestamp <= (createTime + timePeriod),
            "Deposit time exceed"
        );
        IERC20(coin).transferFrom(msg.sender, address(this), _amount);
        deposits[msg.sender] += _amount;
        totalDeposits += _amount;
    }

    function withdraw() external {
        require(
            block.timestamp > (createTime + (2 * timePeriod)),
            "Can't withdraw yet"
        );
        require(deposits[msg.sender] > 0, "No deposit by account");
        uint256 returnAmt = deposits[msg.sender] +
            calculateReturnReward(deposits[msg.sender]);
        totalDeposits -= deposits[msg.sender];
        deposits[msg.sender] = 0;
        IERC20(coin).transfer(msg.sender, returnAmt);
    }

    function withdrawRewardPool() external onlyOwner {
        require(
            block.timestamp > (createTime + (2 * timePeriod)),
            "Can't withdraw yet"
        );
        require(totalDeposits == 0, "unclaimed deposits exist");
        uint256 transferBack = totalRewardPool[0] +
            totalRewardPool[1] +
            totalRewardPool[2];
        totalRewardPool[0] = 0;
        totalRewardPool[1] = 0;
        totalRewardPool[2] = 0;
        IERC20(coin).transfer(msg.sender, transferBack);
    }

    function calculateReturnReward(uint256 _amountDeposited)
        internal
        returns (uint256)
    {
        uint256 timeSinceCreation = block.timestamp - createTime;
        uint256 retPool;
        if (timeSinceCreation < 2 * timePeriod) {
            return 0;
        } else if (timeSinceCreation < 3 * timePeriod) {
            retPool = 1;
        } else if (timeSinceCreation < 4 * timePeriod) {
            retPool = 2;
        } else {
            retPool = 3;
        }
        return calculateAmount(_amountDeposited, retPool);
    }

    function calculateAmount(uint256 _amountDeposited, uint256 _retPool)
        internal
        returns (uint256)
    {
        uint256 rewardAmt;
        for (uint256 i = 0; i < _retPool; i++) {
            rewardAmt += totalRewardPool[i];
            totalRewardPool[i] = 0;
        }
        uint256 amountRet = (_amountDeposited * rewardAmt) / totalDeposits;
        totalRewardPool[_retPool-1] = rewardAmt - amountRet;
        return amountRet;
    }
}

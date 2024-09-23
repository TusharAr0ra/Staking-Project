//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

/**
 * @author Tushar Arora
 * @title A contract to allow people to stake coins and get rewards.
 * @dev uses SafeERC20
 */ 
contract StakingToken
{
    using SafeERC20 for IERC20;
    IERC20 public immutable token;

    event Staked(address indexed user, uint amount);
    event Withdraw(address indexed user, uint amount);
    
    error InsufficientBalance(string message);
    error TimeNotCompleted(string message);
    error NotOwner(string message);
    error MultiStake(string message);

    //to Store data
    struct stakeData
    {
        uint256 amount;
        uint256 timestamp; //I'll store withdraw time
        uint256 tokensHeGetting;
    }
    mapping(address => stakeData) public stakers;

    address public owner;
    uint256 constant scalingFactor = 1e18;
    uint256 public rebasingIndex = 1; //higher the rebasing index, lesser will be the tokens of user.
    uint256 public moneyToGiveToUser;
    uint256 public totalStakedTokens = 0;
    uint256 public totalTokensReceivedToUser = 0;
    uint256 public taxValue; //5% by default

    
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    constructor(IERC20 _token) 
    {
        token = _token;
        owner = msg.sender;
    }

    /**
     * It allows a user to stake tokens but the amount can't be 0 and checks if they have sufficient balance to stake.
     * @dev Sets the value for {_amount}
     * @param _amount Value a user want to stake.
    */
    function stake(uint256 _amount) public
    {
        if(stakers[msg.sender].amount > 0)
            revert MultiStake("You can't stake again without withdrawing your previous stake first");

        if(_amount <= 0 || token.balanceOf(msg.sender) < _amount)
            revert InsufficientBalance("Insufficient Balance");

        token.safeTransferFrom(msg.sender, address(this), _amount);

        totalStakedTokens += _amount;
        //giving him tokens and setting up rebasing index.
        taxValue = _amount * 5 / 100;
        stakers[msg.sender].tokensHeGetting = (_amount - taxValue) / rebasingIndex;  //staked amount
        totalTokensReceivedToUser += stakers[msg.sender].tokensHeGetting;

        rebasingIndex = (totalStakedTokens * scalingFactor) / totalTokensReceivedToUser;

        stakers[msg.sender].amount += _amount;
        stakers[msg.sender].timestamp = block.timestamp + 1 hours;

        emit Staked(msg.sender, _amount);
    }

    /**
     * It allows user to withdraw only after 1 hour and also checks if they have non-zero balance in their account.
     * It will take out all the amount from their account.
     */
    function withdraw() public
    {
        stakeData memory user = stakers[msg.sender];
        if(user.amount <= 0)
        {
            revert InsufficientBalance("No Tokens Staked");
        }
        if(block.timestamp < user.timestamp)
            revert TimeNotCompleted("You can't withdraw before 1 hour");

        // uint stakeTime = block.timestamp - user.timestamp + 1 hours;
        // uint totalHours = stakeTime / 1 hours;

        moneyToGiveToUser = rebasingIndex * user.tokensHeGetting / scalingFactor;
    

        if(token.balanceOf(address(this)) < moneyToGiveToUser)
            revert InsufficientBalance("Not Enough Money to give reward");

        // Transfer the staked tokens back to the user
        token.safeTransfer(msg.sender, moneyToGiveToUser);

        totalStakedTokens -= user.amount;
        totalTokensReceivedToUser -= user.tokensHeGetting;

        stakers[msg.sender].amount = 0;
        stakers[msg.sender].timestamp = 0;

        emit Withdraw(msg.sender, moneyToGiveToUser);
    }
}

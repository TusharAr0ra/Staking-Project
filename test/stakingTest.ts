import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { beforeEach } from "mocha";
import { Practice, Practice__factory, StakingTokens, StakingTokens__factory } from "../typechain-types";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Staking", async()=>{
    let owner: Signer;
    let user1: Signer;
    let token: Practice;  
    let staking: StakingTokens;

    beforeEach("tests", async()=>
    {
        [owner, user1] = await ethers.getSigners();
        token = await new Practice__factory(owner).deploy("TusharToken", "TUSH", 100000);
        // console.log("token: ", token);
        staking = await new StakingTokens__factory(owner).deploy(token.getAddress());
        // console.log("staking: ", staking);

        await token.connect(owner).approve(staking.target, 1000);
        //passing tokens to address so that they can use.
        await token.transfer(await user1.getAddress(), 1000);

        await token.mint(staking.target, 1000);
    });
    
    it("Should allow user to stake", async()=>
      {
          console.log("user1", await token.balanceOf(user1));
          await token.connect(user1).approve(staking.target, 1000);
          console.log("user1", String(await token.allowance(user1.getAddress(), staking.target)));

          await staking.connect(user1).stake(1000);
          const staker = await staking.stakers(user1.getAddress());
          expect(staker.amount).to.equal(1000);
      }
    );

    it("should not allow staking 0 tokens", async () =>
    {
        await expect(staking.connect(owner).stake(0)).to.be.revertedWithCustomError(staking, "InsufficientBalance");
    });

    it("should not allow staking more tokens than owned", async () =>
    {
        const stakeAmount = ethers.parseEther("10000");
        await expect(staking.connect(user1).stake(stakeAmount)).to.be.revertedWithCustomError(staking, "InsufficientBalance");
    });

    it("should allow withdrawal after 1 hour", async () =>
    {    
        // Approve and stake tokens
        await token.connect(user1).approve(staking.target, 100);
        // console.log("user1",String(await token.allowance(user1.getAddress(), staking.target)));

        await staking.connect(user1).stake(100);
    
        // Increase time by 1 hour
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);
    
        // Withdraw the staked tokens
        await staking.connect(user1).withdraw();
    
        const stakeInfo = await staking.stakers(await user1.getAddress());

        expect(stakeInfo.amount).to.equal(0);
    });

      it("should not allow withdrawal before 1 hour", async () =>
      {    
        // Approve and stake tokens
        await token.connect(user1).approve(staking.target, 10);
        await staking.connect(user1).stake(10);
    
        // Try to withdraw before 1 hour
        await expect(staking.connect(user1).withdraw()).to.be.revertedWithCustomError(staking, "TimeNotCompleted");
      });

      it("should not allow withdrawal if no tokens are staked", async () =>
      {
        await expect(staking.connect(user1).withdraw()).to.be.revertedWithCustomError(staking, "InsufficientBalance");
      });

      it("should allow staking and withdrawing multiple times", async function () 
      {    
        // First stake and withdraw cycle
        await token.connect(user1).approve(staking.target, 10);
        await staking.connect(user1).stake(10);
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);
        await staking.connect(user1).withdraw();
    
        // Second stake and withdraw cycle
        await token.connect(user1).approve(staking.target, 10);
        await staking.connect(user1).stake(10);
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);
        await staking.connect(user1).withdraw();
    
        const stakeInfo = await staking.stakers(await user1.getAddress());
        expect(stakeInfo.amount).to.equal(0);
      });
      it("should give correct reward", async () =>
      {
        await token.connect(user1).approve(staking.target, 100);
        await staking.connect(user1).stake(100);
        
        //passing 2 hours
        await ethers.provider.send("evm_increaseTime", [7200]);
        await ethers.provider.send("evm_mine", []);

        const balanceBefore = await token.balanceOf(user1.getAddress());
        await staking.connect(user1).withdraw();
        const balanceAfter = await token.balanceOf(await user1.getAddress());
        // 2% reward for 2 hours
        expect(balanceAfter - balanceBefore).to.equal(102);
      });

      /**
       * @dev you've to comment this line in "beforeEach" block for passing this test case
       * "await token.mint(staking.target, 1000);" because it's giving contract 1000 tokens.
       */
      it("Should not allow withdrawal if there are insufficient rewards in the contract", async function () 
      {
        await token.connect(user1).approve(await staking.getAddress(), 100);
        await staking.connect(user1).stake(100);

        // passing 10 hours
        await ethers.provider.send("evm_increaseTime", [36000]);
        await ethers.provider.send("evm_mine", []);

        await expect(staking.connect(user1).withdraw()).to.be.revertedWithCustomError(staking, "InsufficientBalance");
      });
      it("should give correct reward according to rebasingIndex", async () =>
        {
          await token.connect(user1).approve(staking.target, ethers.toBigInt(1000));
          await staking.connect(user1).stake(ethers.toBigInt(1000));
  
          staking.changeRebasingIndex(2);
          //passing 1 hour
          await ethers.provider.send("evm_increaseTime", [3600]);
          await ethers.provider.send("evm_mine", []);
          await staking.connect(user1).withdraw();
          const stakeInfo = await staking.stakers(await user1.getAddress());
          expect(stakeInfo.amount == ethers.toBigInt(1002));
        });
      it("rebasing won't allow any user to change the rebasing value", async () =>
      {
        await expect(staking.connect(user1).changeRebasingIndex(2)).to.be.revertedWithCustomError(staking, "NotOwner");
      });
      it("shouldn't allow user to stake without withrawing his previous stake amount", async() =>
      {
        await token.connect(user1).approve(staking.target, ethers.toBigInt(1000));
        await staking.connect(user1).stake(ethers.toBigInt(500));

        //can't stake twice without withdrawing.
        await expect(staking.connect(user1).stake(ethers.toBigInt(500))).to.be.revertedWithCustomError(staking, "MultiStake");
      });
      it("should give correct rebasing to correct users", async() =>
      {
        //a person staking for a value of rebasing
        await token.connect(owner).approve(staking.target, ethers.toBigInt(100));
        await staking.connect(owner).stake(ethers.toBigInt(100));

        staking.changeRebasingIndex(2);
        
        //another user staking for a value different then the previous one
        await token.connect(user1).approve(staking.target, ethers.toBigInt(100));
        await staking.connect(user1).stake(ethers.toBigInt(100));

        //passing 1 hour
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);

        await staking.connect(user1).withdraw();
        await staking.connect(owner).withdraw();

        const stakeInfo1 = await staking.stakers(await user1.getAddress());
        const stakeInfo2 = await staking.stakers(await user1.getAddress());
        expect(stakeInfo1.amount == ethers.toBigInt(101) && stakeInfo2.amount == ethers.toBigInt(102));    
      });
});
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { beforeEach } from "mocha";
// require("@nomiclabs/hardhat-ethers");
import { Practice, Practice__factory, StakingToken, StakingToken__factory } from "../typechain-types";

describe("Staking with rebasing", async()=>
{
    let owner: Signer;
    let user1: Signer;
    let token: Practice;  
    let staking: StakingToken;

    beforeEach("tests", async()=>
        {
            [owner, user1] = await ethers.getSigners();
            token = await new Practice__factory(owner).deploy("TusharToken", "TUSH", 100000);
            // console.log("token: ", token);
            staking = await new StakingToken__factory(owner).deploy(token.getAddress());
            // console.log("staking: ", staking);

            await token.connect(owner).approve(staking.target, ethers.parseUnits("100", 18));
            //passing tokens to address so that they can use.
            await token.transfer(await user1.getAddress(), ethers.parseUnits("100", 18));
        });
        it("should allow to stake", async () =>
        {
            await token.connect(user1).approve(staking.target, ethers.parseUnits("100", 18));
            await staking.connect(user1).stake(ethers.parseUnits("100", 18));
            const staker = await staking.stakers(user1.getAddress());
            expect(staker.amount).to.equal(ethers.parseUnits("100", 18));
        })
        it("should allow user to withdraw money", async () =>
        {
            await token.connect(user1).approve(staking.target, ethers.parseUnits("100", 18));
            await staking.connect(user1).stake(ethers.parseUnits("100", 18));

            await ethers.provider.send("evm_increaseTime", [3600]);
            await ethers.provider.send("evm_mine", []);

            await staking.connect(user1).withdraw();
            const stakeInfo = await staking.stakers(await user1.getAddress());
            expect(stakeInfo.amount).to.equal(0);
        });
        it("it should not let a user stake if he have staked before without withdrawing", async() =>
        {
            await token.connect(user1).approve(staking.target, ethers.parseUnits("100", 18));
            await staking.connect(user1).stake(ethers.parseUnits("50", 18));
            const staker = await staking.stakers(user1.getAddress());
            expect(staker.amount).to.equal(ethers.parseUnits("50", 18));

            //now it should not let me stake again cause I've not withdrawed yet.
            await expect(staking.connect(user1).stake(ethers.parseUnits("50", 18))).to.be.revertedWithCustomError(staking, "MultiStake");
        });
});

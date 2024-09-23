import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { beforeEach } from "mocha";

import { FactoryOfStakingRebasingUpgradable, FactoryOfStakingRebasingUpgradable__factory, Practice, Practice__factory, StakingTokenUpgradable, StakingTokenUpgradable__factory } from "../typechain-types";

describe("Test cases for factoryStakingRebasingUpgradable", function () 
{
  let factory: FactoryOfStakingRebasingUpgradable;
  let owner: Signer;
  let user: Signer;
  let token: Practice;
  let staking: StakingTokenUpgradable;
  let cloneAddress: string;

  beforeEach(async function () 
  {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy the ERC20 token (for staking)
    token = await new Practice__factory(owner).deploy("TusharToken", "TUSH", 100000);
    console.log("token address: ", token.target);

    // Deploy the implementation of the Staking contract
    staking = await new StakingTokenUpgradable__factory(owner).deploy();
    console.log("staking wale ka address: ", staking.target);

    // Deploy the Factory
    factory = await new FactoryOfStakingRebasingUpgradable__factory(owner).deploy(staking.target);
    console.log("cloning factory ka address: ", factory.target);
    console.log("owner's address: ", owner.getAddress());
  });

  it("Should deploy a clone of the staking contract and initialize it", async function () 
  {
    // Call factory to create a clone
    const tx = await factory.createStakingToken(token.target, await owner.getAddress());
    const receipt = await tx.wait();
    
    // Get the factory ABI to decode the event
    const factoryABI = (await ethers.getContractFactory("FactoryOfStakingRebasingUpgradable")).interface;

    //Decoding the logs to find the CloneCreated event
    const event = receipt?.logs.map(log =>
    {
        try
        {
          return factoryABI.parseLog(log);
        }
        catch (e) 
        {
          return null; // Filter out unrelated logs
        }
    }).find(e => e && e.name === "CloneCreated");

    // console.log("tx mei ye ye hai: ", tx);
    cloneAddress = event?.args.cloneAddress;

    // Attach the clone address to the staking contract ABI
    const cloneStakingContract = await ethers.getContractAt("StakingTokenUpgradable", cloneAddress);

    // Check if the clone is initialized correctly
    expect(await cloneStakingContract.token()).to.equal(token.target);
    expect(await cloneStakingContract.owner()).to.equal(await owner.getAddress());
  });

    it("Should allow staking and withdrawing from the clone", async function () 
    {
        // Create a clone
        const tx = await factory.createStakingToken(token.target, await owner.getAddress());
        const receipt = await tx.wait();

        // Decode the logs to find the CloneCreated event
        const factoryABI = (await ethers.getContractFactory("FactoryOfStakingRebasingUpgradable")).interface;
        const event = receipt?.logs.map(log => 
        {
            try {
            return factoryABI.parseLog(log);
            } catch (e) {
            return null;
            }
        }).find(e => e && e.name === "CloneCreated");

        if (!event)
        {
        throw new Error("CloneCreated event not found in transaction logs");
        }

        cloneAddress = event.args.cloneAddress;

        // Attach to the clone contract
        const cloneStakingContract = await ethers.getContractAt("StakingTokenUpgradable", cloneAddress);

        // Mint tokens to the user for staking
        await token.mint(await user.getAddress(), 100);
        await token.connect(user).approve(cloneAddress, 100);

        // Stake tokens
        await cloneStakingContract.connect(user).stake(50);
        expect((await cloneStakingContract.stakers(await user.getAddress())).amount).to.equal(50);

        // Simulate time passage and withdraw (1 hour wait for the withdraw)
        await ethers.provider.send("evm_increaseTime", [3600]); // Increase time by 1 hour
        await cloneStakingContract.connect(user).withdraw();
        
        expect((await token.balanceOf(await user.getAddress()))).to.be.gte(50);
    });

    it("should revert if the token address is invalid", async function () 
    {
      
        await expect(factory.createStakingToken(ethers.ZeroAddress , owner.getAddress())).to.be.revertedWithCustomError(factory, "zeroAddress");
    });

    it("should allow staking on clone", async function () 
    {
        // Create the clone
        const cloneTx = await factory.createStakingToken(token.target, await owner.getAddress());
        const cloneReceipt = await cloneTx.wait();

        if(!cloneReceipt)
        {
            throw("error");
        }
        // Parse the event logs to get the clone address
        const event = factory.interface.parseLog(cloneReceipt.logs[1]);
        const cloneAddress = event?.args.cloneAddress;
        
        // Get the staking clone contract instance
        const stakingClone = await ethers.getContractAt("StakingTokenUpgradable", cloneAddress);
    
        // Define the stake amount
        const stakeAmount = ethers.parseUnits("100", 18);
    
        // Approve the staking clone to transfer tokens on behalf of the owner
        await token.approve(stakingClone.target, stakeAmount);
    
        // Stake the tokens in the staking clone contract
        await stakingClone.stake(stakeAmount);
    
        // Verify that the stake data is correct
        const stakerData = await stakingClone.stakers(await owner.getAddress());
        expect(stakerData.amount).to.equal(stakeAmount);
    });
    
});

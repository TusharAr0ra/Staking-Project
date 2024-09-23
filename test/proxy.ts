import { expect } from "chai";
import { ethers } from "hardhat";
import { beforeEach } from "mocha";
import { CounterV1, CounterV1__factory, CounterV2, CounterV2__factory, Proxy, Proxy__factory, ProxyAdmin, ProxyAdmin__factory } from "../typechain-types";
import { Signer } from "ethers";
describe("Proxy Contract", async()=>
{
    let owner: Signer;
    let user1: Signer;
    let counter1: CounterV1;
    let counter2: CounterV2;
    let proxy: Proxy;
    let proxyAdmin: ProxyAdmin;

    beforeEach("tests", async() =>
    {
        [owner, user1] = await ethers.getSigners();
        counter1 = await new CounterV1__factory(owner).deploy();
        counter2 = await new CounterV2__factory(owner).deploy();
        proxy = await new Proxy__factory().deploy();
        proxyAdmin = await new ProxyAdmin__factory().deploy();
 
        //setting the implementation to counterV1.
        await proxy.connect(owner).upgradeTo(counter1.target);
    })
    it("should correctly return the current implementation address", async () => 
        {
            const implementationAddress = await proxyAdmin.getProxyImplementation(proxy.target);
            expect(implementationAddress).to.equal(counter1.target);
        });
    it("should increment count in CounterV1 through the proxy", async () => 
        {
            const proxyAsCounterV1 = await ethers.getContractAt("CounterV1", proxy.target);
        
            await proxyAsCounterV1.inc();
            const count = await proxyAsCounterV1.count();
            expect(count).to.equal(1);
        });
    it.only("should upgrade the implementation to CounterV2 and use new functions", async function () 
        {
            // ab counter 2 pr upgrade krenge
            await proxyAdmin.connect(owner).upgrade(proxy.target, counter2.target);

            console.log("proxyadminfactor");
            const implementationAddress = await proxyAdmin.getProxyImplementation(proxy.target);
            expect(implementationAddress).to.equal(counter2.target);
        
            const proxyAsCounterV2 = await ethers.getContractAt("CounterV2", proxy.target);
            
            // calling the new "dec" function in CounterV2
            await proxyAsCounterV2.inc(); 
            await proxyAsCounterV2.dec(); 
            const count = await proxyAsCounterV2.count();
            expect(count).to.equal(0);
        });
    it("should only allow the admin to upgrade the implementation", async ()=>
        {
            // Try upgrading from a non-admin account
            await expect(proxyAdmin.connect(user1).upgrade(proxy.target, counter2.target)).to.be.revertedWith("not owner");
    
            // Upgrade with admin account
            await proxyAdmin.connect(owner).upgrade(proxy.target, counter2.target);
            const implementationAddress = await proxyAdmin.getProxyImplementation(proxy.target);
            expect(implementationAddress).to.equal(counter2.target);
        });

    it("should allow changing the admin of the proxy", async () =>
        {
            const initialAdmin = await proxyAdmin.getProxyAdmin(proxy.target);
            expect(initialAdmin).to.equal(await owner.getAddress());
        
            // Change the admin
            await proxyAdmin.connect(owner).changeProxyAdmin(proxy.target, user1.getAddress());
            const newAdmin = await proxyAdmin.getProxyAdmin(await proxy.getAddress());
            const user1Address = await user1.getAddress();
            expect(newAdmin).to.equal(user1Address);
        });

        
});
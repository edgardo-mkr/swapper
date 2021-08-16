const { Contract } = require('ethers');
const { ethers, upgrades } = require('hardhat');
const { expect } = require("chai");

  const abi = [
    {
        "constant": true,
        "inputs": [
          {
            "name": "_owner",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "name": "balance",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      }
  ]
  const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; 
  const linkAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA';
  const uniAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
  const provider = ethers.providers.getDefaultProvider();
  const getBalance = async (tokenAddress,targetAddress) => {
    const contract = new Contract(tokenAddress, abi, provider);
    const balance = await contract.balanceOf(targetAddress);
    return balance;
  };
  
  describe("Swap contract", function () {
    let Swap;
    let hardhatSwap;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        Swap = await ethers.getContractFactory("SwapV1");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        hardhatSwap = await Swap.deploy(owner.address);
        
    })

    describe("Deployment", function (){
        it("Should set the right owner", async function () {
            expect(await hardhatSwap.owner()).to.equal(owner.address);
          });
    })

    describe("Confirm successful swap of tokens", function (){
        it("Should swap ether to dai", async function () {
            const initialBalance = await provider.getBalance(owner.address);
            const SwapTransac = await hardhatSwap.connect(addr1).swapTokens([100,0,0], {from:addr1.address, value:ethers.utils.parseEther('1.0')})
            await SwapTransac.wait();
            // expect(SwapTransac).to.equal(true);
            expect(initialBalance).to.be.below(await provider.getBalance(owner.address));
            const daiBalance = await getBalance(daiAddress,addr1.address);
            expect(daiBalance).to.be.above(0);
        })
    })
  });

const { Contract } = require('ethers');
const { ethers, upgrades } = require('hardhat');
const { expect } = require("chai");
const hre = require('hardhat');
// const IERC20 = require("@openzeppelin/contracts/token/ERC20/IERC20.sol");
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
  const provider = ethers.provider;
  const getBalanceToken = async (tokenAddress,targetAddress) => {
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
        hardhatSwap = await upgrades.deployProxy(Swap, [owner.address]);
        
    })

    describe("Deployment", function (){
        it("Should set the right owner", async function () {
            expect(await hardhatSwap.owner()).to.equal(owner.address);
          });
    })

    describe("Confirm successful swap of tokens", function (){
        it("Should swap ether to dai", async function () {
            const initialBalance = await provider.getBalance(owner.address);
            const initialBalanceDai = await getBalanceToken(daiAddress,addr1.address);
            console.log(`This address ${addr1.address} has initially ${initialBalanceDai} Dai`);
            let tx = await hardhatSwap.connect(addr1).swapTokens([100,0,0], {value: ethers.utils.parseEther('1.0')});
            // await SwapTransac.wait();
            // expect(SwapTransac).to.equal(true);
            expect(initialBalance).to.be.below(await provider.getBalance(owner.address));
            
            // const daiToken = await IERC20.at(daiAddress);
            
            const finalBalanceDai = await getBalanceToken(daiAddress,addr1.address);
            expect(finalBalanceDai).to.be.above(initialBalanceDai);
            console.log(`This address ${addr1.address} now has ${finalBalanceDai} Dai`);
        })

        it("should should swap multiple coins", async function (){
          const balanceDai = await getBalanceToken(daiAddress,addr2.address);
          const balanceLink = await getBalanceToken(linkAddress,addr2.address);
          const balanceUni = await getBalanceToken(uniAddress,addr2.address);
          console.log(`This address ${addr2.address} has the following tokens:\n${balanceDai} Dai\n${balanceLink} Link\n${balanceUni} Uni`)
          let tx = await hardhatSwap.connect(addr2).swapTokens([25,25,50], {value: ethers.utils.parseEther('1.0')});
          const balanceDaiFinal = await getBalanceToken(daiAddress,addr2.address);
          const balanceLinkFinal = await getBalanceToken(linkAddress,addr2.address);
          const balanceUniFinal = await getBalanceToken(uniAddress,addr2.address);
          expect(balanceDaiFinal).to.be.above(balanceDai);
          expect(balanceLinkFinal).to.be.above(balanceLink);
          expect(balanceUniFinal).to.be.above(balanceUni);
          console.log(`This address ${addr2.address} now has the following tokens:\n${balanceDaiFinal} Dai\n${balanceLinkFinal} Link\n${balanceUniFinal} Uni`)
        })
    })

    describe("Testing incorrect input porcentages", function(){
      it("Should revert swap", async function(){
        expect(hardhatSwap.swapTokens([50,50,50], {value: ethers.utils.parseEther('1.0')})).to.be.revertedWith("Error in porcentages of required tokens");
      })
    })
  });

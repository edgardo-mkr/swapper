const axios = require('axios'); //requiring axios for the api call
const { Contract } = require('ethers');
const { ethers, upgrades } = require('hardhat');
const { expect } = require("chai");//importing for chai the matching in the test 

  //abi of balanceOf interface for ERC20 tokens
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


  const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; //Dai contract address
  const linkAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA'; //Link contract address
  const uniAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'; //Uni contract address


  const provider = ethers.provider; // assigning a variable with our default provider alchemy 

  //creating a function to query balances in any token 
  //receives as input the correspondig token contract and target address to check its balance
  const getBalanceToken = async (tokenAddress,targetAddress) => {
    const contract = new Contract(tokenAddress, abi, provider);
    const balance = await contract.balanceOf(targetAddress);
    return balance;
  };
  
  //initializing SwapV1 tests
  describe("SwapV1 contract", function () {
    let Swap;
    let hardhatSwap;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    //before each tests deploy and get new signers
    beforeEach(async function () {
        Swap = await ethers.getContractFactory("SwapV1");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        hardhatSwap = await upgrades.deployProxy(Swap, [owner.address]); //deploying proxy (upgradable) 
        
    })

    //check right owner assignment
    describe("Deployment", function (){
        it("Should set the right owner", async function () {
            expect(await hardhatSwap.owner()).to.equal(owner.address);
          });
    })


    describe("Confirm successful swap of tokens", function (){
        
        it("Should swap ether to dai", async function () {
            const initialBalance = await provider.getBalance(owner.address);//getting owner ether balance
            const initialBalanceDai = await getBalanceToken(daiAddress,addr1.address);//getting msg.sender initial dai balance for later comparison

            console.log(`This address ${addr1.address} has initially ${initialBalanceDai} Dai`);
            
            //swap 1 Ether to Dai only
            let tx = await hardhatSwap.connect(addr1).swapTokens([100,0,0], {value: ethers.utils.parseEther('1.0')});
            
            //expect the owner to receive the 0.1% fee
            expect(BigInt(initialBalance) + BigInt(ethers.utils.parseEther('1.0')/1000)).to.equal(await provider.getBalance(owner.address)); 
            
            const finalBalanceDai = await getBalanceToken(daiAddress,addr1.address);

            expect(finalBalanceDai).to.be.above(initialBalanceDai);//confirm swap of Dai
            console.log(`This address ${addr1.address} now has ${finalBalanceDai} Dai`);
        })

        it("should should swap multiple coins", async function (){
          const balanceDai = await getBalanceToken(daiAddress,addr2.address); //getting msg.sender tokens balances
          const balanceLink = await getBalanceToken(linkAddress,addr2.address);//...
          const balanceUni = await getBalanceToken(uniAddress,addr2.address);//...

          console.log(`This address ${addr2.address} has the following tokens:\n${balanceDai} Dai\n${balanceLink} Link\n${balanceUni} Uni`);

          let tx = await hardhatSwap.connect(addr2).swapTokens([25,25,50], {value: ethers.utils.parseEther('1.0')});//swapping multiple tokens at once
          const balanceDaiFinal = await getBalanceToken(daiAddress,addr2.address);//getting msg.sender new token balances to confirm swap
          const balanceLinkFinal = await getBalanceToken(linkAddress,addr2.address);//...
          const balanceUniFinal = await getBalanceToken(uniAddress,addr2.address);//...

          expect(balanceDaiFinal).to.be.above(balanceDai);//checking swap
          expect(balanceLinkFinal).to.be.above(balanceLink);
          expect(balanceUniFinal).to.be.above(balanceUni);

          console.log(`This address ${addr2.address} now has the following tokens:\n${balanceDaiFinal} Dai\n${balanceLinkFinal} Link\n${balanceUniFinal} Uni`)
        })
    })

    describe("Testing incorrect input porcentages", function(){

      it("Should revert swap", async function(){
        //should revert when total sum of percentages is above 100%
        expect(hardhatSwap.swapTokens([50,50,50], {value: ethers.utils.parseEther('1.0')})).to.be.revertedWith("Error in percentages of required tokens");
        //should revert when total sum of percentages is below 100%
        expect(hardhatSwap.swapTokens([0,50,0], {value: ethers.utils.parseEther('1.0')})).to.be.revertedWith("Error in percentages of required tokens");
        //should revert when entering negative percentages
        expect(hardhatSwap.swapTokens([-25,50,75], {value: ethers.utils.parseEther('1.0')})).to.be.revertedWith("Negative percentages not allow");
      })

    })

    describe("Not passing any value to the function", function(){
      
      it("Should revert swap", async function(){
        //it must require a value to be passed to the function
        expect(hardhatSwap.swapTokens([25,50,25])).to.be.revertedWith("No Ether has been sent");
      })

    })
  });

  //TEST SwapV2

  //calling the the 1Inch API
  let tokenArr = [daiAddress,linkAddress,uniAddress];
  let protocolArr = ['','','']; 

  async function driver(){
    //for loop to quote for each token to be swap
    for(let i = 0; i < tokenArr.length; i++){
      //appearance of a quote url, we're only changing the token to convert to
      //comparing only between uniSwap_V2 & sushiSwap
      let callUrl = 'https://api.1inch.exchange/v3.0/1/quote?fromTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&'+
      'toTokenAddress='+ tokenArr[i] +'&amount=1000000000000000000&protocols=SUSHI%2CUNISWAP_V2';

      //looking for any errors in the call
      try{ 
        let temp = await axios.get(callUrl);//calling the API with axios
        temp = temp.data;//we only require the data

        protocolArr[i] = temp.protocols[0][0][0].name;//assigning only the name of the best protocol to an array

        console.log(protocolArr[i]);  
      } catch (e){//catching the errors 
        console.log("API call failure");
      }
    }
  }
  driver();//executing the API call


  describe("SwapV2 contract", function () {
    let SwapV1;
    let SwapV2;
    let hardhatSwap;
    let instance;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        SwapV1 = await ethers.getContractFactory("SwapV1");
        SwapV2 = await ethers.getContractFactory("SwapV2");//deploying both implementation contracts

        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        instance = await upgrades.deployProxy(SwapV1, [owner.address]);//deploying proxy of first implementation contract
        hardhatSwap = await upgrades.upgradeProxy(instance.address, SwapV2);//upgrading proxy to second implementation contract
        await hardhatSwap.setSushiSwap();//setting the sushiSwap interface variable
    })

    describe("Deployment", function (){

        it("Should set the right owner", async function () {
            expect(await hardhatSwap.owner()).to.equal(owner.address);
          });

    })

    describe("Confirm successful swap of tokens", function (){

        it("Should swap ether to dai with sushiSwap", async function () {
            const initialBalance = await provider.getBalance(owner.address);
            const initialBalanceDai = await getBalanceToken(daiAddress,addr1.address);

            console.log(`This address ${addr1.address} has initially ${initialBalanceDai} Dai`);

            //confirming that the sushiSwap option works properly
            let tx = await hardhatSwap.connect(addr1).swapTokens(["SUSHI","SUSHI","SUSHI"],[100,0,0], {value: ethers.utils.parseEther('1.0')});

            //expect the owner to receive the 0.1% fee
            expect(BigInt(initialBalance) + BigInt(ethers.utils.parseEther('1.0')/1000)).to.equal(await provider.getBalance(owner.address));
            
            const finalBalanceDai = await getBalanceToken(daiAddress,addr1.address);
            expect(finalBalanceDai).to.be.above(initialBalanceDai);
            console.log(`This address ${addr1.address} now has ${finalBalanceDai} Dai`);
        })

        //similar test as in SwapV1 but with the protocolArr array to specify the protocols to use for each token
        it("should should swap multiple coins with the best DEX", async function (){
          const balanceDai = await getBalanceToken(daiAddress,addr2.address);
          const balanceLink = await getBalanceToken(linkAddress,addr2.address);
          const balanceUni = await getBalanceToken(uniAddress,addr2.address);

          console.log(`This address ${addr2.address} has the following tokens:\n${balanceDai} Dai\n${balanceLink} Link\n${balanceUni} Uni`)

          let tx = await hardhatSwap.connect(addr2).swapTokens(protocolArr,[25,25,50], {value: ethers.utils.parseEther('1.0')});

          const balanceDaiFinal = await getBalanceToken(daiAddress,addr2.address);
          const balanceLinkFinal = await getBalanceToken(linkAddress,addr2.address);
          const balanceUniFinal = await getBalanceToken(uniAddress,addr2.address);

          expect(balanceDaiFinal).to.be.above(balanceDai);
          expect(balanceLinkFinal).to.be.above(balanceLink);
          expect(balanceUniFinal).to.be.above(balanceUni);

          console.log(`This address ${addr2.address} now has the following tokens:\n${balanceDaiFinal} Dai done with ${protocolArr[0]} protocol\n`+
          `${balanceLinkFinal} Link done with ${protocolArr[1]} protocol\n`+
          `${balanceUniFinal} Uni done with ${protocolArr[2]} protocol`);
        })

    })

    describe("Testing incorrect input porcentages", function(){

      it("Should revert swap", async function(){
        //should revert when total sum of percentages is above 100%
        expect(hardhatSwap.swapTokens(protocolArr,[50,50,50], {value: ethers.utils.parseEther('1.0')})).to.be.revertedWith("Error in percentages of required tokens");
        //should revert when total sum of percentages is below 100%
        expect(hardhatSwap.swapTokens(protocolArr,[0,50,0], {value: ethers.utils.parseEther('1.0')})).to.be.revertedWith("Error in percentages of required tokens");
        //should revert when entering negative percentages
        expect(hardhatSwap.swapTokens(protocolArr,[-25,50,75], {value: ethers.utils.parseEther('1.0')})).to.be.revertedWith("Negative percentages not allow");
      })

    })

    describe("Not passing any value to the function", function(){
      it("Should revert swap", async function(){
        //it must require a value to be passed to the function
        expect(hardhatSwap.swapTokens(protocolArr,[25,50,25])).to.be.revertedWith("No Ether has been sent");
      })
    })
  });


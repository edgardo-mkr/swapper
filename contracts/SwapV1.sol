pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/Initializable.sol";

contract SwapV1 is Initializable {
    address public owner;
    IUniswapV2Router uniSwap;
    // in order to make the contract upgradable an initializer function is used instead of the constructor
    function initialize(address _owner) public initializer{
        owner = _owner;
        uniSwap = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D); // pointing to the uniSwapV2 contract
    }
    //the main function swapTokens receives as input an array to indicate the ratios in which the msg.sender wants to convert their ether into the different tokens
    //in this contract we're going to work with Dai, Link & Uni. 
    //the number pass to the array correspond to the porcentage of the sent ether that must be converted into the different tokens. As shown below
    // arr[0] = Dai, arr[1] = Link, arr[2] = Uni. THE ORDER MATTERS!!!!! e.g: [20,50,30] convert 20% to dai, 50% to Link and 30% to Uni.
    //if there is a token that is not desired to convert it must be set to "0". 
    function swapTokens(uint[3] memory _amountOfTokens) public payable returns(bool){
        require(_amountOfTokens[0]>=0 && _amountOfTokens[1]>=0 && _amountOfTokens[2]>=0, "Negative percentages not allow"); //checking for negative inputs
        require(_amountOfTokens[0]+_amountOfTokens[1]+_amountOfTokens[2] == 100, "Error in percentages of required tokens");//checking that the percentages sum 100
        require(msg.value > 0, "No Ether has been sent");//this function will revert if no ether is sent

        uint finalAmount = msg.value - (msg.value/1000);//substracting the fee from the deposited amount
        uint daiAmount = (finalAmount * _amountOfTokens[0])/100; //calculating the diferent amounts to swap for each token
        uint linkAmount = (finalAmount * _amountOfTokens[1])/100;//...
        uint uniAmount = (finalAmount * _amountOfTokens[2])/100;//...
        uint[] memory expectedAmount = new uint[](2);
        address[] memory path = new address[](2);//stores the token contract addresses desired to convert
        path[0] = uniSwap.WETH();//setting input token to WETH
        
        console.log("owner balance: %s", owner.balance);

        payable(owner).call{value: msg.value/1000}("");//transfering the fee to the recipient (owner)
        
        console.log("trying to send %s ETH to owner", msg.value/1000);
        console.log("owner's new balance: %s", owner.balance);

        if(_amountOfTokens[0] > 0){ //if percentage is "0" ommit this swap

            path[1] = 0x6B175474E89094C44Da98b954EedeAC495271d0F;//setting the output token to the Dai contract address

            expectedAmount = uniSwap.getAmountsOut(daiAmount,path);//calculating minimum amount of token to receive 
            uniSwap.swapExactETHForTokens{value: daiAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
        }
        if(_amountOfTokens[1] > 0){ //if percentage is "0" ommit this swap

            path[1] = 0x514910771AF9Ca656af840dff83E8264EcF986CA;//setting the output token to the Link contract address

            expectedAmount = uniSwap.getAmountsOut(linkAmount,path);//calculating minimum amount of token to receive
            uniSwap.swapExactETHForTokens{value: linkAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
        }
        if(_amountOfTokens[2] > 0){ //if percentage is "0" ommit this swap

            path[1] = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;//setting the output token to the Uni contract address

            expectedAmount = uniSwap.getAmountsOut(uniAmount,path);//calculating minimum amount of token to receive
            uniSwap.swapExactETHForTokens{value: uniAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
        }
        return true;
    }
    
}
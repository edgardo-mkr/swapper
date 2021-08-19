pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/Initializable.sol";

contract SwapV2 is Initializable {
    address public owner;
    IUniswapV2Router uniSwap;
    IUniswapV2Router sushiSwap;//adding second DEX, sushiSwap

    // in order to make the contract upgradable an initializer function is used instead of the constructor
    function initialize(address _owner) public initializer{
        owner = _owner;
        uniSwap = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);// pointing to the uniSwapV2Router contract
    }

    //this takes care of setting the new interface storage variable for sushiswap
    function setSushiSwap() external{
        require(msg.sender == owner);
        sushiSwap = IUniswapV2Router(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);// pointing to the sushiSwapV2Router contract, which is the exact same implementation of the UniswapV2Router
    }

    //in difference with SwapV1, this implementation receives another input called _protocol 
    //_protocol is a string array with the name of the protocol to use for each corresponding token  
    function swapTokens(string[3] memory _protocols, uint[3] memory _amountOfTokens) external payable returns(bool){
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
        
        payable(owner).call{value: msg.value/1000}("");//transfering the fee to the recipient (owner)
        
        if(_amountOfTokens[0] > 0){//if percentage is "0" ommit this swap
            path[1] = 0x6B175474E89094C44Da98b954EedeAC495271d0F;//setting the output token to the Dai contract address

            //confirming which DEX was chosen to make the right swap 
            //if neither was chosen or there was a mispelling, a revert is called
            if(keccak256(abi.encodePacked(_protocols[0]))==keccak256(abi.encodePacked("SUSHI"))){
                expectedAmount = sushiSwap.getAmountsOut(daiAmount,path);
                sushiSwap.swapExactETHForTokens{value: daiAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
            } else if(keccak256(abi.encodePacked(_protocols[0]))==keccak256(abi.encodePacked("UNISWAP_V2"))){
                expectedAmount = uniSwap.getAmountsOut(daiAmount,path);
                uniSwap.swapExactETHForTokens{value: daiAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
            } else {
                revert("Unsupported DEX");
            }

        }
        if(_amountOfTokens[1] > 0){//if percentage is "0" ommit this swap
            path[1] = 0x514910771AF9Ca656af840dff83E8264EcF986CA;//setting the output token to the Link contract address

            if(keccak256(abi.encodePacked(_protocols[1]))==keccak256(abi.encodePacked("SUSHI"))){
                expectedAmount = sushiSwap.getAmountsOut(linkAmount,path);
                sushiSwap.swapExactETHForTokens{value: linkAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
            } else if(keccak256(abi.encodePacked(_protocols[0]))==keccak256(abi.encodePacked("UNISWAP_V2"))){
                expectedAmount = uniSwap.getAmountsOut(linkAmount,path);
                uniSwap.swapExactETHForTokens{value: linkAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
            } else{
                revert("Unsupported DEX");
            }

        }
        if(_amountOfTokens[2] > 0){//if percentage is "0" ommit this swap
            path[1] = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;//setting the output token to the Uni contract address

            if(keccak256(abi.encodePacked(_protocols[2]))==keccak256(abi.encodePacked("SUSHI"))){
                expectedAmount = sushiSwap.getAmountsOut(uniAmount,path);
                sushiSwap.swapExactETHForTokens{value: uniAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
            }else if(keccak256(abi.encodePacked(_protocols[0]))==keccak256(abi.encodePacked("UNISWAP_V2"))) {
                expectedAmount = uniSwap.getAmountsOut(uniAmount,path);
                uniSwap.swapExactETHForTokens{value: uniAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 15);
            }else {
                revert("Unsupported DEX");
            }

        }
        return true;
    }
    
}
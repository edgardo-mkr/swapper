pragma solidity ^0.7.3;

import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/Initializable.sol";

contract SwapV2 is Initializable {
    address owner;
    IUniswapV2Router uniSwap;
    IUniswapV2Router sushiSwap;
    IUniswapV2Router protocol;

    // in order to make the contract upgradable an initializer function is used instead of the constructor
    function initialize(address _owner) public initializer{
        owner = _owner;
        uniSwap = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);// pointing to the uniSwapV2Router contract
        sushiSwap = IUniswapV2Router(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);// pointing to the sushiSwapV2Router contract, which is the exact same implementation of the UniswapV2Router 
    }
    
    function decideProtocol(string memory _protocol) external {
        if(keccak256(abi.encodePacked(_protocol))==keccak256(abi.encodePacked("UNISWAP_V2"))){
            protocol = uniSwap;
        }
        if(keccak256(abi.encodePacked(_protocol))==keccak256(abi.encodePacked("SUSHI"))){
            protocol = sushiSwap;
        }
    }

    function swapTokens(uint[3] memory _amountOfTokens) external payable returns(bool){
        uint totalPorcent = _amountOfTokens[0]+_amountOfTokens[1]+_amountOfTokens[2];
        require(totalPorcent == 100, "Error in porcentages of required tokens");//checking that the porcentages sum 100
        uint finalAmount = msg.value - (msg.value/1000);//substracting the fee from the deposited amount
        uint daiAmount = (finalAmount * _amountOfTokens[0])/100; //calculating the diferent amounts to swap for each token
        uint linkAmount = (finalAmount * _amountOfTokens[1])/100;//...
        uint uniAmount = (finalAmount * _amountOfTokens[2])/100;//...
        uint[] memory expectedAmount = new uint[](2);
        address[] memory path = new address[](2);
        path[0] = protocol.WETH();
        
        payable(owner).call{value: msg.value/1000}("");//transfering the fee to the recipient (owner)
        
        if(_amountOfTokens[0] > 0){
            path[1] = 0x6B175474E89094C44Da98b954EedeAC495271d0F;//Dai contract address
            expectedAmount = protocol.getAmountsOut(daiAmount,path);
            protocol.swapExactETHForTokens{value: daiAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 60);
        }
        if(_amountOfTokens[1] > 0){
            path[1] = 0x514910771AF9Ca656af840dff83E8264EcF986CA;//Link contract address
            expectedAmount = protocol.getAmountsOut(linkAmount,path);
            protocol.swapExactETHForTokens{value: linkAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 60);
        }
        if(_amountOfTokens[2] > 0){
            path[1] = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;//Uni contract address
            expectedAmount = protocol.getAmountsOut(uniAmount,path);
            protocol.swapExactETHForTokens{value: uniAmount}(expectedAmount[1],path,msg.sender,block.timestamp + 60);
        }
        return true;
    }
    
}

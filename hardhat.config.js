require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/cEyc4P4mOyGkaYeP--7H_fnZeArtZh3c",
        blockNumber: 13025254
      }
    }
  },
  solidity: "0.7.3",
};

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
const { ALCEMIST_RINKEBY_URL, ETHERSCAN_API_KEY, PRIVATE_KEY_1 } = require("./config");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  defaultNetwork: "rinkeby",
  networks: {
    hardhat: {
    },
    rinkeby: {
      url: ALCEMIST_RINKEBY_URL,
      accounts: [PRIVATE_KEY_1]
    }
  },
  solidity: "0.8.4",
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};

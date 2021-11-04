const { parseEther } = require("@ethersproject/units");
const hre = require("hardhat");
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

async function main() {

  // Use this for contracts already deployed
  
  // const mxsToken = await ethers.getContractAt("MXSToken", MXS_ADDRESS);
  // const vestingRouter = await ethers.getContractAt("VestingRouter", VESTING_ROUTER_ADDRESS);

  const MXSToken = await hre.ethers.getContractFactory("MXSToken");
  const mxsToken = await MXSToken.deploy(UNISWAP_ROUTER);
  await mxsToken.deployed();
  console.log("mxs address: ", mxsToken.address);

  const TokenDispense = await hre.ethers.getContractFactory("TokenDispense");
  const tokenDispense = await TokenDispense.deploy(mxsToken.address);
  await tokenDispense.deployed();
  console.log("mxs address: ", tokenDispense.address);

  await mxsToken.allowPreTrading(tokenDispense.address, true);
  await mxsToken.transfer(tokenDispense.address, parseEther('12500000000'));

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  //npx hardhat verify --network rinkeby 0x9C0aE286598D45DA1702f610d4b7a63Ec58835c3 "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  //npx hardhat verify --network rinkeby 0x169637D7081a464b43696cEa9dB3906189ac0404 "0x9C0aE286598D45DA1702f610d4b7a63Ec58835c3"
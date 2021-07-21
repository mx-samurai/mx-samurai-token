const hre = require("hardhat");
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

async function main() {
  const MXSToken = await hre.ethers.getContractFactory("MXSToken");
  const mxsToken = await MXSToken.deploy(UNISWAP_ROUTER);

  await mxsToken.deployed();
  console.log("Token deployed to", mxsToken.address);

  const VestingRouter = await ethers.getContractFactory("VestingRouter");
  const vestingRouter = await VestingRouter.deploy(mxsToken.address);

  await vestingRouter.deployed();

  console.log("Vesting Router deployed to", vestingRouter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

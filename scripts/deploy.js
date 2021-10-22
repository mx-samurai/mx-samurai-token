const { parseEther } = require("@ethersproject/units");
const hre = require("hardhat");
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

async function main() {
  const arr1 = [
    "0x16E7451D072eA28f2952eefCd7cC4A30B1F6A557",
    "0x9acF9DBdEebDF65057A10b7CaD2a90397df6D9D9",
    "0xAC57E5c7990aa2A7a3B91A0F9d4350127e07DEC5",
    "0xa5F1ff86a73B2e15d1aE2652e81fA0b7Fada314C"
  ];
  const MXSToken = await hre.ethers.getContractFactory("MXSToken");
  const mxsToken = await MXSToken.deploy(UNISWAP_ROUTER);

  await mxsToken.deployed();
  console.log("Token deployed to", mxsToken.address);

  const VestingRouter = await ethers.getContractFactory("VestingRouter");
  const vestingRouter = await VestingRouter.deploy(mxsToken.address);

  await vestingRouter.deployed();

  console.log("Vesting Router deployed to", vestingRouter.address);


  await mxsToken.excludeFromReward("0xEB1B1fB761A336DF83283333280Ab39F4289aDD5");
  await mxsToken.excludeFromReward("0xD5f5E93594A90F603D2FE8f6BABdC8F8DF590dcF");
  console.log("Token configured: Exclusions from Rewards set.");

  await mxsToken.excludeFromFee("0xEB1B1fB761A336DF83283333280Ab39F4289aDD5");
  await mxsToken.excludeFromFee("0xD5f5E93594A90F603D2FE8f6BABdC8F8DF590dcF");
  console.log("Token configured: Exclusions from Fees set.");

  // await mxsToken.excludeFromBlockLimit("0xEB1B1fB761A336DF83283333280Ab39F4289aDD5");
  // await mxsToken.excludeFromBlockLimit("0xD5f5E93594A90F603D2FE8f6BABdC8F8DF590dcF");
  // console.log("Token configured: Exclusions from Block Limit set.");

  await mxsToken.allowPreTrading("0xEB1B1fB761A336DF83283333280Ab39F4289aDD5", true);
  await mxsToken.allowPreTrading("0xD5f5E93594A90F603D2FE8f6BABdC8F8DF590dcF", true);
  console.log("Token configured: Pretrade whitelist list set.");

  //   await mxsToken.setTradingStartTime("1635621804000");
  //   console.log("Token configured: Start time set.");

  await mxsToken.setMaxTxAmount(parseEther("100000000000"));
  console.log("Token configured: Max transaction amount set.");

  await mxsToken.transfer(vestingRouter.address, parseEther("12500000000"));
  // await tokenTransfer.wait();

  console.log("Transferred 12500000000 tokens to the Vesting Router.");

  //   await vestingRouter.createVesting("0x16E7451D072eA28f2952eefCd7cC4A30B1F6A557", "1000000000000000000000000000", "7776000", "0", "false");
  for (var i = 0; i < arr1.length; i++) {
    await vestingRouter.createVesting(arr1[i], parseEther("1000000"), "7776000", "0", false, { gasLimit: 2000000, gasPrice: 1 });
    console.log("Vesting configured for " + arr1[i]);
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

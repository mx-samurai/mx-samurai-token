const { parseEther } = require("@ethersproject/units");
const hre = require("hardhat");
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const MXS_ADDRESS = "0xad77785D59277c177aC21EE4ec40Bff76a832077";
const VESTING_ROUTER_ADDRESS = "0x84Ab56f0b32Ff4A07d07829b66beC7C519ec10d0";

async function main() {
  const arr1 = [
    "0x16E7451D072eA28f2952eefCd7cC4A30B1F6A557",
    "0x9acF9DBdEebDF65057A10b7CaD2a90397df6D9D9",
    "0xAC57E5c7990aa2A7a3B91A0F9d4350127e07DEC5",
    "0xa5F1ff86a73B2e15d1aE2652e81fA0b7Fada314C"
  ];
  const arr2 = [
    "0x002965E2149a7a97ef269fc4152ecb6b4bCA2206",
    "0x0C787d3093bB1841499d96FCEbDD1e8f10D722Fe",
    "0x64f39F18ABb739acd68aeE7e21D589CD7457E9Fc",
    "0xD322529EC2eB3991B2FAD2e8207ABFF7930BEEA8",
    "0xfb545fea0700bbcb68f87e174dffafce1814e614",
    "0xE4158F8003AEA42911C6c3c78C13dE7C0a346Bde",
    "0x1c189cbf10a3b8b5ba3fc20b583f0644de524228",
    "0xAa56b1f97D0bB6c974f383738a0E0eB3F038279f",
    "0x13eD3f606207974253D037b010d606f105Fb6802"
  ];
  const arr3 = [
    "0x8F554DF3292D569540118B419B296dc8fD6d3411",
    "0x35F6DBF479140d76482e705544c97654E6C2067D",
    "0x4D7A9920e6E3DC90A8C194E49678D29f4CaF295D"
];
  const arr4 = [
    "0xC4Fe91938631d43835821ae1344de419c8f15F8C",
    "0xE1144D4305f53a0E2293CE82D1315fED27826C0C",
    "0x7e2862871030BCBE67F67Ebc35EEB8a786A8792b",
    "0x68Da635CeCf78e7ee2F36fAFEC261E0d54390566",
    "0xdE7f2b7048cc4aCFB66C8841c3444f170b922dff",
    "0xCaEF249a7C886d1D73268Abeba227568aA1EB1e2",
    "0xdFca345A970dc2e905B76D1F8903a924bAaCeF8F",
    "0xF1eb153F77824B14831DCeE6843677EEaa1A3fF1",
    "0x57de4d5BA093d85E27d89EA7059724A983F1cF98",
    "0xa35a93Da65611aE61160Cb81946e2a18cC3E3141",
    "0xC35666711B0B8d32A9A88061FCE08ECD30362db8",
    "0x0da09955d2483b7E672C2A9EFD82DE2b43BbaeFd",
    "0xD655AE59d925807553E690605D21D0af494BF066"
  ];
	console.log("Running");

  // Use this for contracts already deployed
  
  // const mxsToken = await ethers.getContractAt("MXSToken", MXS_ADDRESS);
  // const vestingRouter = await ethers.getContractAt("VestingRouter", VESTING_ROUTER_ADDRESS);

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
  await mxsToken.allowPreTrading(vestingRouter.address, true);

  console.log("Token configured: Pretrade whitelist list set.");

    // await mxsToken.setTradingStartTime("1635621804");
    // console.log("Token configured: Start time set.");

  await mxsToken.setMaxTxAmount(parseEther("100000000000"));
  console.log("Token configured: Max transaction amount set.");

  await mxsToken.transfer(vestingRouter.address, parseEther("12500000000"));
  // await tokenTransfer.wait();

  console.log("Transferred 12500000000 tokens to the Vesting Router.");

  for (var i = 0; i < arr1.length; i++) {
    const tx = await vestingRouter.createVesting(arr1[i], parseEther("1000000000"), "10368000", "0", false, { gasLimit: 5000000 });
    console.log("tx submitted");
    await tx.wait();
    console.log("Vesting configured for King wallet: " + arr1[i]);
  }
  for (var j = 0; j < arr2.length; j++) {
    const tx = await vestingRouter.createVesting(arr2[j], parseEther("500000000"), "5184000", "0", false, { gasLimit: 5000000 });
    console.log("tx submitted");
    await tx.wait();
    console.log("Vesting configured for Shogun wallet: " + arr2[j]);
  }
  for (var k = 0; k < arr3.length; k++) {
    const tx = await vestingRouter.createVesting(arr3[k], parseEther("250000000"), "2592000", "0", false, { gasLimit: 5000000 });
    console.log("tx submitted");
    await tx.wait();
    console.log("Vesting configured for Daimyo wallet: " + arr3[k]);
  }
  for (var l = 0; l < arr4.length; l++) {
    const tx = await vestingRouter.createVesting(arr4[l], parseEther("250000000"), "2592000", "0", true, { gasLimit: 5000000 });
    console.log("tx submitted");
    await tx.wait();
    console.log("Vesting configured for Daimyo wallet: " + arr4[l]);
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  //npx hardhat verify --network rinkeby 0xad77785D59277c177aC21EE4ec40Bff76a832077 "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  //npx hardhat verify --network rinkeby 0x84Ab56f0b32Ff4A07d07829b66beC7C519ec10d0 "0xad77785D59277c177aC21EE4ec40Bff76a832077"

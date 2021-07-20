const { ethers, waffle } = require('hardhat');
const { solidity } = require("ethereum-waffle");
const chai = require("chai");
const { expect } = chai;
chai.use(solidity);

const UniswapV2FactoryBytecode = require('@uniswap/v2-core/build/UniswapV2Factory.json').bytecode;
const UniswapV2FactoryAbi = require('@uniswap/v2-core/build/UniswapV2Factory.json').abi;
const UniswapV2RouterBytecode = require('@uniswap/v2-periphery/build/UniswapV2Router02.json').bytecode;
const UniswapV2RouterAbi = require('@uniswap/v2-periphery/build/UniswapV2Router02.json').abi;
const WethBytecode = require('@uniswap/v2-periphery/build/WETH9.json').bytecode;
const WethAbi = require('@uniswap/v2-periphery/build/WETH9.json').abi;
const { parseEther, formatEther } = require("ethers/lib/utils");
const { MaxUint256 } = ethers.constants;

const tokenAmount1 = parseEther("1000000");
const tokenAmount2 = parseEther("5000000");

const duration = 2000;

const initialLiquidityEth = parseEther("200");
const initialLiquidityToken = parseEther("500000000");

const communityAddress = "0xdD870fA1b7C4700F2BD7f44238821C26f7392148";

describe("Vesting Router", function () {
    let uniswapV2Router;
    let uniswapV2Pair;

    let mxsToken;
    let vestingRouter;
    let vestingOwner;

    let vestingContract1;
    let vestingContract2;

    let beneficiary1;
    let beneficiary2;
    let pretender;
    
    before(async function() {
        [mxsOwner, vestingOwner, beneficiary1, beneficiary2, pretender, tokenBuyer, lastAddr] = await ethers.getSigners();
        const UniswapV2Library = await ethers.getContractFactory(UniswapV2FactoryAbi, UniswapV2FactoryBytecode);
        const uniswapV2Library = await UniswapV2Library.deploy(vestingOwner.address);

        const WethLibrary = await ethers.getContractFactory(WethAbi, WethBytecode);
        const wethLibrary = await WethLibrary.deploy();

        const UniswapV2Router = await ethers.getContractFactory(UniswapV2RouterAbi, UniswapV2RouterBytecode);
        uniswapV2Router = await UniswapV2Router.deploy(uniswapV2Library.address, wethLibrary.address);

        const MXSToken = await ethers.getContractFactory("MXSToken");
        mxsToken = await MXSToken.deploy(uniswapV2Router.address);
        const uniswapV2PairAddress = await mxsToken.uniswapV2Pair();

        await mxsToken.deployed();

        await mxsToken.excludeFromReward(mxsOwner.address);

        await mxsToken.approve(uniswapV2Router.address, MaxUint256);
        await uniswapV2Router.addLiquidityETH(
          mxsToken.address,
          initialLiquidityToken,
          parseEther("0"),
          parseEther("0"),
          lastAddr.address,
          MaxUint256,
          {
            value: initialLiquidityEth
          });
    })

    beforeEach(async function () {    
        const VestingRouter = await ethers.getContractFactory("VestingRouter");
        vestingRouter = await VestingRouter.deploy(mxsToken.address);

        await vestingRouter.deployed();

        const tokenTransfer = await mxsToken.transfer(vestingRouter.address, tokenAmount1);
        await tokenTransfer.wait();

        const createVesting1 = await vestingRouter.createVesting(beneficiary1.address, tokenAmount1, duration, '0', true);
        await createVesting1.wait();

        const vesting1Info = await vestingRouter.userInfo(beneficiary1.address);
        vestingContract1 = await ethers.getContractAt("Vesting", vesting1Info.activeVesting);
    });

    it("Vests tokens relative to time passed", async function () {
        await ethers.provider.send("evm_increaseTime", [duration / 2]);
        await ethers.provider.send("evm_mine");

        const userVestingInfo1 = await vestingRouter.userVestingInfo(beneficiary1.address);
        const vestedAmount1 = formatEther(userVestingInfo1.vestedAmount);
        expect(vestedAmount1).to.equal(formatEther(parseEther("500000")));
    });

    it("Receives reflections", async function () {
        const balanceBefore = await mxsToken.balanceOf(vestingContract1.address);
        let routerAsBuyer = uniswapV2Router.connect(tokenBuyer);

        var path = [await uniswapV2Router.WETH(), mxsToken.address];
        var currentBlock = await ethers.provider.getBlock("latest");
        var timestamp = currentBlock.timestamp + 10000;

        await routerAsBuyer.swapETHForExactTokens(
          parseEther("1000000"),
          path,
          tokenBuyer.address,
          timestamp,
          { value: parseEther("100") }
        );

        const balanceAfter = await mxsToken.balanceOf(vestingContract1.address);        
        expect(balanceAfter).gte(balanceBefore);

        const taxTotal = await mxsToken._tFeeTotal();
        const communityTotal = await mxsToken._tCommunityTotal();

        console.log('tax == ', formatEther(taxTotal));
        console.log('community == ', formatEther(communityTotal));
    });

    // it("Withdraws unreleased ", async function () {


    // });

    // it("Only owner can create vesting contract", async function () {

    // });

    // it("Only owner can revoke vesting contract", async function () {

    // });

    // it("Address can only have 1 vesting contract at a time", async function () {

    // });

});
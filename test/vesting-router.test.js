const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { parseEther, formatEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");
const { MaxUint256 } = ethers.constants;

const UniswapV2FactoryBytecode = require('@uniswap/v2-core/build/UniswapV2Factory.json').bytecode;
const UniswapV2FactoryAbi = require('@uniswap/v2-core/build/UniswapV2Factory.json').abi;
const UniswapV2RouterBytecode = require('@uniswap/v2-periphery/build/UniswapV2Router02.json').bytecode;
const UniswapV2RouterAbi = require('@uniswap/v2-periphery/build/UniswapV2Router02.json').abi;
const WethBytecode = require('@uniswap/v2-periphery/build/WETH9.json').bytecode;
const WethAbi = require('@uniswap/v2-periphery/build/WETH9.json').abi;

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

    let vestingTimestamp1;

    let beneficiary1;
    let beneficiary2;
    let pretender;
    
    before(async function() {
        [mxsOwner, vestingOwner, beneficiary1, beneficiary2, pretender, tokenBuyer, lastAddr] = await ethers.getSigners();
        console.log("vesting owner == ", vestingOwner);

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
        const VestingRouterAsOwner = await VestingRouter.connect(vestingOwner);
        vestingRouter = await VestingRouterAsOwner.deploy(mxsToken.address);

        await vestingRouter.deployed();

        const tokenTransfer = await mxsToken.transfer(vestingRouter.address, tokenAmount1);
        await tokenTransfer.wait();

        const createVesting1 = await vestingRouter.createVesting(beneficiary1.address, tokenAmount1, duration, '0', true);
        await createVesting1.wait();

        const creationBlock = await ethers.provider.getBlock("latest");
        vestingTimestamp1 = creationBlock.timestamp;

        const vesting1Info = await vestingRouter.userInfo(beneficiary1.address);
        vestingContract1 = await ethers.getContractAt("Vesting", vesting1Info.activeVesting);
    });

    it("Vests tokens relative to time passed", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp", [vestingTimestamp1 + duration / 2 ]);
        await ethers.provider.send("evm_mine");

        const userVestingInfo1 = await vestingRouter.userVestingInfo(beneficiary1.address);
        const vestedAmount1 = formatEther(userVestingInfo1.releasableAmount);
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
    });

    it("Beneficiary can claim vested tokens without being taxed", async function () {
        const balanceBefore = await mxsToken.balanceOf(beneficiary1.address);
        const userVestingInfo1 = await vestingRouter.userVestingInfo(beneficiary1.address);

        const routerAsBeneficiary = await vestingRouter.connect(beneficiary1);

        await ethers.provider.send("evm_setNextBlockTimestamp", [vestingTimestamp1 + duration / 2]);

        await routerAsBeneficiary.release(userVestingInfo1.vestingAddress);

        const balanceAfter = await mxsToken.balanceOf(beneficiary1.address);
        const diff = balanceAfter.sub(balanceBefore);
        expect(diff).to.equal(parseEther("500000"));
    });

    it("Vesting owner can revoke vesting", async function () {
        const vestingRouterBalanceBefore = await mxsToken.balanceOf(vestingRouter.address);
        const userVestingInfo1 = await vestingRouter.userVestingInfo(beneficiary1.address);

        const routerAsOwner = await vestingRouter.connect(vestingOwner);

        await ethers.provider.send("evm_setNextBlockTimestamp", [vestingTimestamp1 + duration / 2]);

        console.log("Revoking")
        await routerAsOwner.revoke(userVestingInfo1.vestingAddress);
        console.log("done Revoking")

        const vestingBalance = await mxsToken.balanceOf(vestingContract1.address);
        expect(vestingBalance).to.equal(parseEther("0"));

        const vestingRouterBalanceAfter = await mxsToken.balanceOf(vestingRouter.address);
        const diff = vestingRouterBalanceAfter.sub(vestingRouterBalanceBefore);
        expect(diff).to.equal(parseEther("500000"));
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
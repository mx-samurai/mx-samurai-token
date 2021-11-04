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

describe("Token Dispense", function () {
    let owner;
    let claimer1;
    let claimer2;

    let signedMessage1;
    let signedMessage2;

    let dispenseAsClaimer1;
    let dispenseAsClaimer2;

    before(async function () {
        [owner, claimer1, claimer2] = await ethers.getSigners();

        const UniswapV2Library = await ethers.getContractFactory(UniswapV2FactoryAbi, UniswapV2FactoryBytecode);
        const uniswapV2Library = await UniswapV2Library.deploy(owner.address);

        const WethLibrary = await ethers.getContractFactory(WethAbi, WethBytecode);
        const wethLibrary = await WethLibrary.deploy();

        const UniswapV2Router = await ethers.getContractFactory(UniswapV2RouterAbi, UniswapV2RouterBytecode);
        uniswapV2Router = await UniswapV2Router.deploy(uniswapV2Library.address, wethLibrary.address);

        const MXSToken = await ethers.getContractFactory("MXSToken");
        mxsToken = await MXSToken.deploy(uniswapV2Router.address);

        const TokenDispense = await ethers.getContractFactory("TokenDispense");
        tokenDispense = await TokenDispense.deploy(mxsToken.address);
        dispenseAsClaimer1 = tokenDispense.connect(claimer1);
        dispenseAsClaimer2 = tokenDispense.connect(claimer2);

        await mxsToken.transfer(tokenDispense.address, parseEther('10000000'));

        const currentBlock = await ethers.provider.getBlock("latest");
        const currentTimestamp = currentBlock.timestamp;

        await mxsToken.setTradingStartTime(currentTimestamp + 20);
        await mxsToken.setMaxTxAmount(parseEther('10000000'));

        await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + 60]);
        await ethers.provider.send("evm_mine");

        // sign messages for the holders

        const message1 = ethers.utils.solidityKeccak256(
            ['address', 'uint256'],
            [claimer1.address, parseEther('1000000')]
        );
        const messageBinary1 = ethers.utils.arrayify(message1);
        signedMessage1 = await owner.signMessage(messageBinary1);

        const message2 = ethers.utils.solidityKeccak256(
            ['address', 'uint256'],
            [claimer2.address, parseEther('3000000')]
        );
        const messageBinary2 = ethers.utils.arrayify(message2);
        signedMessage2 = await owner.signMessage(messageBinary2);
    })

    it("Reverts for wrong token amount", async function () {
        await expect(dispenseAsClaimer1.claimTokens(signedMessage1, parseEther('1000001'))).to.be.revertedWith("TokenDispense: Message was not signed by owner");
    });

    it("Reverts for wrong sender", async function () {
        await expect(dispenseAsClaimer2.claimTokens(signedMessage1, parseEther('1000000'))).to.be.revertedWith("TokenDispense: Message was not signed by owner");
    });

    it("Succesfully air drops tokens", async function () {
        await expect(dispenseAsClaimer1.claimTokens(signedMessage1, parseEther('1000000'))).to.not.be.reverted;
        const claimer1Balance = await mxsToken.balanceOf(claimer1.address);
        expect(claimer1Balance).to.equal(parseEther('1000000'));

        await expect(dispenseAsClaimer2.claimTokens(signedMessage2, parseEther('3000000'))).to.not.be.reverted;
        const claimer2Balance = await mxsToken.balanceOf(claimer2.address);
        expect(claimer2Balance).to.equal(parseEther('3000000'));

    });

    it("Reverts if claimer tries again", async function () {
        await expect(dispenseAsClaimer1.claimTokens(signedMessage1, parseEther('1000000'))).to.be.revertedWith("TokenDispense: Address has already claimed");
    });

});
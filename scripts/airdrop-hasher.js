const { parseEther } = require("@ethersproject/units");
const hre = require("hardhat");
const airdroppers = require("./airdrop.json");
const Moralis  = require('moralis/node');
const { MORALIS_APP_ID, MORALIS_SERVER_URL } = require("../config");
Moralis.start({ serverUrl: MORALIS_SERVER_URL, appId: MORALIS_APP_ID });
const AirDrop = Moralis.Object.extend("AirDrop");

async function main() {
    [owner] = await ethers.getSigners();

    var moralisObjects = [];

    for (var i = 0; i<airdroppers.length; i++) {
        const obj = airdroppers[i];
        const message1 = ethers.utils.solidityKeccak256(
            ['address', 'uint256'],
            [obj.address, parseEther(obj.amount.toString())]
        );
        const messageBinary1 = ethers.utils.arrayify(message1);
        const signedMessage = await owner.signMessage(messageBinary1);

        const airdrop = new AirDrop();
        airdrop.set('message', signedMessage);
        airdrop.set('address', obj.address);
        airdrop.set('amount', parseEther(obj.amount.toString()));
        moralisObjects.push(airdrop);
    }

    console.log("MO = ", moralisObjects.length);
    await Moralis.Object.saveAll(moralisObjects);
    console.log('done');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  //npx hardhat verify --network rinkeby 0xc4e3ae02697a18Ce7d8486d587222d226Ab5Bf1d "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  //npx hardhat verify --network rinkeby 0xAFc784c42FDcf0661a03eD5eB46Cfb58A684aEbB "0xc4e3ae02697a18Ce7d8486d587222d226Ab5Bf1d"

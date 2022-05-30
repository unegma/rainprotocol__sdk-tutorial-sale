import * as rainSDK from "rain-sdk"; // rain SDK imported using importmap in index.html (or in package.json)
import { ethers } from "ethers"; // ethers library imported using importmap in index.html (or in package.json)
import { connect } from "./connect.js"; // a very basic web3 connection implementation
import { opcodeData } from "./opcodeData.js"; // opcode data for RainVM

// tutorial: https://docs.rainprotocol.xyz/guides/SDK/using-the-rain-sdk-to-deploy-a-sale-example-with-opcodes/
export async function saleExample() {
  const ERC20_DECIMALS = 18; // See here for more info: https://docs.openzeppelin.com/contracts/3.x/erc20#a-note-on-decimals
  const RESERVE_TOKEN = '0x25a4Dd4cd97ED462EB5228de47822e636ec3E31A'; // USDCC MUMBAI 0x25a4Dd4cd97ED462EB5228de47822e636ec3E31A (18 decimals). if you want to use MATIC, it needs to be wrapped Matic
  const WALLET_CAP = ethers.constants.MaxUint256; // no max otherwise can do: ethers.utils.parseUnits("100", ERC20_DECIMALS)
  const STATIC_PRICE = ethers.utils.parseUnits("0.001", ERC20_DECIMALS); // price 1000000000000000000 / 10^18 (reserve token erc deconimals)
  const DESIRED_UNITS = ethers.utils.parseUnits("1", ERC20_DECIMALS); // 1 of rTKN (this will be entered manually by a user)

  try {
    const { signer, address } = await connect(); // get the signer and account address using a very basic connection implementation

    // ### Configure and Deploy Sale

    // todo rename to saleConfig in other tutorials, rename to RECEIPT in other tutorials
    const saleConfig = {
      canStartStateConfig: opcodeData.canStartStateConfig, // config for the start of the Sale (see opcodes section below)
      canEndStateConfig: opcodeData.canEndStateConfig, // config for the end of the Sale (see opcodes section below)
      calculatePriceStateConfig: opcodeData.calculatePriceStateConfig(STATIC_PRICE, WALLET_CAP), // config for the `calculatePrice` function (see opcodes section below)
      recipient: address, // who will receive the RESERVE token (e.g. USDCC) after the Sale completes
      reserve: RESERVE_TOKEN, // the reserve token contract address (MUMBAI MATIC in this case)
      saleTimeout: 10000, // for MUMBAI 100 blocks (10 mins) // todo this will be changing to seconds in upcoming releases // this is to stop funds getting trapped (in case sale isn't ended by someone) (security measure for sale to end at some point)
      cooldownDuration: 100, // this will be 100 blocks (10 mins on MUMBAI) // todo this will stay as blocks in upcoming releases
      minimumRaise: ethers.utils.parseUnits("1000", ERC20_DECIMALS), // minimum to complete a Raise
      dustSize: ethers.utils.parseUnits("0", ERC20_DECIMALS), // todo check this: for bonding curve price curves (that generate a few left in the contract at the end)
    };
    const redeemableConfig = {
      erc20Config: { // config for the redeemable token (rTKN) which participants will get in exchange for reserve tokens
        name: "Raise token", // the name of the rTKN
        symbol: "rTKN", // the symbol for your rTKN
        distributor: "0x0000000000000000000000000000000000000000", // distributor address
        initialSupply: ethers.utils.parseUnits("10000", ERC20_DECIMALS), // initial rTKN supply
      },
      // todo can tier be removed? can erc721 be used instead?
      // todo why can't I decompile? https://mumbai.polygonscan.com/address/0xC064055DFf6De32f44bB7cCB0ca59Cbd8434B2de#code
      tier: "0xC064055DFf6De32f44bB7cCB0ca59Cbd8434B2de", // tier contract address (used for gating)
      minimumTier: 0, // minimum tier a user needs to take part
      distributionEndForwardingAddress: "0x0000000000000000000000000000000000000000" // the rTKNs that are not sold get forwarded here (0x00.. will burn them)
    }

    // todo what happens if one fails (inform users)
    console.warn("Info: It is important to let your users know how many transactions to expect and what they are. " +
      "This example consists of 5 Transactions:\n\n" +
      "* Create Sale (For Admins) (fee+gas cost at circa 2022-05-30T15:32:44Z: 0.002108 MATIC)\n" + // todo check how much gas costs can fluctuate (gas cost at 2022-05-30T15:27:32Z: 0.001992 MATIC) (gas cost at 2022-05-30T15:32:44Z: 0.044359 MATIC)
      "* Start Sale (For Admins) (fee+gas cost at circa 2022-05-30T15:32:44Z: 0.000061 MATIC) \n" +
      // todo what is this contract address? and is it approved to spend this again in future or only up to this amount?
      "* Give Permission to 0x642d4e6d828436ee95658c3462b46dafc1d0a61a to access USDCC (For Users) (fee+gas at circa 2022-05-30T15:32:44Z: 0.00009 MATIC) \n" +
      "* Buying from Sale (For Users) (fee+gas cost at circa 2022-05-30T15:32:44Z: 0.000531 MATIC) \n" +
      "* End Sale (For Admins) (fee+gas at circa 2022-05-30T15:32:44Z: 0.000158 MATIC) \n"
    );
    console.log('------------------------------'); // separator

    console.log("Info: Creating Sale with the following state:", saleConfig, redeemableConfig);
    const saleContract = await rainSDK.Sale.deploy(signer, saleConfig, redeemableConfig);
    console.log('Result: Sale Contract:', saleContract); // the Sale contract and corresponding address
    console.log('------------------------------'); // separator

    // ### Interact with the newly deployed ecosystem

    console.log('Info: Starting The Sale.');
    const startStatusTransaction = await saleContract.start();
    const startStatusReceipt = await startStatusTransaction.wait();
    console.log('Info: Sale Started Status:', startStatusReceipt);
    console.log('------------------------------'); // separator

    let price = await saleContract.calculatePrice(DESIRED_UNITS); // THIS WILL CALCULATE THE PRICE FOR **YOU** AND WILL TAKE INTO CONSIDERATION THE WALLETCAP, if the user's wallet cap is passed, the price will be so high that the user can't buy the token (you will see a really long number as the price)
    console.log(`Info: Price of tokens in the Sale: ${price.toNumber()/(10**ERC20_DECIMALS)}`); // 10 to the power of ERC20_DECIMALS

    // connect to the reserve token and approve the spend limit for the buy, to be able to perform the "buy" transaction.
    console.log(`Info: Connecting to Reserve token for approve:`, RESERVE_TOKEN);
    const reserveContract = new rainSDK.ERC20(RESERVE_TOKEN, signer)
    const approveTransaction = await reserveContract.approve(saleContract.address, DESIRED_UNITS);
    const approveReceipt = await approveTransaction.wait();
    console.log(`Info: Approve Status:`, approveReceipt);
    console.log('------------------------------'); // separator

    const buyConfig = {
      feeRecipient: address,
      fee: ethers.utils.parseUnits("0", ERC20_DECIMALS), // fee to be taken by the frontend
      minimumUnits: DESIRED_UNITS, // this will cause the sale to fail if there are (DESIRED_UNITS - remainingUnits) left in the sale
      desiredUnits: DESIRED_UNITS,
      maximumPrice: ethers.constants.MaxUint256, // this is for preventing slippage (for static price curves, this isn't really needed and can be set to the same as staticPrice) // todo is this better as staticPrice?
    }

    console.log(`Info: Buying from Sale with parameters:`, buyConfig);
    const buyStatusTransaction = await saleContract.buy(buyConfig);
    const buyStatusReceipt = await buyStatusTransaction.wait();
    console.log(`Info: Buy Status:`, buyStatusReceipt);
    console.log('------------------------------'); // separator

    console.log('Info: Ending The Sale.');
    const endStatusTransaction = await saleContract.end();
    const endStatusReceipt = await endStatusTransaction.wait();
    console.log('Info: Sale Ended Status:', endStatusReceipt);
    console.log('------------------------------'); // separator

    console.log("Info: Done");
  } catch (err) {
    console.log(err);
  }
}

saleExample();

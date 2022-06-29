import * as rainSDK from 'rain-sdk'; // rain SDK imported using importmap in index.html (or in package.json)
import { ethers } from 'ethers'; // ethers library imported using importmap in index.html (or in package.json)
import { connect } from './connect.js'; // a very basic web3 connection implementation
import { opcodeData } from './opcodeData.js'; // a very basic web3 connection implementation
import { logToWindow } from '@unegma/utils';
logToWindow('console'); // override console.log to output to browser with very simple styling (be aware, this prevents pushing multiple messages in one .log())

const CHAIN_DATA = {
  name: 'Mumbai',
  chainId: 80001 // Mumbai testnet chain id
}

/**
 * Sale Example
 * Tutorials (see Getting Started: https://docs.rainprotocol.xyz
 * @returns {Promise<void>}
 */
export async function saleExample() {
  try {
    console.log('> # Sale Example', 'black', 'bold');
    console.log('> Info: (check your console for more data and make sure you have a browser wallet installed and connected to Polygon Mumbai testnet)', 'orange');
    const { signer, address } = await connect(CHAIN_DATA); // get the signer and account address using a very basic connection implementation

    console.log('> ## Transactions', 'orange', 'bold');
    console.log('> Info: It is important to let your users know how many transactions to expect and what they are.', 'orange');
    console.log('> Info: This example consists of 5 Transactions:', 'orange');
    console.log('> ### For Admins:', 'orange', 'bold');
    console.log('> 1. Create Sale (fee+gas cost at circa 2022-05-30T15:32:44Z: 0.002108 MATIC)', 'orange');
    console.log('> 2. Start Sale (fee+gas cost at circa 2022-05-30T15:32:44Z: 0.000061 MATIC)', 'orange');
      // todo what is this contract address? and is it approved to spend this again in future or only up to this amount?
    console.log('> ### For Users:', 'orange', 'bold');
    console.log('> 3. a. Give Permission to spend Token from Wallet (fee+gas at circa 2022-05-30T15:32:44Z: 0.00009 MATIC)', 'orange');
    console.log('> 3. b. Buy from Sale with Tokens (fee+gas cost at circa 2022-05-30T15:32:44Z: 0.000531 MATIC)', 'orange');
    console.log('> ### For Admins:', 'orange', 'bold');
    console.log('> 4. End Sale (fee+gas at circa 2022-05-30T15:32:44Z: 0.000158 MATIC)', 'orange');
    // todo maybe warn users they will need to have X matic in their wallet in order to complete ALL the transactions

    console.log('------------------------------'); // separator

    console.log('> Info: BEFORE DOING THIS TUTORIAL, MAKE SURE YOU HAVE CREATED A RESERVE TOKEN FROM THE RESERVE TOKEN TUTORIAL AND ADDED THE ADDRESS TO: `RESERVE_TOKEN_ADDRESS`', 'red', 'bold');

    console.log('------------------------------'); // separator

    // constants (can put these into .env)

    // v-- TODO PUT YOUR RESERVE TOKEN ADDRESS FROM PREVIOUS TUTORIAL HERE --v
    const RESERVE_TOKEN_ADDRESS = "0x0BB108c8fD254D442bDb578569dba61a6eE44C5a"; // erc20 from previous tutorial
    // const RESERVE_TOKEN_ADDRESS = '0x25a4Dd4cd97ED462EB5228de47822e636ec3E31A'; // USDCC MUMBAI 0x25a4Dd4cd97ED462EB5228de47822e636ec3E31A (18 decimals). if you want to use MATIC, it needs to be wrapped Matic
    // ^-- TODO PUT YOUR RESERVE TOKEN ADDRESS FROM PREVIOUS TUTORIAL HERE --^

    const RESERVE_ERC20_DECIMALS = 18; // See here for more info: https://docs.openzeppelin.com/contracts/3.x/erc20#a-note-on-decimals
    const REDEEMABLE_ERC20_DECIMALS = 18; // See here for more info: https://docs.openzeppelin.com/contracts/3.x/erc20#a-note-on-decimals
    const REDEEMABLE_WALLET_CAP = ethers.constants.MaxUint256; // no max otherwise can do: ethers.utils.parseUnits("100", ERC20_DECIMALS_REDEEMABLE)
    const REDEEMABLE_INITIAL_SUPPLY = 100; // initial supply of redeemable tokens, needs to be formatted using ethers.utils.parseUnits
    const STATIC_RESERVE_PRICE_OF_REDEEMABLE = 1; // price 1000000000000000000 // 10^18 (reserve token erc decimals) // static price of the REDEEMABLE denoted in RESERVE // needs to be formatted using ethers.utils.parseUnits
    const SALE_TIMEOUT_IN_BLOCKS = 600; // for MUMBAI 100 blocks (10 mins) // this will be changing to seconds in upcoming releases // this is to stop funds getting trapped (in case sale isn't ended by someone) (security measure for sale to end at some point)
    const FRONTEND_FEE = 0; // fee to be taken by the frontend

    const DESIRED_UNITS_OF_REDEEMABLE = 1; // 1 of rTKN (this will usually be entered manually by a user)

    const saleConfig = {
      canStartStateConfig: opcodeData.canStartStateConfig, // config for the start of the Sale (see opcodes section below)
      canEndStateConfig: opcodeData.canEndStateConfig, // config for the end of the Sale (see opcodes section below)
      calculatePriceStateConfig: opcodeData.calculatePriceStateConfig(
        ethers.utils.parseUnits(STATIC_RESERVE_PRICE_OF_REDEEMABLE.toString(), RESERVE_ERC20_DECIMALS),
        REDEEMABLE_WALLET_CAP // this is already formatted with ethers.utils.parseUnits
      ), // config for the `calculatePrice` function (see opcodes section below)
      recipient: address, // who will receive the RESERVE token (e.g. USDCC) after the Sale completes
      reserve: RESERVE_TOKEN_ADDRESS, // the reserve token contract address (MUMBAI MATIC in this case)
      saleTimeout: SALE_TIMEOUT_IN_BLOCKS, // todo check if will stay as blocks or change to timestamps in upcoming releases
      cooldownDuration: 100, // this will be 100 blocks (10 mins on MUMBAI) // this will stay as blocks in upcoming releases
      dustSize: ethers.utils.parseUnits("0", RESERVE_ERC20_DECIMALS), // todo check this: for bonding curve price curves (that generate a few left in the contract at the end)

      // setting to 1 for the escrow example in the next tutorial
      minimumRaise: ethers.utils.parseUnits(DESIRED_UNITS_OF_REDEEMABLE.toString(), RESERVE_ERC20_DECIMALS), // minimum to complete a Raise // THIS WORKS WITH AN AMOUNT OF THE REDEEMABLE, BECAUSE THEY ARE CURRENTLY A 1 TO 1 MATCH, (MAKE SURE TO USE RESERVE_ERC20_DECIMALS)

      // an example where sale needs to sell all to complete
      // minimumRaise: ethers.utils.parseUnits(REDEEMABLE_INITIAL_SUPPLY.toString(), RESERVE_ERC20_DECIMALS), // minimum to complete a Raise // USING THE REDEEMABLE_INITIAL_SUPPLY HERE BECAUSE WE HAVE CONFIGURED 1 REDEEMABLE TO COST 1 RESERVE (using redeemable with reserve token decimals purposely)
    };
    const redeemableConfig = {
      // todo can erc721 be used instead?
      erc20Config: { // config for the redeemable token (rTKN) which participants will get in exchange for reserve tokens
        name: "Redeemable token", // the name of the rTKN
        symbol: "rTKN", // the symbol for your rTKN
        distributor: "0x0000000000000000000000000000000000000000", // distributor address
        initialSupply: ethers.utils.parseUnits(REDEEMABLE_INITIAL_SUPPLY.toString(), REDEEMABLE_ERC20_DECIMALS), // initial rTKN supply
      },
      tier: "0xC064055DFf6De32f44bB7cCB0ca59Cbd8434B2de", // tier contract address (used for gating) this can be ignored, but if deploying on any network other than mumbai, may need to be changed
      minimumTier: 0, // minimum tier a user needs to take part
      distributionEndForwardingAddress: "0x0000000000000000000000000000000000000000" // the rTKNs that are not sold get forwarded here (0x00.. will burn them)
    }

    console.log('> ## Section 1: (Admin Function) Create Sale', 'black', 'bold');
    console.log('> Info: Creating Sale with the following state:');
    console.log('> ### Sale Config:', 'blue', 'bold');
    console.log(saleConfig, 'blue');
    console.log('> ### Redeemable (rTKN) Config:', 'blue', 'bold');
    console.log(redeemableConfig, 'blue');
    const saleContract = await rainSDK.Sale.deploy(signer, saleConfig, redeemableConfig);
    console.log(`> Result: deployed Sale Contract with address: ${saleContract.address}`, 'green');
    console.info(saleContract); // the Sale contract
    const redeemableContract = await saleContract.getRedeemable();
    console.log(`> Result: Redeemable Contract Address: ${redeemableContract.address}`, 'green');
    console.info(redeemableContract); // the rTKN contract

    console.log('------------------------------'); // separator

    console.log('> ## Section 2: (Admin Function) Start Sale', 'black', 'bold');
    console.log('> Info: Note, a User can do this too (because of the open nature of blockchains), but it is more likely to be done by an Admin. Starting the Sale will be dependent on the canStartStateConfig', 'orange');
    console.log('> Info: Starting The Sale.');
    const startStatusTransaction = await saleContract.start();
    const startStatusReceipt = await startStatusTransaction.wait();
    console.log('> Result: Sale Started.', 'green');
    console.info(startStatusReceipt);

    console.log('------------------------------'); // separator

    console.log('> ## Section 3: (User Function) Approve Spend and Buy', 'black', 'bold');
    // connect to the reserve token and approve the spend limit for the buy, to be able to perform the "buy" transaction.
    console.log(`> Info: Connecting to Reserve token for approval of spend:`);
    console.log(RESERVE_TOKEN_ADDRESS, 'blue');
    const reserveContract = new rainSDK.EmissionsERC20(RESERVE_TOKEN_ADDRESS, signer) // use rainSDK.ERC20 if using USDC
    // const reserveContract = new rainSDK.ERC20(RESERVE_TOKEN_ADDRESS, signer) // use rainSDK.ERC20 if using USDC
    console.info(reserveContract);
    const approveTransaction = await reserveContract.approve(
      saleContract.address,
      ethers.utils.parseUnits(DESIRED_UNITS_OF_REDEEMABLE.toString(), REDEEMABLE_ERC20_DECIMALS)
    );
    const approveReceipt = await approveTransaction.wait();
    console.info(approveReceipt);
    console.log('> Result: Approved.', 'green');

    const buyConfig = {
      feeRecipient: address,
      fee: ethers.utils.parseUnits(FRONTEND_FEE.toString(), RESERVE_ERC20_DECIMALS), // fee to be taken by the frontend
      minimumUnits: ethers.utils.parseUnits(DESIRED_UNITS_OF_REDEEMABLE.toString(), REDEEMABLE_ERC20_DECIMALS), // this will cause the sale to fail if there are (DESIRED_UNITS - remainingUnits) left in the sale
      desiredUnits: ethers.utils.parseUnits(DESIRED_UNITS_OF_REDEEMABLE.toString(), REDEEMABLE_ERC20_DECIMALS),
      maximumPrice: ethers.utils.parseUnits(STATIC_RESERVE_PRICE_OF_REDEEMABLE.toString(), RESERVE_ERC20_DECIMALS), // this is for preventing slippage (for static price curves, this isn't really needed and can be set to the same as staticPrice)
    }

    let priceOfRedeemableInUnitsOfReserve = await saleContract.calculatePrice(
      ethers.utils.parseUnits(DESIRED_UNITS_OF_REDEEMABLE.toString(), REDEEMABLE_ERC20_DECIMALS)
    ); // THIS WILL CALCULATE THE PRICE FOR **YOU** AND WILL TAKE INTO CONSIDERATION THE WALLETCAP, if the user's wallet cap is passed, the price will be so high that the user can't buy the token (you will see a really long number as the price)
    console.log(`> Info: Price of tokens in the Sale: ${parseInt(priceOfRedeemableInUnitsOfReserve.toString())/(10**RESERVE_ERC20_DECIMALS)} ${await reserveContract.symbol()} (${reserveContract.address})`); // 10 to the power of REDEEMABLE_ERC20_DECIMALS
    console.log(`> Info: Buying ${DESIRED_UNITS_OF_REDEEMABLE} ${redeemableConfig.erc20Config.symbol} from Sale with parameters:`);
    console.log(buyConfig, 'blue');
    const buyStatusTransaction = await saleContract.buy(buyConfig);
    const buyStatusReceipt = await buyStatusTransaction.wait();
    console.info(buyStatusReceipt);
    console.log(`> Result: Buy Successful (add the token address: ${redeemableContract.address} to your wallet to view)`, 'green');

    console.log('------------------------------'); // separator

    console.log('> ## Section 4: (Admin Function) End Sale', 'black', 'bold');
    console.log('> Info: Note, a User can do this too (because of the open nature of blockchains), but it is more likely to be done by an Admin. Ending the Sale will be dependent on the canEndStateConfig', 'orange');
    console.log('> Info: Ending The Sale.');
    const endStatusTransaction = await saleContract.end();
    const endStatusReceipt = await endStatusTransaction.wait();
    console.log('> Result: Sale Ended.', 'green');
    console.info(endStatusReceipt);

    console.log('------------------------------'); // separator

    console.log('> Info: Completed Successfully');
  } catch (err) {
    console.log('------------------------------'); // separator
    console.log(`> Error: ${err.message}`, 'red', 'bold');
    console.warn(err);
  }
}

saleExample();

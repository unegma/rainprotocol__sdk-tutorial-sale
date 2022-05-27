import * as rainSDK from "rain-sdk";
import { ethers} from "ethers";
const ERC20_DECIMALS = 18; // See here for more info: https://docs.openzeppelin.com/contracts/3.x/erc20#a-note-on-decimals

// tutorial: https://docs.rainprotocol.xyz/guides/SDK/using-the-rain-sdk-to-deploy-a-sale-example-with-opcodes/
export async function saleExample() {
  const CHAIN_ID = 80001; // Mumbai testnet chain id
  const staticPrice = ethers.utils.parseUnits("0.001", ERC20_DECIMALS); // price 1000000000000000000 / 10^18 (reserve token erc deconimals)
  const walletCap = ethers.constants.MaxUint256; // no max otherwise: ethers.utils.parseUnits("100", ERC20_DECIMALS)

  // todo rename to saleConfig in other tutorials, rename to RECEIPT in other tutorials
  const saleConfig = {
    canStartStateConfig: undefined, // config for the start of the Sale (see opcodes section below)
    canEndStateConfig: undefined, // config for the end of the Sale (see opcodes section below)
    calculatePriceStateConfig: undefined, // config for the `calculatePrice` function (see opcodes section below)
    recipient: undefined, // who will receive the RESERVE token (e.g. USDCC) after the Sale completes
    reserve: "0x0000000000000000000000000000000000001010", // the reserve token contract address (MUMBAI MATIC in this case)
    saleTimeout: 10000, // for MUMBAI 100 blocks (10 mins)  1000 minutes (16 hours-ish) // todo this will be changing to seconds in upcoming releases // this is to stop funds getting trapped (in case sale isn't ended by someone) (security measure for sale to end at some point)
    cooldownDuration: 100, // this will be 100 blocks (10 mins on MUMBAI) // todo this will stay as blocks in upcoming releases
    minimumRaise: ethers.utils.parseUnits("1000", ERC20_DECIMALS), // this will be the rTKN - todo check
    dustSize: ethers.utils.parseUnits("0", ERC20_DECIMALS), // todo check this: for bonding curve price curves (that generate a few left in the contract at the end)
  };
  const redeemableConfig = {
    erc20Config: { // config for the redeemable token (rTKN) which participants will get in exchange for reserve tokens
      name: "Raise token", // the name of the rTKN
      symbol: "rTKN", // the symbol for your rTKN
      distributor: "0x0000000000000000000000000000000000000000", // distributor address
      initialSupply: ethers.utils.parseUnits("10000", ERC20_DECIMALS), // initial rTKN supply
    },
    tier: "0xC064055DFf6De32f44bB7cCB0ca59Cbd8434B2de", // todo what is this one? tier contract address (used for gating)
    minimumTier: 0, // minimum tier a user needs to take part
    distributionEndForwardingAddress: "0x0000000000000000000000000000000000000000" // the rTKNs that are not sold get forwarded here (0x00.. will burn them)
  }

  try {
    const {ethereum} = window;

    if (!ethereum) {
      console.log("No Web3 Wallet installed");
    }

    const provider = new ethers.providers.Web3Provider(ethereum, {
      name: 'Mumbai',
      chainId: CHAIN_ID,
    });

    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    console.log("Info: Account address", address);
    console.log('------------------------------'); // separator

    // v-- Configuration code below this line --v
    saleConfig.recipient = address;

    saleConfig.canStartStateConfig = {
      constants: [1],
      sources: [
        ethers.utils.concat([
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0),
        ]),
      ],
      stackLength: 1,
      argumentsLength: 0,
    };

    // const blockNumber = 1;
    //
    // // saleScriptGenerator can be used for gating who can start the sale
    // // rainSDK.SaleDurationInTimestamp (todo check the saleScriptGenerator in rain-sdk)
    //
    // saleConfig.canStartStateConfig = {
    //   constants: [blockNumber],
    //   sources: [
    //     ethers.utils.concat([
    //       rainSDK.VM.op((rainSDK.Sale.Opcodes.BLOCK_NUMBER)), // this is changing to timestamp version
    //       rainSDK.VM.op((rainSDK.Sale.Opcodes.VAL, 0)),
    //       rainSDK.VM.op((rainSDK.Sale.Opcodes.GREATER_THAN)),
    //     ]),
    //   ],
    //   stackLength: 3,
    //   argumentsLength: 0,
    // };

    saleConfig.canEndStateConfig = {
      constants: [1],
      sources: [
        ethers.utils.concat([
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0),
        ]),
      ],
      stackLength: 1,
      argumentsLength: 0,
    };

    // define the parameters for the VM which will be used whenever the price is calculated, for example, when a user wants to buy a number of units
    saleConfig.calculatePriceStateConfig = {
      constants: [staticPrice, walletCap, ethers.constants.MaxUint256], // staticPrice, walletCap, (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
      sources: [
        ethers.utils.concat([
          // put onto the stack, the amount the current user wants to buy
          rainSDK.VM.op(rainSDK.Sale.Opcodes.CURRENT_BUY_UNITS), // runtime value from the context

          // put onto the stack, the current token balance of the user (the Sale's rTKN represented in the smart contract)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.TOKEN_ADDRESS),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.SENDER),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.IERC20_BALANCE_OF),

          // add the first two elements of the stack (current buy units and balance of that user)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.ADD, 2),

          // here we have a potential new value which we will compare to walletCap

          // and then check if it exceeds the walletCap (ie the amount allowed)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 1),// walletCap ()
          rainSDK.VM.op(rainSDK.Sale.Opcodes.GREATER_THAN), // this will put a boolean on the stack (true: 1, false: 0)

          // this will behave like a minimum wallet cap, so you cant buy below this amount
          // rainSDK.VM.op(rainSDK.Sale.Opcodes.LESS_THAN), // this will put a boolean on the stack (true: 1, false: 0)

          // eager if will get the 1st (result of greater than) and 3rd value
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 2), // `MaxUint256` this will be executed if the check above is true (this is an infinity price so it can't be bought)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0), // `staticPrice` this will be executed if the check above is false (staticPrice is the price that the user wants to exchange the tokens for)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.EAGER_IF),
        ]),
      ],
      stackLength: 10,
      argumentsLength: 0,
    };

    // ^-- Configuration code above this line --^

    console.log(
      "Submitting the following state:",
      saleConfig,
      redeemableConfig
    );

    const saleContract = await rainSDK.Sale.deploy(
      signer,
      saleConfig,
      redeemableConfig
    );

    console.log('Result: Sale Contract:', saleContract); // the Sale contract and corresponding address
    console.log('------------------------------'); // separator

    // ### Interact with the newly deployed ecosystem

    console.log('Info: Starting Sale.');
    const startStatusTransaction = await saleContract.start();
    const startStatusReceipt = await startStatusTransaction.wait();
    console.log('Info: Sale Started Status:', startStatusReceipt);
    console.log('------------------------------'); // separator

    const DESIRED_UNITS = ethers.utils.parseUnits("1", ERC20_DECIMALS); // 1 of rTKN

    let price = await saleContract.calculatePrice(DESIRED_UNITS); // THIS WILL CALCULATE THE PRICE FOR **YOU** AND WILL TAKE INTO CONSIDERATION THE WALLETCAP, if the wallet cap is passed, the price will be so high that the user can't buy the token (you will see a really long number)
    console.log(`Info: Price of tokens in the Sale: ${price/10^ERC20_DECIMALS}`); // todo check the price is correct

    // configure buy for the sale (We have set this to Matic which is also used for paying gas fees, but this could easily be set to usdcc or some other token)
    const buyConfig = {
      feeRecipient: address,
      fee: ethers.utils.parseUnits("0", ERC20_DECIMALS), // TODO IS THIS NEEDED TO BE toNumber(). no // todo why does this work as 0.1 if eth doesn't have decimals

      // checks desiredUnits first, then minimumUnits (e.g. if there aren't any left over in the sale)
      minimumUnits: DESIRED_UNITS,
      desiredUnits: DESIRED_UNITS,

      // this is for preventing slippage (for static price curves, this isn't really needed and can be set to the same as staticPrice)
      maximumPrice: ethers.constants.MaxUint256, // 0.001 matic? // TODO VERY ARBITRARY ETHERS CONSTANT MAX AMOUNT // todo why do we set this? // TODO IS THIS NEEDED TO BE toNumber()
      // maximumPrice: staticPrice, // 0.001 matic? // TODO VERY ARBITRARY ETHERS CONSTANT MAX AMOUNT // todo why do we set this? // TODO IS THIS NEEDED TO BE toNumber()
    }

    console.log(`Info: Buying from Sale with parameters:`, buyConfig);
    const buyStatusTransaction = await saleContract.buy(buyConfig);
    const buyStatusReceipt = await buyStatusTransaction.wait();
    console.log(`Info: Buy Status:`, buyStatusReceipt);

    console.log('------------------------------'); // separator
    console.log("Info: Done");

  } catch (err) {
    console.log(err);
  }
}

//saleSate.canStartStateConfig = new SaleDurationInTimestamp(startTimestamp).applyOwnership(deployer-addres)

saleExample();

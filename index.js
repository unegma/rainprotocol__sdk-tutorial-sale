import * as rainSDK from "rain-sdk";
import { ethers} from "ethers";

export async function saleExample() {

  const CHAIN_ID = 80001;
  const saleState = {
    canStartStateConfig: undefined,
    canEndStateConfig: undefined,
    calculatePriceStateConfig: undefined,
    recipient: "",
    reserve: "0x25a4dd4cd97ed462eb5228de47822e636ec3e31a",
    saleTimeout: 100,
    cooldownDuration: 100,
    minimumRaise: 1000,
    dustSize: 0
  };
  const redeemableState = {
    erc20Config: {
      name: "Raise token",
      symbol: "rTKN",
      distributor: "0x0000000000000000000000000000000000000000",
      initialSupply: 1000,
    },
    tier: "0xC064055DFf6De32f44bB7cCB0ca59Cbd8434B2de",
    minimumTier: 0,
    distributionEndForwardingAddress: "0x0000000000000000000000000000000000000000"
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
    console.log("Account:", address);

    // v Configuration code below this line

    saleState.canStartStateConfig = {
      constants: [1],
      sources: [
        ethers.utils.concat([
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0),
        ]),
      ],
      stackLength: 1,
      argumentsLength: 0,
    };

    saleState.canEndStateConfig = {
      constants: [1],
      sources: [
        ethers.utils.concat([
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0),
        ]),
      ],
      stackLength: 1,
      argumentsLength: 0,
    };

    // current buy units: amount want to buy, put into stack
    // token address
    // returns current token balance

    // define the parameters for the VM which will be used whenever the price is calculated, for example, when a user wants to buy a number of units
    // the order is important
    //
    saleState.calculatePriceStateConfig = {
      constants: [100, 10, ethers.constants.MaxUint256], // staticPrice, walletCap, MaxUint256 (ffff..) todo check if staticPrice/walletCap needs to be parsed (divide by 18 0s?)
      sources: [
        ethers.utils.concat([
          // put onto the stack, the amount the current user wants to buy
          rainSDK.VM.op(rainSDK.Sale.Opcodes.CURRENT_BUY_UNITS), //

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

    // convert the initial supply into the correct format
    redeemableState.erc20Config.initialSupply = ethers.utils.parseUnits(
      redeemableState.erc20Config.initialSupply.toString()
    );

    saleState.recipient = address;

    // ^ Configuration code above this line

    console.log(
      "Submitting the following state:",
      saleState,
      redeemableState
    );

    const result = await rainSDK.Sale.deploy(
      signer,
      saleState,
      redeemableState
    );

    console.log(result); // the Sale contract and corresponding address
  } catch (err) {
    console.log(err);
  }
}

saleExample();
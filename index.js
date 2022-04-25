import * as rainSDK from "rain-sdk";
import { ethers} from "ethers";

/**
 * Converts an opcode and operand to bytes, and returns their concatenation.
 * @param code - the opcode
 * @param erand - the operand, currently limited to 1 byte (defaults to 0)
 */
function op(code, erand = 0) {
  return ethers.utils.concat([bytify(code), bytify(erand)]);
}

/**
 * Converts a value to raw bytes representation. Assumes `value` is less than or equal to 1 byte, unless a desired `bytesLength` is specified.
 *
 * @param value - value to convert to raw bytes format
 * @param bytesLength - (defaults to 1) number of bytes to left pad if `value` doesn't completely fill the desired amount of memory. Will throw `InvalidArgument` error if value already exceeds bytes length.
 * @returns {Uint8Array} - raw bytes representation
 */
function bytify(
  value,
  bytesLength = 1
) {
  return ethers.utils.zeroPad(ethers.utils.hexlify(value), bytesLength);
}

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

    // current buy units: amount want to buy, put into stack
    // token address
    // returns current token balance

    // define the parameters for the VM which will be used whenever the price is calculated, for example, when a user wants to buy a number of units
    // the order is important
    //
    saleState.calculatePriceStateConfig = {
      sources: [
        ethers.utils.concat([
          // put onto the stack, the amount the current user wants to buy
          op(rainSDK.Sale.Opcode.CURRENT_BUY_UNITS), //

          // put onto the stack, the current token balance of the user (the Sale's rTKN represented in the smart contract)
          op(rainSDK.Sale.Opcode.TOKEN_ADDRESS),
          op(rainSDK.Sale.Opcode.SENDER),
          op(rainSDK.Sale.Opcode.IERC20_BALANCE_OF),

          // add the first two elements of the stack (current buy units and balance of that user)
          op(rainSDK.Sale.Opcode.ADD, 2),

          // here we have a potential new value which we will compare to walletCap

          // and then check if it exceeds the walletCap (ie the amount allowed)
          op(rainSDK.Sale.Opcode.VAL, 1),// walletCap ()
          op(rainSDK.Sale.Opcode.GREATER_THAN), // this will put a boolean on the stack (true: 1, false: 0)

          // this will behave like a minimum wallet cap, so you cant buy below this amount
          // op(rainSDK.Sale.Opcode.LESS_THAN), // this will put a boolean on the stack (true: 1, false: 0)

          // eager if will get the 1st (result of greater than) and 3rd value
          op(rainSDK.Sale.Opcode.VAL, 2), // `MaxUint256` this will be executed if the check above is true (this is an infinity price so it can't be bought)
          op(rainSDK.Sale.Opcode.VAL, 0), // `staticPrice` this will be executed if the check above is false (staticPrice is the price that the user wants to exchange the tokens for)
          op(rainSDK.Sale.Opcode.EAGER_IF),
        ]),
      ],
      constants: [100, 10, ethers.constants.MaxUint256], // staticPrice, walletCap, MaxUint256 (ffff..) todo check if staticPrice/walletCap needs to be parsed (divide by 18 0s?)
      stackLength: 10,
      argumentsLength: 0,
    };

    // see the react example for a more complex example of passing opcodes to detect whether can start/end is after now or not.
    // todo can I pass bytecode here instead?
    // todo find out the name of these chunks
    saleState.canStartStateConfig = {
      sources: [
        ethers.utils.concat([
          op(rainSDK.Sale.Opcode.VAL, 0),
        ]),
      ],
      constants: [1],
      stackLength: 1,
      argumentsLength: 0,
    };

    saleState.canEndStateConfig = {
      sources: [
        ethers.utils.concat([
          op(rainSDK.Sale.Opcode.VAL, 0),
        ]),
      ],
      constants: [1],
      stackLength: 1,
      argumentsLength: 0,
    };

    // todo simplify this
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
import * as rainSDK from "rain-sdk";
import { ethers, BigNumber, utils } from "ethers";


const afterTimestampConfig = (timestamp) => {
  return {
    sources: [
      ethers.utils.concat([
        // (BLOCK_NUMBER blockNumberSub1 gt)
        op(rainSDK.Sale.Opcode.BLOCK_TIMESTAMP),
        op(rainSDK.Sale.Opcode.VAL, 0),
        op(rainSDK.Sale.Opcode.GREATER_THAN),
      ]),
    ],
    constants: [timestamp],
    stackLength: 3,
    argumentsLength: 0,
  };
};

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

    const staticPrice = 100; // todo this might not work and is not currently retreived dynamically here from a reserveErc20
    const walletCap = 10; // too see above

    const constants = [staticPrice, walletCap, ethers.constants.MaxUint256];
    const sources = [
      ethers.utils.concat([
        op(rainSDK.Sale.Opcode.CURRENT_BUY_UNITS),
        op(rainSDK.Sale.Opcode.TOKEN_ADDRESS),
        op(rainSDK.Sale.Opcode.SENDER),
        op(rainSDK.Sale.Opcode.IERC20_BALANCE_OF),
        op(rainSDK.Sale.Opcode.ADD, 2),
        op(rainSDK.Sale.Opcode.VAL, 1),
        op(rainSDK.Sale.Opcode.GREATER_THAN),
        op(rainSDK.Sale.Opcode.VAL, 2),
        op(rainSDK.Sale.Opcode.VAL, 0),
        op(rainSDK.Sale.Opcode.EAGER_IF),
      ]),
    ];

    saleState.calculatePriceStateConfig = {
      sources,
      constants,
      stackLength: 10,
      argumentsLength: 0,
    };

    // TODO: This is sent to `afterTimestampConfig` function and cause the `constant` being a NaN
    // let raiseRange;
    // In the rain tool kit, this variable is set with a range of dates on front end where [0] is start date
    // and [1] is end date.
    // I added both Dates:
    // The startDate is raiseRange[0] and will be the current Date
    // The endDate is raiseRange[1] and will be the current Date + 30 minutes (30 * 60000 miliseconds)
    const currentDate = new Date();
    const raiseRange = [
      currentDate,
      new Date(currentDate.getTime() + 30 * 60000),
    ];

    saleState.canStartStateConfig = afterTimestampConfig(
      Math.floor(raiseRange[0].getTime() / 1000)
    );
    saleState.canEndStateConfig = afterTimestampConfig(
      Math.floor(raiseRange[1].getTime() / 1000)
    );

    // big numbers // todo should be able to remove
    // saleState.cooldownDuration = ethers.utils.parseUnits(
    //   saleState.cooldownDuration.toString()
    // );
    // saleState.minimumRaise = ethers.utils.parseUnits(
    //   saleState.minimumRaise.toString()
    // );

    saleState.recipient = address;

    // todo simplify this
    redeemableState.erc20Config.initialSupply = ethers.utils.parseUnits(
      redeemableState.erc20Config.initialSupply.toString()
    );


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

    console.log(result); // the sale contract
  } catch (err) {
    console.log(err);
  }
}

saleExample();
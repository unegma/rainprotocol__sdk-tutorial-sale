import * as rainSDK from "rain-sdk";
import { ethers, BigNumber, utils } from "ethers";


/**
 * Enum for Opcodes
 * @readonly
 * @enum number
 */
const Opcode = Object.freeze({
  SKIP: 0,
  VAL: 1,
  DUP: 2,
  ZIPMAP: 3,
  BLOCK_NUMBER: 4,
  BLOCK_TIMESTAMP: 5,
  SENDER: 6,
  IS_ZERO: 7,
  EAGER_IF: 8,
  EQUAL_TO: 9,
  LESS_THAN: 10,
  GREATER_THAN: 11,
  EVERY: 12,
  ANY: 13,
  ADD: 14,
  SUB: 15,
  MUL: 16,
  DIV: 17,
  MOD: 18,
  POW: 19,
  MIN: 20,
  MAX: 21,
  REPORT: 22,
  NEVER: 23,
  ALWAYS: 24,
  SATURATING_DIFF: 25,
  UPDATE_BLOCKS_FOR_TIER_RANGE: 26,
  SELECT_LTE: 27,
  ERC20_BALANCE_OF: 28,
  ERC20_TOTAL_SUPPLY: 29,
  ERC721_BALANCE_OF: 30,
  ERC721_OWNER_OF: 31,
  ERC1155_BALANCE_OF: 32,
  ERC1155_BALANCE_OF_BATCH: 33,
  REMAINING_UNITS: 34,
  TOTAL_RESERVE_IN: 35,
  LAST_BUY_BLOCK: 36,
  LAST_BUY_UNITS: 37,
  LAST_BUY_PRICE: 38,
  CURRENT_BUY_UNITS: 39,
  TOKEN_ADDRESS: 40,
  RESERVE_ADDRESS: 41
})

const afterTimestampConfig = (timestamp) => {
  return {
    sources: [
      ethers.utils.concat([
        // (BLOCK_NUMBER blockNumberSub1 gt)
        op(Opcode.BLOCK_TIMESTAMP),
        op(Opcode.VAL, 0),
        op(Opcode.GREATER_THAN),
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
    "recipient": "",
    "reserve": "0x25a4dd4cd97ed462eb5228de47822e636ec3e31a",
    "cooldownDuration": 100,
    "saleTimeout": 100,
    "minimumRaise": 1000,
    "dustSize": 0
  };
  const redeemableState = {
    "erc20Config": {
      "name": "Raise token",
      "symbol": "rTKN",
      "initialSupply": 1000,
    },
    "tier": "0xC064055DFf6De32f44bB7cCB0ca59Cbd8434B2de",
    "minimumTier": 0
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
        op(Opcode.CURRENT_BUY_UNITS),
        op(Opcode.TOKEN_ADDRESS),
        op(Opcode.SENDER),
        op(Opcode.ERC20_BALANCE_OF),
        op(Opcode.ADD, 2),
        op(Opcode.VAL, 1),
        op(Opcode.GREATER_THAN),
        op(Opcode.VAL, 2),
        op(Opcode.VAL, 0),
        op(Opcode.EAGER_IF),
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

    // big numbers
    saleState.cooldownDuration = ethers.utils.parseUnits(
      saleState.cooldownDuration.toString()
    );
    saleState.minimumRaise = ethers.utils.parseUnits(
      saleState.minimumRaise.toString()
    );

    saleState.recipient = address;


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
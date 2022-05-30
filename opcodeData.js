import * as rainSDK from "rain-sdk";
import { ethers } from "ethers";

export const opcodeData = {
  // Configuration for determining when a sale can start. Currently set to any time
  canStartStateConfig: {
    constants: [1],
    sources: [
      ethers.utils.concat([
        rainSDK.utils.op(rainSDK.Sale.Opcodes.VAL, 0),
      ]),
    ],
    stackLength: 1,
    argumentsLength: 0,
  },

  // Configuration for determining when a sale can end. Currently set to any time
  canEndStateConfig: {
    constants: [1],
    sources: [
      ethers.utils.concat([
        rainSDK.utils.op(rainSDK.Sale.Opcodes.VAL, 0),
      ]),
    ],
    stackLength: 1,
    argumentsLength: 0,
  },

  // define the parameters for the VM which will be used whenever the price is calculated, for example, when a user wants to buy a number of units
  calculatePriceStateConfig: (STATIC_PRICE, WALLET_CAP) => ({
    constants: [STATIC_PRICE, WALLET_CAP, ethers.constants.MaxUint256], // staticPrice, walletCap, (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
    sources: [
      ethers.utils.concat([
        // put onto the stack, the amount the current user wants to buy (this is retrieved at runtime and matches the DESIRED_UNITS which we have hard coded here
        rainSDK.utils.op(rainSDK.Sale.Opcodes.CURRENT_BUY_UNITS),

        // put onto the stack, the current token balance of the user (the Sale's rTKN represented in the smart contract)
        rainSDK.utils.op(rainSDK.Sale.Opcodes.TOKEN_ADDRESS),
        rainSDK.utils.op(rainSDK.Sale.Opcodes.SENDER),
        rainSDK.utils.op(rainSDK.Sale.Opcodes.IERC20_BALANCE_OF),

        // add the first two elements of the stack (current buy units and balance of that user)
        rainSDK.utils.op(rainSDK.Sale.Opcodes.ADD, 2),

        // here we have a potential new value which we will compare to walletCap

        // and then check if it exceeds the walletCap (ie the amount allowed)
        rainSDK.utils.op(rainSDK.Sale.Opcodes.VAL, 1),// walletCap ()
        rainSDK.utils.op(rainSDK.Sale.Opcodes.GREATER_THAN), // this will put a boolean on the stack (true: 1, false: 0)

        // this will behave like a minimum wallet cap, so you cant buy below this amount
        // rainSDK.utils.op(rainSDK.Sale.Opcodes.LESS_THAN), // this will put a boolean on the stack (true: 1, false: 0)

        // eager if will get the 1st (result of greater than) and 3rd value
        rainSDK.utils.op(rainSDK.Sale.Opcodes.VAL, 2), // `MaxUint256` this will be executed if the check above is true (this is an infinity price so it can't be bought)
        rainSDK.utils.op(rainSDK.Sale.Opcodes.VAL, 0), // `staticPrice` this will be executed if the check above is false (staticPrice is the price that the user wants to exchange the tokens for)
        rainSDK.utils.op(rainSDK.Sale.Opcodes.EAGER_IF),
      ]),
    ],
    stackLength: 10,
    argumentsLength: 0,
  })
};

import { ethers } from "ethers";

/**
 * Very basic connection to Web3 wallet
 * @returns {Promise<{address: *, signer: *}>}
 */
export const connect = async () => {
  try {
    const {ethereum} = window;

    const provider = new ethers.providers.Web3Provider(ethereum, {
      name: 'Mumbai',
      chainId: 80001 // Mumbai testnet chain id,
    });

    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    console.log("Info: Connected to account with address", address);
    console.log('------------------------------'); // separator
    return { signer, address };
  } catch (err) {
    console.log('Error: You may not have a Web3 Wallet installed', err);
    throw new Error('Web3WalletConnectError');
  }
}

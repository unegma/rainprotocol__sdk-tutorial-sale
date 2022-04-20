import * as rainSDK from "@unegma/rain-sdk";
// import * as rainSDK from "rain-sdk";
import { ethers, BigNumber } from "ethers";

export async function gatedNFTExample() {
  const CHAIN_ID = 80001;
  const gatedNFTState = {
    config: {
      name: 'My Gated NFT',
      symbol: 'myGNFT',
      description: 'My Gated NFT can be used to token gate things',
      animationUrl: '',
      animationHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      imageUrl: 'https://thumbs.dreamstime.com/b/gold-badge-5392868.jpg',
      imageHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    },
    tier: '0xcd953b94999808ee07a33860dd46689580c90cf4',
    minimumStatus: 2,
    maxPerAddress: 2,
    transferrable: 0,
    maxMintable: 10,
    royaltyRecipient: "",
    royaltyBPS: 10
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
    console.log(`Signer:`, signer);
    console.log(`Address: ${address}`);

    // convert royaltyBPS to BigNumber format
    gatedNFTState.royaltyBPS = BigNumber.from(
      Math.floor(gatedNFTState.royaltyBPS * 100)
    );

    // set YOU to the recipient
    gatedNFTState.royaltyRecipient = address;

    console.log(
      "Submitting the following state (with the config fields bundled into config):",
      gatedNFTState,
    );

    const result = await rainSDK.GatedNFT.deploy(
      signer,
      gatedNFTState
    );

    console.log(result);
  } catch (err) {
    console.log(err);
  }
}

gatedNFTExample();
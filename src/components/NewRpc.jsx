import React from "react";
import { Button } from "antd";

let counter = 0;

export default function AddRPC({ chainName, rpcUrl }) {
  return (
    <div>
      <AddCustomRPCButton chainName={chainName} rpcUrl={rpcUrl} />
    </div>
  );
}

// make exportable //
const AddCustomRPCButton = ({ chainName, rpcUrl }) => {
  const handleAddCustomRPC = async () => {
    if (!window.ethereum || !window.ethereum.request) {
      console.error("MetaMask Ethereum provider is not available");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x1", // Replace with the desired Chain ID
            chainName: chainName + " " + counter, // Replace with the desired network name
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: [rpcUrl.toString()], // Replace with the desired RPC URL
            blockExplorerUrls: ["https://etherscan.io"], // Replace with the desired block explorer URL
          },
        ],
      });
      console.log("Custom RPC network added to MetaMask");
    } catch (error) {
      console.error("Failed to add custom RPC network to MetaMask:", error);
    }
  };

  return (
    <Button style={{ width: "500px" }} onClick={handleAddCustomRPC}>
      Click to add your personal Flashbots RPC to MetaMask
    </Button>
  );
};

/* eslint-disable prettier/prettier */
import WalletConnectProvider from "@walletconnect/web3-provider";
import { StaticJsonRpcProvider, Web3Provider } from "@ethersproject/providers";
//import Torus from "@toruslabs/torus-embed"
import WalletLink from "walletlink";
import { Alert, Button, Col, Menu, Row, Input, Select, Divider, Image } from "antd";
import ReactJson from "react-json-view";
import "antd/dist/antd.css";
import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Link, Route, Switch, useParams } from "react-router-dom";
import Web3Modal, { local } from "web3modal";
import "./App.css";
import { Account, Contract, Faucet, GasGauge, Header, Ramp, ThemeSwitch, AddressInput, EtherInput, AddRPC } from "./components";
import { INFURA_ID, NETWORK, NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import { uuid } from "uuidv4";
import {
  useOnBlock,
  useUserProviderAndSigner,
  usePoller,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
// import Hints from "./Hints";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";

// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import externalContracts from "./contracts/external_contracts";

import { useContractConfig, useExternalContractLoader, useLocalStorage } from "./hooks";
import { BigNumber } from "@ethersproject/bignumber";
const { ethers } = require("ethers");

const ERC721ABI = [{
  "constant": true,
  "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {
    "internalType": "address",
    "name": "operator",
    "type": "address"
  }],
  "name": "isApprovedForAll",
  "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}, {
  "constant": false,
  "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {
    "internalType": "bool",
    "name": "approved",
    "type": "bool"
  }],
  "name": "setApprovalForAll",
  "outputs": [],
  "payable": false,
  "stateMutability": "nonpayable",
  "type": "function"
}, {
  "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {
    "internalType": "address",
    "name": "to",
    "type": "address"
  }, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
  "name": "safeTransferFrom",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}, {
  "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {
    "internalType": "address",
    "name": "to",
    "type": "address"
  }, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
  "name": "transferFrom",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}]

const APPROVAL_GASLIMIT = 50000;

const transferAddress = "0x1eAcA5cEc385A6C876D8A56f6c776Bb5857AcCbc";
const TRANSFER_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "tokens",
				"type": "uint256[]"
			},
			{
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "collection",
				"type": "address"
			}
		],
		"name": "bulkTransfer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

/// 📡 What chain are your contracts deployed to?
const cachedNetwork = window.localStorage.getItem("network");
let targetNetwork = NETWORKS[cachedNetwork || NETWORKS.ropsten]; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)
if (!targetNetwork) {
  targetNetwork = NETWORKS.mainnet;
}

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
  : null;
const poktMainnetProvider = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider(
      "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
    )
  : null;
const mainnetInfura = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
  : null;
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_ID
// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrl);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

// Coinbase walletLink init
const walletLink = new WalletLink({
  appName: "coinbase",
});


let PriorityFee = 10; // 10 gwei default priority fee

// WalletLink provider
// Portis ID: 6255fb2b-58c8-433b-a2c9-62098c05ddc9

function App(props) {
  const mainnetProvider =
    poktMainnetProvider && poktMainnetProvider._isProvider
      ? poktMainnetProvider
      : scaffoldEthProvider && scaffoldEthProvider._network
      ? scaffoldEthProvider
      : mainnetInfura;

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [toAddress, setToAddress] = useLocalStorage("toAddress", "");
  const [hackedAddress, setHackedAddress] = useLocalStorage("hackedAddress", "");

  // const [contractAddress, setContractAddress] = useState();
  const [route, setRoute] = useState();
  const [bundle, setBundle] = useState();
  const [flashbotsRpc, setFlashbotsRpc] = useLocalStorage("flashbotsRpc", "");
  const [flashbotsBundleQuery, setFlashbotsBundleQuery] = useLocalStorage("flashbotsBundleQuery", "");
  const [bundleUuid, setBundleUuid] = useLocalStorage("bundleUuid", "");
  const [totalCost, setTotalCost] = useLocalStorage("totalCost", "");
  const [costEth, setCostEth] = useState();
  const [txHashes, setTxHashes] = useState([]);
  const [sentBundle, setSentBundle] = useState();
  const [sentBlock, setSentBlock] = useState();


  // polls the bundle api for the bundle and sets the bundle state
  // Note: The transaction sent last is the first in the rawTxs array. So we reverse it.
  usePoller(async () => {
    try {
      if (bundleUuid) {
        console.log("polling for bundle", bundleUuid);
        const bundle = await fetch(flashbotsBundleQuery);
        const bundleJson = await bundle.json();
        console.log({ bundleJson });
        if (bundleJson.rawTxs) {
          setBundle(bundleJson?.rawTxs.reverse());
        }
      }
    } catch (e) {
      console.log(e);
    }
  }, 3000);

  // poll blocks for txHashes of our bundle
  usePoller(async () => {
    try {
      console.log("sentBundle", sentBundle);
      console.log("sentBlock", sentBlock);
      console.log("txHashes", txHashes);

      if (sentBundle && sentBlock && txHashes.length != 0) {
        console.log("checking if TXs were mined.")
        const currentBlock = await userSigner.provider.getBlockNumber();

        // use ethers getTransactionReceipt to check if the txHashes are in a block
        const txReceipt = await localProvider.getTransactionReceipt(txHashes[0]);
        if (txReceipt && txReceipt.blockNumber) {
          alert("Bundle mined in block " + txReceipt.blockNumber);
          setSentBundle();
          setSentBlock();
          setTxHashes([]);
        }

        if (currentBlock > sentBlock + 10) {
          alert("Bundle not found in the last 10 blocks. resetting poller.");
          setSentBundle();
          setSentBlock();
          setTxHashes([]);
        }
      }
    } catch (e) {
      console.log(e);
    }
  }, 3000);


  useEffect(() => {
    console.log("new bundle");
    setFlashbotsRpc("https://rpc.flashbots.net?bundle=" + bundleUuid);
    setFlashbotsBundleQuery("https://rpc.flashbots.net/bundle?id=" + bundleUuid);
  }, [bundleUuid]);

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });



  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [contractAddress, setContractAddress] = useLocalStorage("contractAddress", "");
  const [contractABI, setContractABI] = useState("");
  const [tokenIds, setTokenIds] = useState("");
  const { TextArea } = Input;
  console.log("==-- contractAddress: ", contractAddress);
  console.log("==-- transferAddress: ", transferAddress);
  let transferContract = useExternalContractLoader(injectedProvider, transferAddress, TRANSFER_ABI);
  console.log("==-- transferContract: ", transferContract);
  let theExternalContract = useExternalContractLoader(injectedProvider, contractAddress, ERC721ABI);
  console.log("==-- theExternalContract: ", theExternalContract);
  //console.log(theExternalContract);

  const estimateApprovalCost = async () => { // getGasEstimate
    if (theExternalContract) {
      let gasLimit = BigNumber.from(APPROVAL_GASLIMIT); // await theExternalContract.estimateGas.setApprovalForAll(toAddress, true);
      console.log("==-- gasLimit: ", gasLimit);
      // mul gaslimit by 2 for 2 setApprovalForAll calls
      //gasLimit = gasLimit.mul(2);
      //console.log("==-- gasLimit2: ", gasLimit);

      // transaction fee is gasUnits * (baseFee + tip)
      const baseFee = await (await localProvider.getFeeData()).gasPrice;
      console.log("==-- baseFee: ", baseFee);

      // 10 gwei per setApprovalForAll call
      const totalTip = ethers.utils.parseUnits("10", "gwei");

      const fee = gasLimit.mul(baseFee.add(totalTip));
      console.log("==-- fee: ", fee);
      console.log("==-- fee ETH: ", ethers.utils.formatEther(fee));
      return fee;
    }
  };

  let externalContractDisplay = "";
  if (contractAddress && ERC721ABI) {
    externalContractDisplay = (
      <div>
        <Contract
          customContract={theExternalContract}
          signer={userSigner}
          provider={localProvider}
          chainId={selectedChainId}
        />
      </div>
    );
  } else {
    theExternalContract = null;
  }

  function AddressFromURL() {
    let { addr, abi } = useParams();
    let theExternalContractFromURL = useExternalContractLoader(injectedProvider, addr, abi);

    return (
      <div>
        <Contract
          customContract={theExternalContractFromURL}
          signer={userSigner}
          provider={localProvider}
          chainId={selectedChainId}
        />
      </div>
    );
  }
/*
  const options = [];
  // Restrict to goerli and mainnet
  options.push(
    <Select.Option key={"goerli"} value={NETWORKS.goerli.name}>
      <span style={{ color: NETWORKS.goerli.color, fontSize: 24 }}>{NETWORKS.goerli.name}</span>
    </Select.Option>,
  );

  options.push(
    <Select.Option key={"mainnet"} value={NETWORKS["mainnet"].name}>
      <span style={{ color: NETWORKS["mainnet"].color, fontSize: 24 }}>{NETWORKS["mainnet"].name}</span>
    </Select.Option>,
  );

  const networkSelect = (
    <Select
      size="large"
      defaultValue={targetNetwork.name}
      style={{ textAlign: "left", width: "15%", fontSize: 30 }}
      onChange={value => {
        if (targetNetwork.chainId != NETWORKS[value].chainId) {
          window.localStorage.setItem("network", value);
          setTimeout(() => {
            window.location.reload();
          }, 1);
        }
      }}
    >
      {options}
    </Select>
  );
*/
  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      <span style={{ verticalAlign: "middle" }}>
        {/*networkSelect*/}
        {/*faucetHint*/}
      </span>
      <BrowserRouter>
        <Menu style={{ textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
{/*
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              ABI
            </Link>
          </Menu.Item>
            */}
          <Menu.Item key="/">
            <Link
              onClick={() => {
                setRoute("/");
              }}
              to="/"
            >
              New Bundle
            </Link>
          </Menu.Item>

          <Menu.Item key="/sendeth">
            <Link
              onClick={() => {
                setRoute("/sendeth");
              }}
              to="/sendeth"
            >
              Send ETH
            </Link>
          </Menu.Item>

          <Menu.Item key="/approval">
            <Link
              onClick={() => {
                setRoute("/approval");
              }}
              to="/approval"
            >
              Set Approvals
            </Link>
          </Menu.Item>

          <Menu.Item key="/transfer">
            <Link
              onClick={() => {
                setRoute("/transfer");
              }}
              to="/transfer"
            >
              Transfer NFTs
            </Link>
          </Menu.Item>

          <Menu.Item key="/submit">
            <Link
              onClick={() => {
                setRoute("/submit");
              }}
              to="/submit"
            >
              Submit Bundle
            </Link>
          </Menu.Item>

        </Menu>

        <Switch>
          {/*
          <Route path="/contract/:addr/:abi">
            <AddressFromURL />
          </Route>
          <Route exact path="/">
            <div>Paste the contract's address and ABI below:</div>
            <div class="center" style={{ width: "50%" }}>
              <div style={{ padding: 4 }}>
                <AddressInput
                  placeholder="Enter Contract Address"
                  ensProvider={mainnetProvider}
                  value={contractAddress}
                  onChange={setContractAddress}
                />
              </div>
              <div style={{ padding: 4 }}>
                <TextArea
                  rows={6}
                  placeholder="Enter Contract ABI JSON"
                  value={contractABI}
                  onChange={e => {
                    setContractABI(e.target.value);
                  }}
                />
              </div>
            </div>
            <div>{externalContractDisplay}</div>
          </Route>
          */}
          <Route exact path="/">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ padding: 4, width: '500px', }}>
          <div>{flashbotsRpc}</div>
            <Input
            style={{ width: '500px'}}
              value={bundleUuid}
              onChange={e => {
                setBundleUuid(e.target.value);
              }}
            />
            <div style={{ padding: 4 }}></div>
            <Button
            style={{ width: '500px'}}
              onClick={() => {
                const newUuid = uuid();
                setBundleUuid(newUuid);
              }}
            >
              Click to generate new personal RPC URL for new bundles
            </Button>
            <div style={{ padding: 4 }}></div>
            <AddRPC 
            chainName="Flashbots Protect Personal RPC"
            rpcUrl={`https://rpc.flashbots.net?bundle=${bundleUuid}`}
            />
            <Divider />

            {bundle && (
              <div class="center" style={{ width: "50%" }}>
                <ReactJson src={bundle} />
              </div>
            )}

            </div>
            </div>
            </Route>


          <Route exact path="/submit">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ padding: 4, width: '500px', }}>
          <div>{flashbotsRpc}</div>
            <Input
            style={{ width: '500px'}}
              value={bundleUuid}
              onChange={e => {
                setBundleUuid(e.target.value);
              }}
            />
            <Divider />
            {bundle && (
              <div class="center" style={{ width: "50%" }}>
                ONLY submit bundle when you have submitted all needed transactions!!
                <ReactJson src={bundle} />
                <Button
                  onClick={async () => {
                    try {
                      if (bundle.length == 0) {
                        console.log("no bundle to send");
                        alert("no bundle to send");
                        return;
                      }
                      // get the current block number
                      const blockNumber = await localProvider.getBlockNumber();
                      console.log("blockNumber: ", blockNumber);
                      // set SentBlock to current block number
                      setSentBlock(blockNumber);
                      // encode each transaction in the bundle with keccak256 to create a new array of encoded transactions
                      const txHashes = bundle.map((tx) => {
                        return ethers.utils.keccak256(tx);
                      });
                      setTxHashes(txHashes);
                      console.log("txHashes: ", txHashes);
                      // set sentBundle to true
                      setSentBundle(true);

                      console.log("submitting bundles");
                      console.log("bundle: ", bundle);
                      const res = await fetch('https://ip3z9fy5va.execute-api.us-east-1.amazonaws.com/dev/relay', {

                        method: 'POST',
                        headers: {
                          'Accept': 'application/json',
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({signedTransactions: bundle})
                      })
                      
                      const resJson = await res.json()
                      console.log({resJson})
                      console.log("bundles submitted");
                      alert("Bundles submitted");
                    } catch (error) {
                      console.log({error})
                    }
                  }}
                >
                  Submit Bundle
                </Button>
              </div>
            )}
          </div>
          </div>
          </Route>

          <Route exact path="/sendeth">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ padding: 4, width: '500px', }}>
          <div>{flashbotsRpc}</div>
            <Input
            style={{ width: '500px'}}
              value={bundleUuid}
              onChange={e => {
                setBundleUuid(e.target.value);
              }}
            />
            <Divider />
              This step sends ETH to the hacked address to cover the cost of the approval transaction(s). 
              <br /> 
              Be sure you are connected from a clean UNHACKED address for this step. 
            <br /> <br />
            Estimated Cost Per Approval : { totalCost ? ethers.utils.formatEther(totalCost) : 0 } ETH <br />
              <Button
                style={{ width: '500px'}}
                onClick={async () => {
                  try {
                    const gasLimit = await estimateApprovalCost();
                    setTotalCost(gasLimit.toString());
                    const costEth = ethers.utils.formatEther(gasLimit);
                    console.log("==-- cost ETH: ", costEth);
                    setCostEth(costEth);
                  } catch (e) {
                    console.log({ e });
                  }
                }}
              >
                Click to estimate cost of approval transaction(s)
              </Button>
              <div style={{ padding: 4 }}></div>
              Enter compromised address to send ETH to below:
                <AddressInput
                  placeholder="Enter address to send ETH to here"
                  ensProvider={mainnetProvider}
                  value={hackedAddress}
                  onChange={setHackedAddress}
                />
                <div style={{ padding: 4 }}></div>
                <Button
                style={{ width: '500px' }}
                onClick={async () => {
                  try {
                    const cost = await estimateApprovalCost();
                    console.log("==-- totalCost: ", cost);
                    await userSigner.sendTransaction({
                      to: hackedAddress,
                      value: BigNumber.from(cost),
                    });
                  } catch (e) {
                    console.log({ e });
                    alert("Error sending ETH to hacked address");
                  }
                }}
              >
                Click to send ETH to cover Approval of your new address.
              </Button>
              <div style={{ padding: 4 }}></div>
              <Button
                style={{ width: '500px' }}
                onClick={async () => {
                  try {
                    const cost = await estimateApprovalCost();
                    console.log("==-- totalCost: ", cost);
                    await userSigner.sendTransaction({
                      to: hackedAddress,
                      value: BigNumber.from(cost),
                    });
                  } catch (e) {
                    console.log({ e });
                    alert("Error sending ETH to hacked address");
                  }
                }}
              >
                Click to send ETH to cover Approval of transfer proxy contract
              </Button>
              <Divider />
            {bundle && (
              <div class="center" style={{ width: "50%" }}>
                <ReactJson src={bundle} />
              </div>
            )}
            </div>
            </div>
            </Route>

          <Route exact path="/approval">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ padding: 4, width: '500px', }}>
          <div>{flashbotsRpc}</div>
            <Input
            style={{ width: '500px'}}
              value={bundleUuid}
              onChange={e => {
                setBundleUuid(e.target.value);
              }}
            />
            <Divider />
              This works by calling setApprovalForAll on the given contract from the hacked address to allow the clean address to transfer the hacked address's tokens.<br /> <br />
              Collection Contract address
                <AddressInput
                  placeholder="Enter Collection Contract Address"
                  ensProvider={mainnetProvider}
                  value={contractAddress}
                  onChange={setContractAddress}
                />
                Hacked Address
                <AddressInput
                  placeholder="Enter HACKED Address"
                  ensProvider={mainnetProvider}
                  value={hackedAddress}
                  onChange={setHackedAddress}
                />
                Allow Address
                <AddressInput
                  placeholder="Enter Clean UNHACKED Address"
                  ensProvider={mainnetProvider}
                  value={toAddress}
                  onChange={setToAddress}
                />
              <div style={{ padding: 4 }}></div>
                <Button
                  style={{ width: '500px' }}
                  onClick={async () => {
                    try {
                      if (await userSigner.getAddress() != hackedAddress) {
                        alert("Switch to the Hacked Account to approve the clean address.");
                        return;
                      }
                      const tx = await theExternalContract.connect(userSigner).setApprovalForAll(toAddress, true);
                      console.log("tx: ", tx);
                    } catch (e) {
                      console.log({ e });
                    }
                  }}
                >
                  Click to SetApproval to the Collection address for Allow Address
                </Button>

                <div style={{ padding: 4 }}></div>
                <Button
                  style={{ width: '500px' }}
                  onClick={async () => {
                    try {
                      if (await userSigner.getAddress() != hackedAddress) {
                        alert("Switch to the Hacked Account to approve the clean address.");
                        return;
                      }
                      const tx = await theExternalContract.connect(userSigner).setApprovalForAll(transferAddress, true);
                      console.log("tx: ", tx);
                    } catch (e) {
                      console.log({ e });
                    }
                  }}
                >
                  Click to SetApproval to the collection address for the transfer proxy contract.
                </Button>
            </div>
            </div>
          <Divider />
            {bundle && (
              <div class="center" style={{ width: "50%" }}>
                <ReactJson src={bundle} />
              </div>
            )}

            <Divider />
          </Route>
          <Route exact path="/transfer">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ padding: 4, width: '500px', }}>
          <div>{flashbotsRpc}</div>
            <Input
            style={{ width: '500px'}}
              value={bundleUuid}
              onChange={e => {
                setBundleUuid(e.target.value);
              }}
            />
            <Divider />
            For now this has to be called in its own bundle / transaction. <br />
            That means you need to create a new bundle on the previous tab and then submit it separately. <br />
            <div style={{ padding: 4 }}></div>
            Enter Collection address: 
              <div style={{ padding: 4 }}>
                <AddressInput
                  placeholder="Enter Collection Contract Address"
                  ensProvider={mainnetProvider}
                  value={contractAddress}
                  onChange={setContractAddress}
                />
            </div>

            From/Hacked address with assets to transfer: 
              <div style={{ padding: 4 }}>
                <AddressInput
                  placeholder="Enter Hacked Address with assets here"
                  ensProvider={mainnetProvider}
                  value={hackedAddress}
                  onChange={hackedAddress}
                />
            </div>

            Enter Receiver address: 
              <div style={{ padding: 4 }}>
                <AddressInput
                  placeholder="Enter the address to receive the assets here"
                  ensProvider={mainnetProvider}
                  value={toAddress}
                  onChange={toAddress}
                />
            </div>
            </div>
              <div>Enter TokenIds one per line to transfer below limited to 25 per transaction:</div>
                <TextArea
                style={{ width: '600px' }}
                  rows={6}
                  placeholder="Enter TokenIds one per line."
                  value={tokenIds}
                  onChange={e => {
                    //setContractABI(e.target.value);
                    //console.log(e.target.value)
                    setTokenIds(e.target.value);
                  }}
                />
              <div style={{ padding: 4 }}></div>
              Be sure to connect and submit this transaction from the address you approved in the previous step: <br />
              {toAddress} <br />
              <div style={{ padding: 4 }}></div>
              <Button
                style={{ width: '500px' }}
                onClick={async () => {
                
                  console.log( tokenIds );
                  let tokenIdsArray = tokenIds.split('\n').map(item => item.trim()).filter(item => item !== '');
                  console.log(tokenIdsArray);
                  if (tokenIdsArray.length > 25) {
                    alert("Too many tokenIds.  Max 25 per transaction");
                    return;
                  }

                  // convert array to big numbers
                  const tokenIdsArrayBN = tokenIdsArray.map(item => BigNumber.from(item));

                  const tx = await transferContract.connect(userSigner).bulkTransfer(tokenIdsArrayBN, hackedAddress, toAddress, contractAddress);
                  console.log("tx: ", tx);

                }}
              >
                Click to add transaction to bundle
              </Button>
              <div style={{ padding: 4 }}></div>
              {bundle && (
              <div class="center" style={{ width: "50%" }}>
              <ReactJson src={bundle} />
              </div>
            )}
            </div>
          </Route>

        </Switch>
      </BrowserRouter>
      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <Account
          address={address}
          localProvider={localProvider}
          userSigner={userSigner}
          mainnetProvider={mainnetProvider}
          price={price}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
      </div>
    </div>
  );
}

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

window.ethereum &&
  window.ethereum.on("chainChanged", chainId => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 1);
  });

window.ethereum &&
  window.ethereum.on("accountsChanged", accounts => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 1);
  });
export default App;

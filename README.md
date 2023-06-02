# Flashbots Bundler

An "easy-to-use" react app for building FlashBots Bundles for token rescues.  

[Live App Here](https://bundler.lcfr.io)  

This app works by adding a FlashBots RPC that caches multiple transactions into a Bundle to be sent to a 
Flashbots relay.  

[About FlashBots](https://docs.flashbots.net/)  
[Understanding Bundles](https://docs.flashbots.net/flashbots-auction/searchers/advanced/understanding-bundles)  
[Transaction Caching](https://docs.flashbots.net/flashbots-protect/rpc/bundle-cache)  

### Why 
Most of the apps/programs allowing Flashbots bundles are still too hard for users to use.  

[The ScaffoldEth](https://github.com/scaffold-eth/scaffold-eth/tree/flashbots-bundler) code this was based off of was ineffecient for transferring large amounts of tokens such as ENS collectors who own 100+ tokens.  

[Python examples](https://github.com/lcfr-eth/ENSPublic/blob/main/ENSRescuer/rescuer.py) require knowledge of python etc.  

[Other node based examples](https://github.com/Arachnid/flashbots-ens-rescue/blob/master/src/index.ts) didn't take into account large token ownership and max bundle size


### IMPORTANT:  

When connected to the Flashbots RPC it will display a 100ETH balance.  
This is for gas calculations etc but cant be spent (obviously).  
![FBRPC](./public/Screen%20Shot%202023-05-22%20at%2010.10.25%20AM.png)  

When submitting transactions to a bundle you have to set a custom <b>Priority Fee</b> in MetaMask advanced gas settings. This has to be done for EVERY transaction you submit to the bundle.  

![FEE](./public/Screen%20Shot%202023-05-22%20at%2010.17.46%20AM.png)  

A good tip is usually 5-20 GWEI.  

![FEE2](./public/Screen%20Shot%202023-05-22%20at%2010.18.25%20AM.png)

### Generalized ENS/ERC721 counter sweeper flow:  

!! This only applies to ERC721 collections.  
!! Read below for ERC20 & ERC1155.  

Things you will need:  

The ENS collection address: 0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85.    
A list of all your name's tokenIds. Not just names but the tokenIds.  
This can be obtained from:  
[The ENS Subgraph](https://thegraph.com/hosted-service/subgraph/ensdomains/ens)  
[EnsVision](https://ens.vision)  
[OpenSea](https://opensea.io)  
[Etherscan](https://etherscan.io)  

A clean unhacked address with ETH to fund transactions and receive tokens.  

Fund the hacked wallet with names + Set needed approvals with a Bundle.

1) Click the "New Bundle" tab to generate a new bundle uuid + Swith to the provided RPC.
2) Click the "Send ETH" tab.
3) Connect a clean unhacked wallet to the dapp in metamask to fund the transactions from.
4) Enter the hacked wallets address to send funds to.
5) Click the button to estimate cost.
6) Copy the cost for two approvals to the amount box below.
7) Click Send to add the transaction to the bundle.
8) Click the "Set NFT Approvals" tab.
9) Connect the hacked wallet address to the dapp in metamask.
10) Enter the NFT collection address.
11) Enter the hacked wallet (that your connected from) address.
12) Enter your unhacked wallet address to give the permission to transfer the tokens.
13) Click to add the first setApproval transaction to the bundle.
14) Click to add the second setApproval transaction to the bundle.
15) Click the "Submit Bundle" tab to submit the first bundle when finished adding approvals.

Transfer Names/Nfts

1) Optional: You can change back to Ethereum Mainnet in metamask RPC now and skip adding additional tip in metamask.
2) Click the Transfer NFTs tab.
3) Connect to the dapp in metamask with the unhacked address you entered previously that has funds to cover gas.
4) Enter the NFT Collection address (should be pre-filled).
5) Enter the hacked address that holds the tokens to transfer.
6) Enter the unhacked address to receive tokens that you should be connected from (should be pre-filled).
7) Enter the tokenIds below. One per line. 
8) Click "add the transaction to bundle" to execute the transaction without any bundle. 
9) Optional: If still connected to the Flashbots RPC click the "Submit Bundle" tabe. 

### ERC1155  

1) Click the "New Bundle" tab to generate a new bundle uuid + Swith to the provided RPC.
2) Click the "Send ETH" tab.
3) Connect a clean unhacked wallet to the dapp in metamask to fund the transactions from.
4) Enter the hacked wallets address to send funds to.
5) Click the button to estimate cost.  
6) Copy the value to the Amount field below.
7) Click the "Click to send eth" button to add the transaction to the bundle.
8) Change to the hacked wallet address in MetaMask.
9) Click the "Transfer NFTs" tab. 
10) Enter the ERC1155 token contract address.
11) Enter the hacked wallets address.
12) Enter the unhacked receiver wallet address.
13) Enter the tokenIds one per line
14) Click "Click to add transaction to bundle" to add to bundle.
15) Click the "Submit Bundle" tab to submit the bundle with two transactions.

### ERC20  

1) Click the "New Bundle" tab to generate a new bundle uuid + Swith to the provided RPC.
2) Click the "Send ETH" tab.
3) Connect a clean unhacked wallet to the dapp in metamask to fund the transactions from.
4) Enter the hacked wallets address to send funds to.
5) Click the button to estimate cost.  
6) Copy the value to the Amount field below.
7) Click the "Click to send eth" button to add the transaction to the bundle.
8) Change to the hacked wallet address in MetaMask.
9) Click the "ERC20 Tokens" tab. 
10) Enter the ERC20 token contracts address.
11) Optional: Click to get the balanced owned by the hacked address.
12) Click the button "Click to transfer full balance" to add the transaction to the bundle. 
13) Click the "Submit Bundle" tab to submit the bundle with two transactions.


### Technical  

ERC1155 tokens have a built in batch transfer function to transfer multiple tokens in the same transaction.  

ERC721 tokens lack such functionality. In order to batch transfer a large quantity of ERC721 tokens it requires a utility contract to batch the calls together.  

The UI detects if a supplied token contract is ERC721 or ERC1155. If the token contract is an ERC1155 contract then the UI will utilize the built in safeBatchTransferFrom() method.  

This also means a bundle only requires two transactions and no approvals. One transaction to fund the safeBatchTransferFrom and another transaction to call the safeBatchTransferFrom call.  

This is similar to rescuing ERC20 tokens. ERC20 tokens also only require two transactions in a single bundle as well. One transaction to fund the transfer call and then the actual transfer call/transaction. 

In contrast if the token contract is ERC721 then it requires two setApprovalForAll transactions to batch transfer the tokens using the transferProxy utility contract. 

### Additional Notes

When submitting bundles you will see an alert screen to let you know it was submitted:

![submitted](public/Screen%20Shot%202023-05-21%20at%201.51.37%20PM.png)  

Your bundle might not be included in a block the first time you submit it. An alert will inform you if your bundle was not mined:  
![submitted2](public/Screen%20Shot%202023-05-21%20at%201.26.31%20PM.png)  

If this happens then click the "Submit Bundle" tab and submit the bundle again.  

Its possible it might take multiple submissions.  

When your bundle is included you will see an alert like this:  
![submitted3](public/Screen%20Shot%202023-05-21%20at%202.03.52%20PM.png)

Currently the UI will check if the transactions were mined for +10 blocks from the block its submitted on.  


If you forget to add the Priority Tip to a transaction in a bundle you will need to reset the wallet state and start over again by generating a new bundle uuid in the "New Bundle" tab.  

### Thanks
[Austin Griffith](https://twitter.com/austingriffith) and co for the [ScaffoldETH](https://github.com/scaffold-eth/scaffold-eth) repo for the original leg work and pretty CSS. 


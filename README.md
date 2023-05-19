# FlashbotsBundler

A react app for building FlashBots Bundles for token rescues.  

[Live App Here](https://bundler.lcfr.io)  

contracts/transferHelper.sol : small contract to faciliate bulk transferring ERC721 tokens.  
[0x422970f74bfa2e403df107fd1de22cd4185d9117](https://etherscan.io/address/0x422970f74bfa2e403df107fd1de22cd4185d9117)

This app works by adding a FlashBots RPC that caches multiple transactions into a Bundle to be sent to a 
Flashbots relay.  

[About FlashBots](https://docs.flashbots.net/)  
[Understanding Bundles](https://docs.flashbots.net/flashbots-auction/searchers/advanced/understanding-bundles)  
[Transaction Caching](https://docs.flashbots.net/flashbots-protect/rpc/bundle-cache)  

### The counter-attack flow is:  
1) Transfer ETH from a clean wallet to the compromised wallet in one transaction.  

2) Identify the NFT Contract address your tokens are from. For example ENS is 0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85.  

3) Call SetApprovalForAll on the collection contract to approve your new-unhacked address to transfer your tokens.  

4) Call SetApprovalForAll on the collection contract to approve the TransferHelper contract to enable bulk transferring of the tokens. 

5) Call the TransferHelper contract from the clean address you approved previously with the TokenIds you wish to transfer.   

### Usage Notes

Currently usage requires 2 separate bundles if you wish to batch transfer all your NFTs/Tokens in a single transfer.  
This is because of the way MM simulates transactions before submitting.  

Since the approval for the transferHelper is not executed on-chain at the time of building the bundle the approval check will fail and MM will give the high gas cost since it detects
the revert.  

We work around this by creating one bundle to send ETH + setApprovals and execute it so the MM simulation passes 
then we can create a second bundle to bundle transfer transactions and execute it. 

IMPORTANT: When submitting transactions to the bundle you have to set a custom MaxPriorityFeePerGas in the MM advanced/custom gas settings. This has to be done for EVERY transaction you submit to the bundle.  

A good tip is usually 5-20 GWEI.   

### Usage  

1) Create a new Bundle/BundleUUID  
2) Click to add & swap to the Bundler RPC. Note If on Mobile you need to add the RPC manually and change to it.    
3) Enter a new clean-unhacked address you wish to give permission to transfer tokens from the hacked address.  
4) Click to approve the address entered 
5) Click to approve the TransferHelper contract
6) Submit the first bundle. 

Now batch transfer your tokens in the next step:  

1) Create a new Bundle/BundleUUID  
2) Click to add & swap to the Bundler RPC. Note If on Mobile you need to add the RPC manually and change to it.  
3) Click the transfer Tab and enter up to 25 tokenIds and click "Add to Bundle"
4) Repeat until all tokenIds are added with as many transactions as needed. 
5) Click Submit Bundle


### Thanks
[Austin Griffith](https://twitter.com/austingriffith) and co for the [ScaffoldETH](https://github.com/scaffold-eth/scaffold-eth) repo for the original leg work and pretty CSS. 


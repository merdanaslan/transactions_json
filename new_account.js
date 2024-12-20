const axios = require("axios");
const fs = require("fs");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require("dotenv").config();

const apikey = process.env.API_KEY;
const tokenPriceApiKey = process.env.TOKEN_PRICE_API_KEY;

const solanafmBaseUrl = "https://api.solana.fm";
const walletAddress = "5rWgrcKUfVSd3QvkqdMBPT1d7aeAJCsnZGhkLZYuFY2k";
const epochFromTimestamp = "1731425623";
const epochToTimestamp = "1734017623";

const birdeyeBaseUrl = "https://public-api.birdeye.so";

// Define CSV writer
const csvWriter = createCsvWriter({
    path: `${walletAddress}.csv`,
    header: [
        {id: 'transactionHash', title: 'Transaction Hash'},
        {id: 'instructionIndex', title: 'Instruction Index'},
        {id: 'innerInstructionIndex', title: 'Inner Instruction Index'},
        {id: 'action', title: 'Action'},
        {id: 'status', title: 'Status'},
        {id: 'source', title: 'Source'},
        {id: 'sourceAssociation', title: 'Source Association'},
        {id: 'destination', title: 'Destination'},
        {id: 'destinationAssociation', title: 'Destination Association'},
        {id: 'token', title: 'Token Hash'},
        {id: 'amount', title: 'Raw Amount'},
        {id: 'timestamp', title: 'Timestamp'},
        {id: 'time', title: 'Time'},
        {id: 'symbol', title: 'Token Symbol'},
        {id: 'decimals', title: 'Token Decimals'},
        {id: 'amount_decimal', title: 'Decimal Amount'},
        {id: 'price_address', title: 'Price Token Address'},
        {id: 'price_unixTime', title: 'Price Timestamp'},
        {id: 'price_value', title: 'Token Price'},
        {id: 'total_worth', title: 'Total USD Worth'}
    ]
});

// Function to flatten transaction data for CSV
const flattenTransaction = (transaction) => {
    let flattenedRows = [];

    transaction.data.forEach(movement => {
        const priceData = movement.price_data?.[0] || {};
        
        const row = {
            transactionHash: transaction.transactionHash,
            instructionIndex: movement.instructionIndex,
            innerInstructionIndex: movement.innerInstructionIndex,
            action: movement.action,
            status: movement.status,
            source: movement.source,
            sourceAssociation: movement.sourceAssociation,
            destination: movement.destination,
            destinationAssociation: movement.destinationAssociation,
            token: movement.token,
            amount: movement.amount,
            timestamp: movement.timestamp,
            time: movement.time,
            symbol: movement.tokenInfo?.symbol || '',
            decimals: movement.tokenInfo?.decimals || '',
            amount_decimal: movement.amount_decimal || '',
            price_address: priceData.address || '',
            price_unixTime: priceData.unixTime || '',
            price_value: priceData.value || '',
            total_worth: movement.total_worth || ''
        };

        flattenedRows.push(row);
    });

    return flattenedRows;
};

const app = async () => {
  try {
    let totalPages = 1;
    let page = 1;
    let allData = []; // Array to store all transaction data

    do {
      await axios
        .get(`${solanafmBaseUrl}/v0/accounts/${walletAddress}/transfers`, {
          params: {
            utcFrom: epochFromTimestamp,
            utcTo: epochToTimestamp,
            page: page,
          },
          headers: {
            ApiKey: apikey,
          },
        })
        .then(async (response) => {
          if (totalPages === 1) {
            console.log(
              "Total pages to index: ",
              response.data.pagination.totalPages
            );
            totalPages = response.data.pagination.totalPages;
          }
          console.log("Retrieving data for page: ", page);
          let responseData = response.data.results;

          // Process each transaction
          for (const transaction of responseData) {
            for (const movement of transaction.data) {
              const tokenHash = movement.token;
              const time_from = movement.timestamp;
              const time_to = movement.timestamp + 60;

              movement.time = new Date(movement.timestamp * 1000).toUTCString();

              if (tokenHash && tokenHash !== '') {
                try {
                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    console.log(`Fetching token info for: ${tokenHash}`);
                    
                    const tokenResponse = await axios.get(
                        `${solanafmBaseUrl}/v1/tokens/${tokenHash}`,
                        {
                            headers: {
                                ApiKey: apikey,
                            },
                        }
                    );

                    if (tokenResponse.data) {
                        console.log(`Token data received for ${tokenHash}`);
                        const tokenData = tokenResponse.data;
                        
                        // Initialize tokenInfo even if some data is missing
                        movement.tokenInfo = {
                            symbol: tokenData.tokenList?.symbol || 'UNKNOWN',
                            decimals: tokenData.decimals || 0
                        };
                        
                        // Calculate decimal amount
                        movement.amount_decimal = movement.amount / Math.pow(10, movement.tokenInfo.decimals);

                        // Only try to get price if it's not an NFT (amount = 1)
                        if (movement.amount > 1) {
                            try {
                                console.log(`Fetching price for token: ${tokenHash}`);
                                const priceResponse = await axios.get(
                                    `${birdeyeBaseUrl}/defi/history_price`,
                                    {
                                        params: {
                                            address: tokenHash,
                                            address_type: "token",
                                            type: "1m",
                                            time_from: time_from,
                                            time_to: time_to,
                                        },
                                        headers: {
                                            "X-API-KEY": tokenPriceApiKey,
                                        },
                                    }
                                );

                                if (priceResponse.data?.data?.items?.length > 0) {
                                    movement.price_data = priceResponse.data.data.items;
                                    const price = priceResponse.data.data.items[0].value;
                                    movement.total_worth = movement.amount_decimal * price;
                                } else {
                                    console.log(`No price data found for token: ${tokenHash}`);
                                    movement.price_data = [];
                                    movement.total_worth = null;
                                }
                            } catch (priceError) {
                                console.log(`Error fetching price for token: ${tokenHash}`, priceError.message);
                                movement.price_data = [];
                                movement.total_worth = null;
                            }
                        } else {
                            console.log(`Token ${tokenHash} appears to be an NFT`);
                            movement.price_data = [];
                            movement.total_worth = null;
                        }
                    }
                } catch (tokenError) {
                    console.log(`Error fetching token info for: ${tokenHash}`, tokenError.message);
                    // Set default values even on error
                    movement.tokenInfo = { symbol: 'UNKNOWN', decimals: 0 };
                    movement.amount_decimal = movement.amount;
                    movement.price_data = [];
                    movement.total_worth = null;
                }
              } else {
                // Handle system transactions (like pay_tx_fees)
                movement.tokenInfo = { symbol: '', decimals: 0 };
                movement.amount_decimal = movement.amount;
                movement.price_data = [];
                movement.total_worth = null;
              }
            }
          }

          // Add processed data to allData array
          allData = allData.concat(responseData);

          // Display the processed data for this page
          console.log(JSON.stringify(responseData, null, 2));

          page++;
        })
        .catch((error) => {
          page++;
        });
    } while (page <= totalPages);

    // Save all data to a JSON file
    fs.writeFileSync('transactions.json', JSON.stringify(allData, null, 2));
    console.log("Data saved to transactions.json");

    // Create CSV from the collected data
    const rows = allData.flatMap(transaction => flattenTransaction(transaction));
    await csvWriter.writeRecords(rows);
    console.log(`CSV file has been created successfully as ${walletAddress}.csv`);

    // Display final complete JSON data
    console.log("\nComplete JSON data:");
    console.log(JSON.stringify(allData, null, 2));

  } catch (error) {
    console.error('Error in processing:', error);
  }
};

app();

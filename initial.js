const axios = require("axios");
require("dotenv").config();

const apikey = process.env.API_KEY;
const tokenPriceApiKey = process.env.TOKEN_PRICE_API_KEY;

const solanafmBaseUrl = "https://api.solana.fm";
const walletAddress = "9sanPaycTAq3HeiqUYGebsa3UVhawhAWHNwRzPdcfRn8";
const epochFromTimestamp = "1709078400"; // This is when Solana went mainnet beta, but likely you want to use a more recent timestamp
const epochToTimestamp = "1711702800"; // Input current datetime in epoch seconds

const birdeyeBaseUrl = "https://public-api.birdeye.so";

const app = async () => {
  try {
    let totalPages = 1;
    let page = 1;
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
              // Extract token hash from the movement
              const tokenHash = movement.token;
              const time_from = movement.timestamp;
              const time_to = movement.timestamp + 60; // 1m

              // Add UTC time
              movement.time = new Date(movement.timestamp * 1000).toUTCString();

              // Fetch token information only if token hash is provided
              if (tokenHash) {
                await axios
                  .get(`${solanafmBaseUrl}/v1/tokens/${tokenHash}`, {
                    headers: {
                      ApiKey: apikey,
                    },
                  })
                  .then(async (tokenResponse) => {
                    const tokenData = tokenResponse.data;
                    // Update movement with token information
                    movement.tokenInfo = {
                      symbol: tokenData.tokenList.symbol,
                      decimals: tokenData.decimals,
                    };
                    // Calculate amount_decimal
                    movement.amount_decimal =
                      movement.amount /
                      Math.pow(10, tokenData.decimals);

                    // Fetch historical price data for the token
                    const response = await axios.get(
                      `${birdeyeBaseUrl}/defi/history_price`, // old: /public/history_price
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

                    // Check if data is present
                    if (
                      response.data &&
                      response.data.data &&
                      response.data.data.items &&
                      response.data.data.items.length > 0
                    ) {
                      // Add items array to the movement object
                      movement.price_data = response.data.data.items;
                      
                      // Calculate total_worth
                      const price = response.data.data.items[0].value;
                      movement.total_worth = movement.amount_decimal * price;
                    } else {
                      console.log(
                        "No price data found for token:",
                        tokenHash
                      );
                      movement.total_worth = null; // or 0, depending on how you want to handle missing price data
                    }
                  })
                  .catch((error) => {
                    console.log(
                      `Error fetching token information for ${tokenHash}: `,
                      error
                    );
                  });
              }
            }
          }

          // Display retrieved data as JSON in the terminal
          console.log(JSON.stringify(responseData, null, 2));

          page++;
        })
        .catch((error) => {
          console.log("Error log: ", error);
        });
    } while (page <= totalPages);
    console.log("Process completed without errors.");
  } catch (error) {
    console.log("Error log: ", error);
  }
};

app();
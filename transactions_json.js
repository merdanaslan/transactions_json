const axios = require("axios");
require("dotenv").config();

const apikey = process.env.API_KEY;
const tokenPriceApiKey = process.env.TOKEN_PRICE_API_KEY;

const solanafmBaseUrl = "https://api.solana.fm";
const walletAddress = "9sanPaycTAq3HeiqUYGebsa3UVhawhAWHNwRzPdcfRn8";
const epochFromTimestamp = "1709078400";
const epochToTimestamp = "1711702800";

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
              const tokenHash = movement.token;
              const time_from = movement.timestamp;
              const time_to = movement.timestamp + 60;

              movement.time = new Date(movement.timestamp * 1000).toUTCString();

              if (tokenHash) {
                try {
                  const tokenResponse = await axios.get(
                    `${solanafmBaseUrl}/v1/tokens/${tokenHash}`,
                    {
                      headers: {
                        ApiKey: apikey,
                      },
                    }
                  );

                  const tokenData = tokenResponse.data;
                  movement.tokenInfo = {
                    symbol: tokenData.tokenList.symbol,
                    decimals: tokenData.decimals,
                  };
                  movement.amount_decimal =
                    movement.amount / Math.pow(10, tokenData.decimals);

                  try {
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

                    if (
                      priceResponse.data?.data?.items?.length > 0
                    ) {
                      movement.price_data = priceResponse.data.data.items;
                      const price = priceResponse.data.data.items[0].value;
                      movement.total_worth = movement.amount_decimal * price;
                    } else {
                      movement.total_worth = null;
                    }
                  } catch (priceError) {
                    movement.total_worth = null;
                  }
                } catch (tokenError) {
                  // Silently continue if token info can't be fetched
                  continue;
                }
              }
            }
          }

          console.log(JSON.stringify(responseData, null, 2));

          page++;
        })
        .catch((error) => {
          // Silently handle page fetch errors
          page++;
        });
    } while (page <= totalPages);
    console.log("Process completed without errors.");
  } catch (error) {
    // Silently handle main try-catch errors
  }
};

app();

const axios = require("axios");
const createObjectCsvWriter = require("csv-writer").createObjectCsvWriter;

const apikey = "sk_live_375e9dd78c2a4c31b297a966b3646bf1";
const solanafmBaseUrl = "https://api.solana.fm";
const walletAddress = "3FLi39QpEuYZL6YEnefLTpaifd4EFXMtQP7M5Vy91qwF";
const epochFromTimestamp = "1733076022"; // This is when Solana went mainnet beta, but likely you want to use a more recent timestamp
const epochToTimestamp = "1733149822"; // Input current datetime in epoch seconds

const csvWriter = createObjectCsvWriter({
  path: `${walletAddress}.csv`,
  header: [
    { id: "transactionHash", title: "Transaction Hash" },
    { id: "instructionIndex", title: "Instruction Index" },
    { id: "innerInstructionIndex", title: "Inner Instruction Index" },
    { id: "action", title: "Action" },
    { id: "status", title: "Status" },
    { id: "source", title: "Source" },
    { id: "sourceAssociation", title: "Source Association" },
    { id: "destination", title: "Destination" },
    { id: "destinationAssociation", title: "Destination Association" },
    { id: "token", title: "Token" },
    { id: "amount", title: "Amount" },
    { id: "timestamp", title: "Timestamp" },
  ],
});

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
        .then((response) => {
          if (totalPages === 1) {
            console.log(
              "Total pages to index: ",
              response.data.pagination.totalPages
            );
            totalPages = response.data.pagination.totalPages;
          }
          console.log("Retrieving data for page: ", page);
          let responseData = response.data.results;

          const csvData = [];
          responseData.forEach((transaction) => {
            transaction.data.forEach((movement) => {
              const csvRow = {
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
              };

              csvData.push(csvRow);
            });
          });

          csvWriter
            .writeRecords(csvData)
            .then(() => {})
            .catch((error) => {
              console.log("Error writing to csv file: ", error);
            });
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

const axios = require("axios");
require("dotenv").config();

const apikey = process.env.API_KEY;
const tokenPriceApiKey = process.env.TOKEN_PRICE_API_KEY;

const solanafmBaseUrl = "https://api.solana.fm";
const walletAddress = "9sanPaycTAq3HeiqUYGebsa3UVhawhAWHNwRzPdcfRn8";

// Format dates as YYYY-MM-DD
const fromDate = "2024-02-27";
const toDate = "2024-03-29";

const birdeyeBaseUrl = "https://public-api.birdeye.so";

const lamportsToSol = (lamports) => lamports / 1000000000;

const app = async () => {
    try {
        const fees = await axios
            .get(`${solanafmBaseUrl}/v0/accounts/${walletAddress}/fees`, {
                params: {
                    from: fromDate,
                    to: toDate,
                },
                headers: {
                    ApiKey: apikey,
                    accept: 'application/json'
                },
            });

        // Calculate total fees
        const totalLamports = fees.data.reduce((sum, day) => sum + day.tx_fees, 0);
        const totalSol = lamportsToSol(totalLamports);

        // Filter and show only days with fees
        const daysWithFees = fees.data.filter(day => day.tx_fees > 0);

        console.log('Days with transaction fees:');
        daysWithFees.forEach(day => {
            console.log(`${day.time}: ${lamportsToSol(day.tx_fees)} SOL (${day.tx_fees} lamports)`);
        });
        
        console.log(`\nTotal fees for period: ${totalSol} SOL`);
        
    } catch (error) {
        console.error('Error fetching fees:');
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Status:', error.response.status);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
    }
};

// Call the function
app();
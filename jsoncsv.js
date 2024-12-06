const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Read the JSON data from the root directory
const jsonData = require('./transactions.json');

// Function to flatten nested objects
const flattenTransaction = (transaction) => {
    let flattenedRows = [];

    transaction.data.forEach(movement => {
        // Flatten price_data if it exists
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

// Define CSV header
const csvWriter = createCsvWriter({
    path: 'left.csv',
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

// Process the data
const processData = async () => {
    try {
        // Flatten all transactions
        const rows = jsonData.flatMap(transaction => flattenTransaction(transaction));

        // Write to CSV
        await csvWriter.writeRecords(rows);
        console.log('CSV file has been created successfully');
    } catch (error) {
        console.error('Error creating CSV:', error);
    }
};

// Run the process
processData();

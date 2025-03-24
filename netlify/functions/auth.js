const { Handler } = require('@netlify/functions');

/*
const authRoutes = require('../../routes/auth'); // Update the path to match your directory structure

exports.handler = async (event, context) => {
    // Implement your auth logic here
    const response = await authRoutes(event, context);
    return {
        statusCode: 200,
        body: JSON.stringify(response)
    };
};
*/

const authRoutes = require('../../routes/auth'); // Adjusted path to import the serverless handler

exports.handler = authRoutes.handler; // Directly use the serverless-http handler
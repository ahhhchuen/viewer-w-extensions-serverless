const { Handler } = require('@netlify/functions');

/*
const modelRoutes = require('../../routes/models'); // Update the path to match your directory structure

exports.handler = async (event, context) => {
    // Implement your models logic here
    const response = await modelRoutes(event, context);
    return {
        statusCode: 200,
        body: JSON.stringify(response)
    };
};
*/

const modelRoutes = require('../../routes/models'); // Adjusted path to import the serverless handler

exports.handler = modelRoutes.handler; // Directly use the serverless-http handler
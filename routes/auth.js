/*
const express = require('express');
const { getViewerToken } = require('../services/aps.js');

let router = express.Router();

router.get('/api/auth/token', async function (req, res, next) {
    try {
        res.json(await getViewerToken());
    } catch (err) {
        next(err);
    }
});

module.exports = router;

*/


const serverless = require('serverless-http');
const express = require('express');
const { getViewerToken } = require('../services/aps.js');

const app = express();

app.get('/api/auth/token', async function (req, res, next) {
    try {
        res.json(await getViewerToken());
    } catch (err) {
        next(err);
    }
});

module.exports.handler = serverless(app);
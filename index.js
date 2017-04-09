'use strict';

const config = require('./config');
const _ = require('lodash');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./libs/db');
const sqs = require('sqs');
const counterRepo = require('./repos/counter')();
const redis = require('redis');
const redisClient = redis.createClient({
    host: config.redis_host
});
redisClient.on("error", function(err) {
    console.error("Error connecting to redis", err);
});


app.use(express.static('public'));
app.use(bodyParser.json());

const candidateIds = [1, 2, 3]; //who is allowed to be counted

const sqsQueue = sqs({
    'proxy': config.sqs_proxy,
    access: 'my-aws-access-key',
    secret: 'my-aws-secret-key',
    region: 'us-east-1'
});

function initialize() {
    console.log('initializing');
    app.listen(3000, function () {
        console.log('App listening on port 3000!')
    });
}

const redisVoteCountKey = candidateId => 'VOTE_COUNT_CANDIDATE_' + candidateId;

app.get('/result', function (req, res) {
    const keys = candidateIds.map(redisVoteCountKey);
    redisClient.mget(keys, (err, vals) => {
        let result = _(candidateIds)
            .zip(vals)
            .map(r => {
                return {candidateId: r[0], count: parseInt(r[1])};
            });
        res.json(result);
    });
});

app.get('/stats', function (req, res) {
    const stats_cache_key = 'VOTE_STATS';
    redisClient.get(stats_cache_key, function(err, result) {
        if (result) {
            res.setHeader('Content-Type', 'application/json');
            res.send(result);
            return;
        }
        counterRepo.getLast10MinuteStats()
            .then(stats => {
                res.json(stats);
                return stats;
            })
            .then(stats => {
                redisClient.setex(stats_cache_key, config.stats_cache_timeout_sec, JSON.stringify(stats));
            })
            .catch(err => {
                console.error('Error on getting stats', err);
                res.sendStatus(500);
            });
    });
});

app.post('/vote/:candidateId', function (req, res) {
    const candidateId = parseInt(req.params.candidateId);
    if (candidateIds.includes(candidateId)) {
        sqsQueue.push('VOTE_CANDIDATE_' + candidateId, {candidateId, at: new Date()});
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

initialize();
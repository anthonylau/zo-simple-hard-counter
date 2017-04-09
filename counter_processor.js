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
redisClient.on("error", function (err) {
    console.error("Error connecting to redis", err);
});


app.use(express.static('public'));
app.use(bodyParser.json());

const CANDIDATE_ID = process.env.PROCESSOR_CANDIDATE_ID;

const sqsQueue = sqs({
    'proxy': config.sqs_proxy,
    access: 'my-aws-access-key',
    secret: 'my-aws-secret-key',
    region: 'us-east-1'
});

const redisVoteCountKey = 'VOTE_COUNT_CANDIDATE_' + CANDIDATE_ID;

let voteCounter = null;

function initialize() {
    console.log('initializing');
    console.log('Loading Counters');

    loadCounter(CANDIDATE_ID)
        .then(counter => {
            return {
                candidateId: counter.candidateId,
                lastVoteId: counter.lastVoteId,
                count: counter.count
            };
        })
        .then(counter => {
            voteCounter = counter;
            console.log(voteCounter);
            redisClient.set(redisVoteCountKey, voteCounter.count, redis.print);

            sqsQueue.pull('VOTE_CANDIDATE_' + CANDIDATE_ID, function (message, callback) {
                const voteDate = new Date(message.at);
                console.log('Vote Date', voteDate);
                counterRepo
                    .addVote(CANDIDATE_ID, voteDate)
                    .then(id => {
                        callback();
                        voteCounter.lastVoteId = id;
                        voteCounter.count += 1;
                        console.log(voteCounter);
                    })
                    .then(() => {
                        redisClient.set(redisVoteCountKey, voteCounter.count, redis.print);
                    })
                    .then(() => {
                        if (voteCounter.count % 10 === 0) {
                            console.log('Take Snapshot', voteCounter);
                            counterRepo.updateCounterSnapshot(
                                voteCounter.candidateId,
                                voteCounter.lastVoteId,
                                voteCounter.count
                            );
                        }
                    })
                    .catch(err => console.error('Error on adding vote', err));
            })
        })
        .catch(err => {
            console.error('Error on loading counter', err);
            process.exit(1);
        });
}

/**
 * @param candidateId
 * @return {Promise}
 */
function loadCounter(candidateId) {
    return counterRepo.getCounterSnapshot(candidateId)
        .then(snapshot => {
            if (snapshot == null) {
                return {
                    candidateId,
                    lastVoteId: 0,
                    count: 0
                };
            }
            return snapshot;
        }).then(snapshot => {
            return counterRepo.getVotes(candidateId, snapshot.lastVoteId)
                .then(res => {
                    console.info('Processing candidateId=%s, rowCount=%s', candidateId, res.rows.length);
                    return res.rows.reduce((val, row) => {
                        val.lastVoteId = row.id;
                        val.count += 1;
                        return val;
                    }, {
                        candidateId,
                        lastVoteId: snapshot.lastVoteId,
                        count: snapshot.count
                    });
                });
        });
}


initialize();
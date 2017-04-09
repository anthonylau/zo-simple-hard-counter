'use strict';

const config = require('./config');
const _ = require('lodash');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./libs/db');
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

let counterByCandidateId = new Map();

function initialize() {
    console.log('initializing');
    console.log('Loading Counters');
    const loadCounters = candidateIds.map(candidateId => {
        return loadCounter(candidateId).then(counter => {
            return {
                candidateId: counter.candidateId,
                lastVoteId: counter.lastVoteId,
                count: counter.count
            };
        });
    });
    Promise.all(loadCounters).then(vals => {
        counterByCandidateId = new Map(vals.map(v => [v.candidateId, v]));
        console.log('Counters', counterByCandidateId);
        app.listen(3000, function () {
            console.log('App listening on port 3000!')
        });
    }).catch(err => {
        console.error('Error on loading counterByCandidateId', err);
        process.exit(1);
    });
}


function takeCounterSnapshots(counters) {
    return counters.map(counter => {
        return counterRepo.updateCounterSnapshot(counter.candidateId, counter.lastVoteId, counter.count);
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

app.get('/result', function (req, res) {
    let result = Array.from(counterByCandidateId.values())
        .sort((a, b) => a.candidateId - b.candidateId);
    res.json(result);
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
        counterRepo.addVote(candidateId, new Date())
            .then(id => {
                let counter = counterByCandidateId.get(candidateId);
                counter.lastVoteId = id;
                counter.count += 1;
                return counter.count;
            })
            .catch(err => console.error('Error inserting vote', err));

        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

// take counter snapshot
app.get('/snapshot', function (req, res) {
    const counters = Array.from(counterByCandidateId.values());
    Promise.all(takeCounterSnapshots(counters))
        .then(values => res.sendStatus(200))
        .catch(err => {
            console.error('Error on taking snapshot', err);
            res.sendStatus(500);
        })
    ;
});

initialize();
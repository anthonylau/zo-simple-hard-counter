'use strict';

console.log('initializing');

const _ = require('lodash');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./libs/db');

app.use(express.static('public'));
app.use(bodyParser.json());

const candidateIds = [1, 2, 3]; //who is allowed to be counted

let counterByCandidateId = new Map();

function initialize() {
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
// console.trace(counterByCandidateId);
console.log('initialized');


function takeCounterSnapshots(counters) {
    const sql = `
INSERT INTO counter_snapshot (candidate_id, last_vote_id, count) VALUES ($1, $2, $3)
ON CONFLICT (candidate_id)
DO UPDATE SET
    last_vote_id = EXCLUDED.last_vote_id,
    count = EXCLUDED.count
`;
    return counters.map(counter => {
        return db.query(sql, [counter.candidateId, counter.lastVoteId, counter.count]);
    });
}

/**
 * @param candidateId
 * @return {Promise}
 */
function loadCounter(candidateId) {
    const snapshotSql = "SELECT candidate_id, last_vote_id, count FROM counter_snapshot WHERE candidate_id = $1";
    return db.query(snapshotSql, [candidateId])
        .then(res => {
            if (res.rows.length > 0) {
                const row = res.rows[0];
                return {
                    candidateId: row.candidate_id,
                    lastVoteId: row.last_vote_id,
                    count: parseInt(row.count)
                }
            }
            return {
                candidateId,
                lastVoteId: 0,
                count: 0
            };
        }).then(snapshot => {
            return db.query('SELECT id FROM vote WHERE candidate_id = $1 AND id > $2 ORDER BY id', [candidateId, snapshot.lastVoteId])
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
    const sql = `
SELECT
  candidate_id,
  date_trunc('second', at) "at",
  count(1) count
FROM vote
WHERE at >= NOW() - '10 minute'::INTERVAL
GROUP BY 1, 2
ORDER BY date_trunc('second', at)
`;
    db.query(sql)
        .then(resultSet => {
            let stats = [];
            _(resultSet.rows)
                    .groupBy('candidate_id')
                    .forOwn((v, k) => {
                        let vals = v.map(chunk => {
                            return {
                                at: chunk.at,
                                count: parseInt(chunk.count)
                            };
                        });
                        let data = {
                            key: k,
                            values: vals
                        };
                        stats.push(data);
                    });
            res.json(stats);
        }).catch(err => {
        console.error('Error on getting stats', err);
        res.sendStatus(500);
    });
});

app.post('/vote', function (req, res) {
    const candidateId = req.param('candidate_id');
    if (candidateIds.includes(candidateId)) {
        db.query('INSERT INTO vote (candidate_id, at) VALUES ($1, $2) RETURNING id', [candidateId, new Date()])
            .then(res => {
                let counter = counterByCandidateId.get(candidateId);
                counter.lastVoteId = res.oid;
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
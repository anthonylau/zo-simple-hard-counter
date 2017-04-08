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

let counters = new Map();

function initialize() {
    let loadCounters = candidateIds.map(candidateId => {
        return db.query('SELECT id FROM vote WHERE candidate_id = $1 ORDER BY id', [candidateId])
            .then(res => {
                return res.rows.reduce((val, row) => {
                    val.lastId = row.id;
                    val.count += 1;
                    return val;
                }, {
                    candidateId,
                    lastId: null,
                    count: 0
                });
            });
    });

    Promise.all(loadCounters).then(vals => {
        counters = new Map(vals.map(v => [v.candidateId, v]));
        console.log(counters);
        app.listen(3000, function () {
            console.log('Example app listening on port 3000!')
        });
    }).catch(err => {
        console.error('Error on loading counters', err);
        process.exit(1);
    });
}
// console.trace(counters);
console.log('initialized');

app.get('/result', function (req, res) {
    let result = [];
    counters.forEach((v, k) => {
        result.push(v);
    });
    result.sort((a, b) => a.candidateId - b.candidateId);
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
    const candidate_id = req.param('candidate_id');
    if (candidateIds.includes(candidate_id)) {
        db.query('INSERT INTO vote (candidate_id, at) VALUES ($1, $2)', [candidate_id, new Date()])
            .then(res => {
                let counter = counters.get(candidate_id);
                counter.count += 1;
            }).catch(err => console.error('Error inserting vote', err));

        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

initialize();
'use strict';

console.log('initializing');

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./libs/db');

app.use(express.static('public'));
app.use(bodyParser.json());

const whoIds = [1, 2, 3]; //who is allowed to be counted

let counters = new Map();

function initialize() {
    let loadCounters = whoIds.map(who => {
        return db.query('SELECT id FROM vote WHERE who = $1 ORDER BY id', [who])
            .then(res => {
                return res.rows.reduce((val, row) => {
                    val.lastId = row.id;
                    val.count += 1;
                    return val;
                }, {
                    who,
                    lastId: null,
                    count: 0
                });
            });
    });

    Promise.all(loadCounters).then(vals => {
        counters = new Map(vals.map(v => [v.who, v]));
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
    result.sort((a,b) => a.who - b.who);
    res.json(result);
});

app.post('/vote', function (req, res) {
    const who = req.param('who');
    if (whoIds.includes(who)) {
        db.query('INSERT INTO vote (who, at) VALUES ($1, $2)', [who, new Date()])
            .then(res => {
                let counter = counters.get(who);
                counter.count += 1;
            }).catch(err => console.error('Error inserting vote', err));

        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

initialize();
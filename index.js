'use strict';

console.log('initializing');

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./libs/db');

app.use(express.static('public'));
app.use(bodyParser.json());

const whoIdxs = [1, 2, 3]; //who is allowed to be counted

let counters = {};
whoIdxs.forEach(who => {
    counters[who] = 0;
});
// TODO load from db

console.log('initialized');

app.get('/result', function (req, res) {
    res.send('Hello World! ' + JSON.stringify(counters));
});

app.post('/vote', function (req, res) {
    const who = req.param('who');
    if (whoIdxs.includes(who)) {
        db.query('INSERT INTO vote (who, at) VALUES ($1, $2)', [who, new Date()])
            .then(res => {
                counters[who] = counters[who] + 1;
            }).catch(err => console.error('Error inserting vote', err));

        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
});
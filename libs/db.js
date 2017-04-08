const pg = require('pg');
const config = require('../config');

let dbConfig = {
    user: config.postgres_user,
    database: config.postgres_db,
    password: config.postgres_password,
    host: config.postgres_host,
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
};

const pool = new pg.Pool(dbConfig);

pool.on('error', function (err, client) {
    console.error('idle client error', err.message, err.stack)
});

module.exports.query = function (text, values, callback) {
    // console.log('query:', text, values);
    return pool.query(text, values, callback);
};

module.exports.connect = function (callback) {
    return pool.connect(callback);
};


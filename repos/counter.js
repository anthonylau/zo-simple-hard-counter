'use strict';

const _ = require('lodash');
const db = require('../libs/db');

module.exports = function CounterRepo() {
    return {
        /**
         * @param candidateId
         * @param {Date} at
         * @return {Promise.<*>}
         */
        addVote(candidateId, at) {
            return db.query('INSERT INTO vote (candidate_id, at) VALUES ($1, $2) RETURNING id', [candidateId, at]);
        },
        /**
         * @param candidateId
         * @param afterId
         * @return {Promise.<*>}
         */
        getVotes(candidateId, afterId) {
            return db.query(
                'SELECT id FROM vote WHERE candidate_id = $1 AND id > $2 ORDER BY id',
                [candidateId, afterId]
            );
        },
        /**
         * @param candidateId
         * @return {Promise.<*>}
         */
        getCounterSnapshot(candidateId) {
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
                return null;
            });
        },
        /**
         * @param candidateId
         * @param lastVoteId
         * @param count
         * @return {Promise.<*>}
         */
        updateCounterSnapshot(candidateId, lastVoteId, count) {
            const sql = `
INSERT INTO counter_snapshot (candidate_id, last_vote_id, count) VALUES ($1, $2, $3)
ON CONFLICT (candidate_id)
DO UPDATE SET
    last_vote_id = EXCLUDED.last_vote_id,
    count = EXCLUDED.count
`;
            return db.query(sql, [candidateId, lastVoteId, count]);
        },
        /**
         * @return {Promise.<*>}
         */
        getLast10MinuteStats() {
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
            return db.query(sql).then(resultSet => {
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
                return stats;
            })
        }
    };
};

module.exports = {
    postgres_host: process.env.POSTGRES_HOST,
    postgres_user: process.env.POSTGRES_USER,
    postgres_password: process.env.POSTGRES_PASSWORD,
    postgres_db: process.env.POSTGRES_DB,
    redis_host: process.env.REDIS_HOST,
    stats_cache_timeout_sec: 10,
    sqs_proxy: process.env.SQS_PROXY,
};

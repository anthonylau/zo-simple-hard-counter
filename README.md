# Requirements

* docker
* docker compose

# Setup

1. docker-compose build
2. docker-compose up -d postgres redis localstack
3. connect postgres with host `<docker_host>`
4. Create table using sql script `./sql/tables.sql`
5. docker-compose up voteprocessor1 voteprocessor2 voteprocessor3 app

# Usage

* To Vote, access `http://<docker_host>:3000`
* Vote Result, access `http://<docker_host>:3000/result.html`

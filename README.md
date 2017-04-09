# Requirements

* docker
* docker compose

# Setup

1. docker-compose up -d postgres redis localstack
2. connect postgres with host `<docker_host>`
3. Create table using sql script `./sql/tables.sql`
4. docker-compose up

# Usage

* To Vote, access `http://<docker_host>:3000`
* Vote Result, access `http://<docker_host>:3000/result.html`

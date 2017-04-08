CREATE TABLE vote
(
    id BIGSERIAL NOT NULL PRIMARY KEY ,
    candidate_id INT NOT NULL,
    at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE counter_snapshot
(
    candidate_id INT NOT NULL PRIMARY KEY,
    last_vote_id BIGINT NOT NULL,
    count BIGINT NOT NULL
);
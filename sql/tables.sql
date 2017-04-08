CREATE TABLE vote
(
    id BIGINT DEFAULT nextval('vote_id_seq'::regclass) NOT NULL,
    who INTEGER,
    at TIMESTAMP WITH TIME ZONE
);

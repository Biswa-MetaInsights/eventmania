-- Creates one database per stateful EventMind service.
-- Runs automatically the first time the Postgres container initialises an empty
-- data volume (mounted at /docker-entrypoint-initdb.d in docker-compose.yml).
-- Only services whose config.py declares DATABASE_URL get a database here;
-- gateway, agents, recommendation and notification are stateless.
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE event_db;
CREATE DATABASE ticketing_db;
CREATE DATABASE payment_db;
CREATE DATABASE chat_db;
CREATE DATABASE review_db;
CREATE DATABASE community_db;

-- Preserve existing records when upgrading an older database.
-- The PostgreSQL seed.sql runs only on initial database creation.

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS case_number VARCHAR(50) UNIQUE;

-- =============================================================================
-- Estela Database Initialization
-- =============================================================================
-- This script is automatically executed when the MySQL container starts
-- for the first time.
-- =============================================================================

-- Create the database if it doesn't exist (usually already created by MYSQL_DATABASE)
CREATE DATABASE IF NOT EXISTS estela_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant all privileges to the estela user
GRANT ALL PRIVILEGES ON estela_db.* TO 'estela'@'%';
FLUSH PRIVILEGES;

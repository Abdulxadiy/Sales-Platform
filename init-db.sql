-- Initialize secondary databases if they do not exist
SELECT 'CREATE DATABASE shop_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shop_db')\gexec

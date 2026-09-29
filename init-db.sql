#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE inventra_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventra_db')\gexec
    SELECT 'CREATE DATABASE shop_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shop_db')\gexec
EOSQL

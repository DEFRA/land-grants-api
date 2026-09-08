#!/bin/bash
set -e

APP_USER="${APP_USER:-land_grants_api}"
APP_PASSWORD="${APP_PASSWORD:-land_grants_api}"

# Create the runtime role with the same limited permissions as production:
# it is not a superuser and only holds the table grants applied by the
# liquibase migrations (run by the land_grants_api_ddl role).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_USER}') THEN
            CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASSWORD}'
                INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        END IF;
    END
    \$\$;
EOSQL

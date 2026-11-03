#!/usr/bin/env bash

set -euo pipefail # Exit on error, undefined variable, and fail on pipe errors

# use the following command on a remote machine to access the webpage remotely for prod testing
# ssh -L localhost:8000:localhost:8000 <CSUSERNAME>@cs506x18.cs.wisc.edu
# find your cs username here: https://apps.cs.wisc.edu/accountapp/

missing_env=0
for env_file in frontend/.env backend/.env; do
    if [ ! -f "$env_file" ]; then
        echo -e "\033[1;31mERROR: Missing required file: $env_file\033[0m"
        missing_env=1
    fi
done
[ "$missing_env" -eq 1 ] && exit 1

docker compose -f compose.yaml --profile prod up --build

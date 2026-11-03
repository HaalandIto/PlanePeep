#!/bin/bash
# if necessary /bin/bash

set -euo pipefail # Exit on error, undefined variable, and fail on pipe errors

missing_env=0
for env_file in frontend/.env backend/.env; do
    if [ ! -f "$env_file" ]; then
        echo -e "\033[1;31mERROR: Missing required file: $env_file\033[0m"
        missing_env=1
    fi
done
[ "$missing_env" -eq 1 ] && exit 1

if grep -q ' afs ' /proc/mounts 2>/dev/null; then
    echo -e "\033[1;33mWARNING: AFS home directory detected (CSL machine).\033[0m"
    echo -e "\033[1;33mDocker cannot access the dev profile bind mounts over AFS.\033[0m"
    echo -e "\033[1;33mRun the prod profile instead with ./prod.sh\033[0m"
    exit 1
fi

docker compose -f compose.yaml --profile dev up --build

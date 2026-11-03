#!/usr/bin/env bash

set -euo pipefail # Exit on error, undefined variable, and fail on pipe errors

docker compose -p project_18 down --volumes


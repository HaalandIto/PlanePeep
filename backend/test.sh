#!/bin/bash

# from https://git.doit.wisc.edu/cdis/cs/courses/cs506/tutorials/spring-boot-2/

set -e 

COMPOSE_PROFILE="dev"
GRADLE_CMD="./gradlew clean test --no-daemon"

# are containers up yet
running=$(docker compose --profile "$COMPOSE_PROFILE" ps -q db-dev | xargs)

# compose up if needed
if [ -z "$running" ]; then
  docker compose --profile "$COMPOSE_PROFILE" up -d db-dev
  started_by_script=true
else
  started_by_script=false
fi

# tests
SPRING_PROFILES_ACTIVE=dev $GRADLE_CMD

# compose down if started here 
if [ "$started_by_script" = true ]; then
  docker compose --profile "$COMPOSE_PROFILE" down
fi
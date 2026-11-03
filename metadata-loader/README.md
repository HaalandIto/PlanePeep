# Metadata Loader module

Test with

```sh
docker compose -f compose.yaml --profile dev up

# if crashes

docker compose --profile dev up --build metadata-loader-dev

# and

docker compose down metadata-loader-dev
```

db

```sh
docker exec -it db-dev mysql -u planepeep -p
```

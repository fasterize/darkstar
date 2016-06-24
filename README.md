# Darkstar

Darkstar is an API to flush multiple HTTP cache servers, including CDN.

## Usage example

Flush Fasterize cache:
```bash
curl -v -X DELETE http://localhost:9080/v1/caches/fasterize/zones/${FASTERIZE_CONFIG_ID} \
  -H Content-Type:application/json \
  --data '{"authorizationToken": "${FASTERIZE_API_KEY}"}'
```

Flush Fasterize and KeyCDN caches:
```bash
curl -v -X DELETE http://localhost:9080/v1/caches/zones \
  -H Content-Type:application/json \
  --data '{"fasterize": {"authorizationToken": "${FASTERIZE_API_KEY}", "zoneID": "${FASTERIZE_CONFIG_ID}"}, "keycdn": {"authorizationToken": "${KEYCDN_API_KEY}", "zoneID": "${KEYCDN_ZONE_ID}"}}'
```

## Setup

Install tools:
```bash
npm install -g typescript gulp-cli typings
```

Install dependencies:
```bash
typings install
npm install
```

## Run it

Start Darkstar:
```bash
gulp start
```

## Run tests

Run tests:
```bash
gulp test
```

Continuously run tests:
```bash
gulp watch-test
```

## API Documentation

When started, go to [http://localhost:9080/doc](http://localhost:9080/doc)

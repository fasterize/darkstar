# Darkstar

Darkstar is an API to flush multiple CDN.

## Usage example

Flush KeyCDN cache:

```bash
curl -v -X DELETE http://localhost:9080/v1/caches/keycdn/zones/${FASTERIZE_CONFIG_ID} \
  -H Content-Type:application/json \
  --data '{"authorizationToken": "${FASTERIZE_API_KEY}"}'
```

Current available CDN : KeyCDN, CloudFront, Incapsula and Fastly.

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

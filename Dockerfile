ARG FSTRZ_DOCKER_BASE_TAG=master
FROM registry.gitlab.com/fasterize/fstrz/secure:$FSTRZ_DOCKER_BASE_TAG as secure
FROM registry.gitlab.com/fasterize/fstrz/cfssl:$FSTRZ_DOCKER_BASE_TAG as cfssl

FROM node:10.15.0-alpine as builder

WORKDIR /app

RUN apk update -qq && apk add python-dev openssh git g++ make curl linux-headers bash openssl

RUN mkdir -p /root/.ssh/
COPY --from=secure /root/.ssh/id_rsa /root/.ssh/id_rsa
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts
RUN ssh-keyscan gitlab.com >> /root/.ssh/known_hosts

COPY npm-shrinkwrap.json package.json /app/

RUN npm config set unsafe-perm true
RUN npm install
RUN npm config set unsafe-perm false

FROM node:10.15.0-alpine

WORKDIR /app

RUN apk add bash openssl ca-certificates

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /usr/local/lib /usr/local/lib

COPY . ./

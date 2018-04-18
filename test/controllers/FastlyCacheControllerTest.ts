/// <reference path="../../typings/index.d.ts" />
// tslint:disable-next-line:no-var-requires
const Lab = require('lab');
export const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const beforeEach = lab.beforeEach;

import * as request from 'supertest';
import * as nock from 'nock';

import { server } from '../../src/darkstar';

describe('/v1/caches/fastly', () => {
  let fastlyAPIMock: nock.Scope;

  beforeEach( (done: Function) => {
    fastlyAPIMock = nock('https://api.fastly.com');
    done();
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let fastlyFlushMock: nock.Scope;

      beforeEach( (done: Function) => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/fastly/zones/abcd')
          .set('accept', 'application/json');
        fastlyFlushMock = fastlyAPIMock
          .post('/service/abcd/purge_all');
        done();
      });

      it('should flush a complete zone of the Fastly cache', (done: Function) => {
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect({
            remoteStatusCode: 200,
            remoteResponse: { success: true },
          })
          .end((error: any, response: request.Response) => {
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply "Bad request" when invalid payload is sent', (done: Function) => {
        fastlyFlushMock.times(0);

        flushRequest.send({})
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'child "authorizationToken" fails because ["authorizationToken" is required]',
            validation: { source: 'payload', keys: [ 'authorizationToken' ] },
          })
          .end((error: any, response: request.Response) => {
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply bad request when receiving Fastly cache client errors', (done: Function) => {
        const fastlyError = {
          code: 401,
          message: "The Fastly-key token is invalid",
          status: "Unauthorized",
        };

        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(401, fastlyError);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 401,
            remoteResponse: fastlyError,
          })
          .end((error: any, response: request.Response) => {
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when receiving Fastly cache server errors', (done: Function) => {
        const fastlyError = {
          code: 500,
          message: "error",
          status: "Internal Server Error",
        };

        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(500, fastlyError);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 500,
            remoteResponse: fastlyError,
          })
          .end((error: any, response: request.Response) => {
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when an error occurred while accessing Fastly API', (done: Function) => {
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'An error occurred while accessing fastly API: connection error',
          })
          .end((error: any, response: request.Response) => {
            fastlyAPIMock.done();
            done(error);
          });
      });

    });
  });
});

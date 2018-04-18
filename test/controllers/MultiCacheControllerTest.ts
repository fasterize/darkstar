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

describe('/v1/caches', () => {
  let keycdnAPIMock: nock.Scope;
  let fasterizeAPIMock: nock.Scope;
  let fastlyAPIMock: nock.Scope;

  beforeEach( (done: Function) => {
    keycdnAPIMock = nock('https://api.keycdn.com');
    fasterizeAPIMock = nock('https://api.fasterize.com');
    fastlyAPIMock = nock('https://api.fastly.com');
    done();
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let keycdnFlushMock: nock.Scope;
      let fasterizeFlushMock: nock.Scope;
      let fastlyFlushMock: nock.Scope;

      beforeEach( (done: Function) => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/zones')
          .set('accept', 'application/json');
        keycdnFlushMock = keycdnAPIMock
          .get('/zones/purge/1.json');
        fasterizeFlushMock = fasterizeAPIMock
          .delete('/v1/configs/42/cache');
        fastlyFlushMock = fastlyAPIMock
          .post('/service/abcd/purge_all');
        done();
      });

      it('should flush a complete zone of KeyCDN and Fasterize', (done: Function) => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(200, { status: 'success', description: 'Cache has been cleared for zone 1.' });
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushRequest
          .send({
            keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
            fasterize: { authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: '42' },
            fastly: {authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: 'abcd'},
          })
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect({
            status: {
              keycdn: {
                remoteStatusCode: 200,
                remoteResponse: { status: 'success', description: 'Cache has been cleared for zone 1.' },
              },
              fasterize: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
              fastly: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
            },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            fasterizeAPIMock.done();
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should flush a complete zone of Fasterize', (done: Function) => {
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        flushRequest
          .send({
            fasterize: { authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: '42' },
          })
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect({
            status: {
              fasterize: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
            },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply "Bad request" when invalid payload is sent', (done: Function) => {
        keycdnFlushMock.times(0);
        fasterizeFlushMock.times(0);
        fastlyFlushMock.times(0);
        flushRequest.send({})
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: '"value" must have at least 1 children',
            validation: { source: 'payload', keys: [ 'value' ] },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            fasterizeAPIMock.done();
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply bad request when receiving client errors from one of the cache', (done: Function) => {
        const keycdnError = {
          code: 401,
          message: "The authorization token is invalid",
          status: "Unauthorized",
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushRequest
          .send({
            keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
            fasterize: { authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: '42' },
            fastly: {authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: 'abcd'},
          })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'A remote error occurred on one of the caches to flush',
            status: {
              fasterize: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
              fastly: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
              keycdn: {
                message: 'A remote error occurred',
                remoteStatusCode: 401,
                remoteResponse: keycdnError,
              },
            },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            fasterizeAPIMock.done();
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when receiving an error from one of the cache servers', (done: Function) => {
        const keycdnError = {
          code: 500,
          message: "error",
          status: "Internal Server Error",
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(500, keycdnError);
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushRequest
          .send({
            keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
            fasterize: { authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: '42' },
            fastly: {authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: 'abcd'},
          })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'A remote error occurred on one of the caches to flush',
            status: {
              fasterize: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
              fastly: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
              keycdn: {
                message: 'A remote error occurred',
                remoteStatusCode: 500,
                remoteResponse: keycdnError,
              },
            },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            fasterizeAPIMock.done();
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when an error occurred while accessing one of the cache servers',
         (done: Function) => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .replyWithError('connection error');
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushRequest
          .send({
            keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
            fasterize: { authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: '42' },
            fastly: {authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: 'abcd'},
          })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'A remote error occurred on one of the caches to flush',
            status: {
              fasterize: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
              fastly: {
                remoteStatusCode: 200,
                remoteResponse: { success: true },
              },
              keycdn: {
                message: 'An error occurred while accessing keycdn API: connection error',
              },
            },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            fasterizeAPIMock.done();
            fastlyAPIMock.done();
            done(error);
          });
      });

      it('should reply bad request over bad gateway when both caches have an error', (done: Function) => {
        const keycdnError = {
          description: 'Unauthorized',
          status: 'error',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');
        flushRequest
          .send({
            keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
            fasterize: { authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: '42' },
            fastly: {authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', zoneID: 'abcd'},
          })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'A remote error occurred on one of the caches to flush',
            status: {
              fasterize: {
                message: 'An error occurred while accessing fasterize API: connection error',
              },
              fastly: {
                message: 'An error occurred while accessing fastly API: connection error',
              },
              keycdn: {
                message: 'A remote error occurred',
                remoteStatusCode: 401,
                remoteResponse: keycdnError,
              },
            },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            fasterizeAPIMock.done();
            fastlyAPIMock.done();
            done(error);
          });
      });
    });
  });
});

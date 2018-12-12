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

describe('/v1/caches/fasterize', () => {
  let fasterizeAPIMock: nock.Scope;

  beforeEach( (done: Function) => {
    fasterizeAPIMock = nock('https://api.fasterize.com');
    done();
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let fasterizeFlushMock: nock.Scope;

      beforeEach( (done: Function) => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/fasterize/zones/1')
          .set('accept', 'application/json');
        fasterizeFlushMock = fasterizeAPIMock
          .delete('/v1/configs/1/cache');
        done();
      });

      it('should flush a complete zone of the Fasterize cache', (done: Function) => {
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect({
            remoteStatusCode: 200,
            remoteResponse: { success: true },
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply "Bad request" when invalid payload is sent', (done: Function) => {
        fasterizeFlushMock.times(0);

        flushRequest.send({})
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'child "authorizationToken" fails because ["authorizationToken" is required]',
            validation: { source: 'payload', keys: [ 'authorizationToken' ] },
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply bad request when receiving Fasterize cache client errors', (done: Function) => {
        const fasterizeError = {
          code: 401,
          message: "The authorization token is invalid",
          status: "Unauthorized",
        };

        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(401, fasterizeError);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 401,
            remoteResponse: fasterizeError,
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when receiving Fasterize cache server errors', (done: Function) => {
        const fasterizeError = {
          code: 500,
          message: "error",
          status: "Internal Server Error",
        };

        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(500, fasterizeError);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 500,
            remoteResponse: fasterizeError,
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when an error occurred while accessing Fasterize API', (done: Function) => {
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'An error occurred while accessing fasterize API: connection error',
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });
    });
  });

  describe('/zone/${zone_id}/urls', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;

      beforeEach( (done: Function) => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/fasterize/zones/1/urls')
          .set('accept', 'application/json');
        done();
      });

      it('should flush an URL of the Fasterize cache', (done: Function) => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', { url: 'http://test-domain.com/image1.png' })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', urls: ['http://test-domain.com/image1.png'] })
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect({
            remoteStatusCode: 200,
            remoteResponse: { success: true },
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should flush more than 1 URL of the Fasterize cache', (done: Function) => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', { url: 'https://test-domain.com/image1.png' })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true })
          .delete('/v1/configs/1/cache', { url: 'https://test-domain.com/image2.png' })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'] })
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect({
            remoteStatusCode: 200,
            remoteResponse: { success: true },
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply "Bad request" when invalid payload is sent', (done: Function) => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', { url: 'http://test-domain.com/image1.png' })
          .times(0);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=' })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'child "urls" fails because ["urls" is required]',
            validation: { source: 'payload', keys: [ 'urls' ] },
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply "Bad request" when `urls` is empty', (done: Function) => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', { url: 'http://test-domain.com/image1.png' })
          .times(0);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', urls: [] })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'child "urls" fails because ["urls" must contain at least 1 items]',
            validation: { source: 'payload', keys: [ 'urls' ] },
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply bad request when receiving Fasterize cache client errors', (done: Function) => {
        const fasterizeError = {
          code: 401,
          message: "The authorization token is invalid",
          status: "Unauthorized",
        };

        fasterizeAPIMock
          .delete('/v1/configs/1/cache', { url: 'http://test-domain.com/image1.png' })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(401, fasterizeError);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', urls: ['http://test-domain.com/image1.png'] })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 401,
            remoteResponse: fasterizeError,
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when receiving Fasterize cache server errors', (done: Function) => {
        const fasterizeError = {
          code: 500,
          message: "error",
          status: "Internal Server Error",
        };

        fasterizeAPIMock
          .delete('/v1/configs/1/cache', { url: 'http://test-domain.com/image1.png' })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(500, fasterizeError);

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', urls: ['http://test-domain.com/image1.png'] })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 500,
            remoteResponse: fasterizeError,
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when an error occurred while accessing Fasterize API', (done: Function) => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', { url: 'http://test-domain.com/image1.png' })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');

        flushRequest.send({ authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=', urls: ['http://test-domain.com/image1.png'] })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'An error occurred while accessing fasterize API: connection error',
          })
          .end((error: any, response: request.Response) => {
            if (error) done(error);
            fasterizeAPIMock.done();
            done(error);
          });
      });
    });
  });
});

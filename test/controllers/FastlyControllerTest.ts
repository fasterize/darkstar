import * as Lab from '@hapi/lab';
export const lab = Lab.script();
const { describe, it, beforeEach } = lab;

import * as request from 'supertest';
import * as nock from 'nock';

import { server } from '../../src/darkstar';

describe('/v1/caches/fastly', () => {
  let fastlyAPIMock: nock.Scope;

  beforeEach(() => {
    fastlyAPIMock = nock('https://api.fastly.com');
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let fastlyFlushMock: nock.Interceptor;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/fastly/zones/abcd')
          .set('accept', 'application/json');
        fastlyFlushMock = fastlyAPIMock.post('/service/abcd/purge_all');
      });

      it('should flush a complete zone of the Fastly cache', () => {
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: { status: 'ok' },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fastlyAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        fastlyFlushMock.times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({})
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'child "authorizationToken" fails because ["authorizationToken" is required]',
              validation: { source: 'payload', keys: ['authorizationToken'] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fastlyAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Fastly cache client errors', () => {
        const fastlyError = {
          code: 401,
          message: 'The Fastly-key token is invalid',
          status: 'Unauthorized',
        };

        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(401, fastlyError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 401,
              remoteResponse: fastlyError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fastlyAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Fastly cache server errors', () => {
        const fastlyError = {
          code: 500,
          message: 'error',
          status: 'Internal Server Error',
        };

        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(500, fastlyError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 500,
              remoteResponse: fastlyError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fastlyAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Fastly API', () => {
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing fastly API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fastlyAPIMock.done();
              resolve();
            });
        });
      });
    });
  });

  describe('/zones/${zone_id}/urls', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let flushMock: nock.Scope;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/fastly/zones/abcd/urls')
          .set('accept', 'application/json');
        flushMock = nock('https://test-domain.com');
      });

      it('should flush a URL of the Fastly cache', () => {
        flushMock
          .intercept('/image.png', 'PURGE')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: { status: 'ok' },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              flushMock.done();
              resolve();
            });
        });
      });

      it('should flush more than 1 URL of the Fastly cache', () => {
        flushMock
          .intercept('/image.png', 'PURGE')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' })
          .intercept('/image2.png', 'PURGE')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['https://test-domain.com/image.png', 'https://test-domain.com/image2.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: { status: 'ok' },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              flushMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        flushMock.intercept('/image.png', 'PURGE').times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'child "urls" fails because ["urls" is required]',
              validation: { source: 'payload', keys: ['urls'] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              flushMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Fastly cache client errors', () => {
        const fastlyError = {
          code: 401,
          message: 'The Fastly-key token is invalid',
          status: 'Unauthorized',
        };

        flushMock
          .intercept('/image.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(401, fastlyError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 401,
              remoteResponse: fastlyError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              flushMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Fastly cache server errors', () => {
        const fastlyError = {
          code: 500,
          message: 'error',
          status: 'Internal Server Error',
        };

        flushMock
          .intercept('/image.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(500, fastlyError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 500,
              remoteResponse: fastlyError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              flushMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Fastly API', () => {
        flushMock
          .intercept('/image.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing fastly API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              flushMock.done();
              resolve();
            });
        });
      });
    });
  });
});

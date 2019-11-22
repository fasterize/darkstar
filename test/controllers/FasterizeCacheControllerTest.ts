import * as Lab from '@hapi/lab';
export const lab = Lab.script();
const { describe, it, beforeEach } = lab;

import * as request from 'supertest';
import * as nock from 'nock';

import { server } from '../../src/darkstar';

describe('/v1/caches/fasterize', () => {
  let fasterizeAPIMock: nock.Scope;

  beforeEach(() => {
    fasterizeAPIMock = nock('https://api.fasterize.com');
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let fasterizeFlushMock: nock.Interceptor;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/fasterize/zones/1')
          .set('accept', 'application/json');
        fasterizeFlushMock = fasterizeAPIMock.delete('/v1/configs/1/cache');
      });

      it('should flush a complete zone of the Fasterize cache', () => {
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: { success: true },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        fasterizeFlushMock.times(0);

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
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Fasterize cache client errors', () => {
        const fasterizeError = {
          code: 401,
          message: 'The authorization token is invalid',
          status: 'Unauthorized',
        };

        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(401, fasterizeError);

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
              remoteResponse: fasterizeError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Fasterize cache server errors', () => {
        const fasterizeError = {
          code: 500,
          message: 'error',
          status: 'Internal Server Error',
        };

        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(500, fasterizeError);

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
              remoteResponse: fasterizeError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Fasterize API', () => {
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing fasterize API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });
    });
  });

  describe('/zones/${zone_id}/urls', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/fasterize/zones/1/urls')
          .set('accept', 'application/json');
      });

      it('should flush an URL of the Fasterize cache', () => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', {
            url: 'http://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['http://test-domain.com/image1.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: { success: true },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should flush more than 1 URL of the Fasterize cache', () => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', {
            url: 'https://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true })
          .delete('/v1/configs/1/cache', {
            url: 'https://test-domain.com/image2.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: { success: true },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', {
            url: 'http://test-domain.com/image1.png',
          })
          .times(0);

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
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when `urls` is empty', () => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', {
            url: 'http://test-domain.com/image1.png',
          })
          .times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: [],
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'child "urls" fails because ["urls" must contain at least 1 items]',
              validation: { source: 'payload', keys: ['urls'] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Fasterize cache client errors', () => {
        const fasterizeError = {
          code: 401,
          message: 'The authorization token is invalid',
          status: 'Unauthorized',
        };

        fasterizeAPIMock
          .delete('/v1/configs/1/cache', {
            url: 'http://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(401, fasterizeError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['http://test-domain.com/image1.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 401,
              remoteResponse: fasterizeError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Fasterize cache server errors', () => {
        const fasterizeError = {
          code: 500,
          message: 'error',
          status: 'Internal Server Error',
        };

        fasterizeAPIMock
          .delete('/v1/configs/1/cache', {
            url: 'http://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(500, fasterizeError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['http://test-domain.com/image1.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 500,
              remoteResponse: fasterizeError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Fasterize API', () => {
        fasterizeAPIMock
          .delete('/v1/configs/1/cache', {
            url: 'http://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
              urls: ['http://test-domain.com/image1.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing fasterize API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });
    });
  });
});

import * as Lab from '@hapi/lab';
export const lab = Lab.script();
const { describe, it, beforeEach } = lab;

import * as request from 'supertest';
import * as nock from 'nock';

import { server } from '../../src/darkstar';

describe('/v1/caches/keycdn', () => {
  let keycdnAPIMock: nock.Scope;

  beforeEach(() => {
    keycdnAPIMock = nock('https://api.keycdn.com');
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let keycdnFlushMock: nock.Interceptor;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/keycdn/zones/1')
          .set('accept', 'application/json');
        keycdnFlushMock = keycdnAPIMock.get('/zones/purge/1.json');
      });

      it('should flush a complete zone of KeyCDN', () => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(200, {
            status: 'success',
            description: 'Cache has been cleared for zone 1.',
          });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({ authorizationToken: 'sk_prod_XXX' })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: {
                status: 'success',
                description: 'Cache has been cleared for zone 1.',
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        keycdnFlushMock.times(0);

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
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving KeyCDN client errors', () => {
        const keycdnError = {
          description: 'Unauthorized',
          status: 'error',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({ authorizationToken: 'sk_prod_XXX' })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 401,
              remoteResponse: keycdnError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving KeyCDN server errors', () => {
        const keycdnError = {
          description: 'Internal Server Error',
          status: 'error',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(500, keycdnError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({ authorizationToken: 'sk_prod_XXX' })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 500,
              remoteResponse: keycdnError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing KeyCDN API', () => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({ authorizationToken: 'sk_prod_XXX' })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing keycdn API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
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
        flushRequest = request(server.listener).delete('/v1/caches/keycdn/zones/1/urls');
      });

      it('should flush an URL from KeyCDN', () => {
        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(200, {
            status: 'success',
            description: 'Cache has been cleared for URL(s).',
          });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'sk_prod_XXX',
              urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: {
                status: 'success',
                description: 'Cache has been cleared for URL(s).',
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({ authorizationToken: 'sk_prod_XXX' })
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
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when `urls` parameter is an empty array', () => {
        keycdnAPIMock.delete('/zones/purgeurl/1.json', { urls: [] }).times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({ authorizationToken: 'sk_prod_XXX', urls: [] })
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
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving KeyCDN client errors', () => {
        const keycdnError = {
          description: 'Unauthorized',
          status: 'error',
        };

        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'sk_prod_XXX',
              urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 401,
              remoteResponse: keycdnError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving KeyCDN server errors', () => {
        const keycdnError = {
          description: 'Internal Server Error',
          status: 'error',
        };

        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(500, keycdnError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'sk_prod_XXX',
              urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 500,
              remoteResponse: keycdnError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing KeyCDN API', () => {
        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              authorizationToken: 'sk_prod_XXX',
              urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing keycdn API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              resolve();
            });
        });
      });
    });
  });
});

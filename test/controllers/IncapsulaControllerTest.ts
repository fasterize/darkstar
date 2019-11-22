import * as Lab from '@hapi/lab';
import * as nock from 'nock';
import * as request from 'supertest';
import { server } from '../../src/darkstar';
export const lab = Lab.script();
const { describe, it, beforeEach } = lab;

describe('/v1/caches/incapsula', () => {
  let incapsulaAPIMock: nock.Scope;

  beforeEach(() => {
    incapsulaAPIMock = nock('https://my.incapsula.com');
  });

  describe('/zones/${zone_id}', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let incapsulaFlushMock: nock.Interceptor;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/incapsula/zones/abcd')
          .set('accept', 'application/json');
        incapsulaFlushMock = incapsulaAPIMock.post(
          '/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd'
        );
      });

      it('should flush a complete zone of the Incapsula cache', () => {
        incapsulaFlushMock
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        incapsulaFlushMock.times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({})
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'child "incapsulaApiID" fails because ["incapsulaApiID" is required]',
              validation: { source: 'payload', keys: ['incapsulaApiID'] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Incapsula cache client errors', () => {
        const incapsulaError = {
          code: 9411,
          message: 'Authentication parameters missing or incorrect',
          status: 'Authentication missing or invalid',
        };

        incapsulaFlushMock.matchHeader('accept', 'application/json').reply(401, incapsulaError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 401,
              remoteResponse: incapsulaError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Incapsula cache server errors', () => {
        const incapsulaError = {
          code: 1,
          message: 'Unexpected error',
          status: 'The server has encountered an unexpected error',
        };

        incapsulaFlushMock.matchHeader('accept', 'application/json').reply(500, incapsulaError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 500,
              remoteResponse: incapsulaError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Incapsula API', () => {
        incapsulaFlushMock.matchHeader('accept', 'application/json').replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing incapsula API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
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
          .delete('/v1/caches/incapsula/zones/abcd/urls')
          .set('accept', 'application/json');
      });

      it('should flush several URls of the Incapsula cache', () => {
        incapsulaAPIMock
          .post(`/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd&resource_pattern=%2Fimage1.png`)
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } })
          .post(
            `/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd&resource_pattern=%2Fimage2.png%3Ffzr-v%3D123`
          )
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
              urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png?fzr-v=123'],
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
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should flush one URL of the Incapsula cache', () => {
        incapsulaAPIMock
          .post(
            `/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd&resource_pattern=%2Fimage2.png%3Ffzr-v%3D123`
          )
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
              urls: ['https://test-domain.com/image2.png?fzr-v=123'],
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
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        incapsulaAPIMock
          .post(`/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd&resource_pattern=%2Fimage1.png`)
          .times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({})
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'child "incapsulaApiID" fails because ["incapsulaApiID" is required]',
              validation: { source: 'payload', keys: ['incapsulaApiID'] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Incapsula cache client errors', () => {
        const incapsulaError = {
          code: 9411,
          message: 'Authentication parameters missing or incorrect',
          status: 'Authentication missing or invalid',
        };

        incapsulaAPIMock
          .post(`/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd&resource_pattern=%2Fimage1.png`)
          .matchHeader('accept', 'application/json')
          .reply(401, incapsulaError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
              urls: ['https://test-domain.com/image1.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 401,
              remoteResponse: incapsulaError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Incapsula cache server errors', () => {
        const incapsulaError = {
          code: 1,
          message: 'Unexpected error',
          status: 'The server has encountered an unexpected error',
        };

        incapsulaAPIMock
          .post(`/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd&resource_pattern=%2Fimage1.png`)
          .matchHeader('accept', 'application/json')
          .reply(500, incapsulaError);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
              urls: ['https://test-domain.com/image1.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'A remote error occurred',
              remoteStatusCode: 500,
              remoteResponse: incapsulaError,
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Incapsula API', () => {
        incapsulaAPIMock
          .post(`/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd&resource_pattern=%2Fimage1.png`)
          .matchHeader('accept', 'application/json')
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              incapsulaApiID: '1234',
              incapsulaApiKey: '4321',
              urls: ['https://test-domain.com/image1.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing incapsula API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });
    });
  });
});

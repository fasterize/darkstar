import * as Lab from '@hapi/lab';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as request from 'supertest';
import { server } from '../../src/darkstar';
export const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

describe('/v1/caches', () => {
  let keycdnAPIMock: nock.Scope;
  let fasterizeAPIMock: nock.Scope;
  let fastlyAPIMock: nock.Scope;
  let cloudfrontAPIMock: nock.Scope;
  let incapsulaAPIMock: nock.Scope;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    keycdnAPIMock = nock('https://api.keycdn.com');
    fasterizeAPIMock = nock('https://api.fasterize.com');
    fastlyAPIMock = nock('https://api.fastly.com');
    cloudfrontAPIMock = nock('https://cloudfront.amazonaws.com')
      .replyContentLength()
      .defaultReplyHeaders({ 'Content-Type': 'text/xml' });
    incapsulaAPIMock = nock('https://my.incapsula.com');
    sandbox.stub(Date, 'now').returns(0);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let keycdnFlushMock: nock.Interceptor;
      let fasterizeFlushMock: nock.Interceptor;
      let fastlyFlushMock: nock.Interceptor;
      let cloudfrontFlushMock: nock.Interceptor;
      let incapsulaFlushMock: nock.Interceptor;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/zones')
          .set('accept', 'application/json');
        keycdnFlushMock = keycdnAPIMock.get('/zones/purge/1.json');
        fasterizeFlushMock = fasterizeAPIMock.delete('/v1/configs/42/cache');
        fastlyFlushMock = fastlyAPIMock.post('/service/abcd/purge_all');
        cloudfrontFlushMock = cloudfrontAPIMock.post(
          '/2019-03-26/distribution/abcd/invalidation',
          '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
            '<Items><Path>/*</Path></Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
        );
        incapsulaFlushMock = incapsulaAPIMock.post(
          '/api/prov/v1/sites/cache/purge?api_id=1234&api_key=4321&site_id=abcd'
        );
      });

      it('should flush a complete zone of KeyCDN, Fasterize, Fastly, CloudFront and Incapsula ', () => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(200, {
            status: 'success',
            description: 'Cache has been cleared for zone 1.',
          });
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontFlushMock.reply(
          200,
          `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd</Id>` +
            `<Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch><Paths>` +
            `<Quantity>1</Quantity><Items><Path>/*</Path></Items></Paths><CallerReference>${Date.now().toString()}` +
            `</CallerReference></InvalidationBatch></Invalidation>`
        );
        incapsulaFlushMock
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
              },
              incapsula: {
                incapsulaApiID: '1234',
                incapsulaApiKey: '4321',
                zoneID: 'abcd',
              },
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              status: {
                keycdn: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    status: 'success',
                    description: 'Cache has been cleared for zone 1.',
                  },
                },
                fasterize: {
                  remoteStatusCode: 200,
                  remoteResponse: { success: true },
                },
                fastly: {
                  remoteStatusCode: 200,
                  remoteResponse: { status: 'ok' },
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/*'],
                          Quantity: 1,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
                incapsula: {
                  remoteStatusCode: 200,
                  remoteResponse: { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              fastlyAPIMock.done();
              cloudfrontAPIMock.done();
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should flush a complete zone of Fasterize', () => {
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
              },
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
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        keycdnFlushMock.times(0);
        fasterizeFlushMock.times(0);
        fastlyFlushMock.times(0);
        cloudfrontFlushMock.times(0);
        incapsulaFlushMock.times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({})
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: '"value" must have at least 1 children',
              validation: { source: 'payload', keys: [''] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              fastlyAPIMock.done();
              cloudfrontAPIMock.done();
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving client errors from one of the cache', () => {
        const keycdnError = {
          code: 401,
          message: 'The authorization token is invalid',
          status: 'Unauthorized',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontFlushMock.reply(
          200,
          `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd</Id>` +
            `<Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch><Paths>` +
            `<Quantity>1</Quantity><Items><Path>/*</Path></Items></Paths><CallerReference>${Date.now().toString()}` +
            `</CallerReference></InvalidationBatch></Invalidation>`
        );
        incapsulaFlushMock
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
              },
              incapsula: {
                incapsulaApiID: '1234',
                incapsulaApiKey: '4321',
                zoneID: 'abcd',
              },
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
                  remoteResponse: { status: 'ok' },
                },
                keycdn: {
                  message: 'A remote error occurred',
                  remoteStatusCode: 401,
                  remoteResponse: keycdnError,
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/*'],
                          Quantity: 1,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
                incapsula: {
                  remoteStatusCode: 200,
                  remoteResponse: { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              fastlyAPIMock.done();
              cloudfrontAPIMock.done();
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving an error from one of the cache servers', () => {
        const keycdnError = {
          code: 500,
          message: 'error',
          status: 'Internal Server Error',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(500, keycdnError);
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontFlushMock.reply(
          200,
          `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd</Id>` +
            `<Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch><Paths>` +
            `<Quantity>1</Quantity><Items><Path>/*</Path></Items></Paths><CallerReference>${Date.now().toString()}` +
            `</CallerReference></InvalidationBatch></Invalidation>`
        );
        incapsulaFlushMock
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
              },
              incapsula: {
                incapsulaApiID: '1234',
                incapsulaApiKey: '4321',
                zoneID: 'abcd',
              },
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
                  remoteResponse: { status: 'ok' },
                },
                keycdn: {
                  message: 'A remote error occurred',
                  remoteStatusCode: 500,
                  remoteResponse: keycdnError,
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/*'],
                          Quantity: 1,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
                incapsula: {
                  remoteStatusCode: 200,
                  remoteResponse: { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              fastlyAPIMock.done();
              cloudfrontAPIMock.done();
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing one of the cache servers', () => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .replyWithError('connection error');
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontFlushMock.reply(
          200,
          `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd</Id>` +
            `<Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch><Paths>` +
            `<Quantity>1</Quantity><Items><Path>/*</Path></Items></Paths><CallerReference>${Date.now().toString()}` +
            `</CallerReference></InvalidationBatch></Invalidation>`
        );
        incapsulaFlushMock
          .matchHeader('accept', 'application/json')
          .reply(200, { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
              },
              incapsula: {
                incapsulaApiID: '1234',
                incapsulaApiKey: '4321',
                zoneID: 'abcd',
              },
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
                  remoteResponse: { status: 'ok' },
                },
                keycdn: {
                  message: 'An error occurred while accessing keycdn API: connection error',
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/*'],
                          Quantity: 1,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
                incapsula: {
                  remoteStatusCode: 200,
                  remoteResponse: { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              fastlyAPIMock.done();
              cloudfrontAPIMock.done();
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request over bad gateway when both caches have an error', () => {
        const keycdnError = {
          description: 'Unauthorized',
          status: 'error',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);
        fasterizeFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');
        fastlyFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');
        cloudfrontFlushMock.times(4).replyWithError('connection error');
        incapsulaFlushMock.matchHeader('accept', 'application/json').replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: { authorizationToken: 'sk_prod_XXX', zoneID: '1' },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
              },
              incapsula: {
                incapsulaApiID: '1234',
                incapsulaApiKey: '4321',
                zoneID: 'abcd',
              },
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
                cloudfront: {
                  message: 'An error occurred while accessing cloudfront API: connection error',
                },
                incapsula: {
                  message: 'An error occurred while accessing incapsula API: connection error',
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              fastlyAPIMock.done();
              cloudfrontAPIMock.done();
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });
    });
  });

  describe('/urls', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let flushMock: nock.Scope;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/urls')
          .set('accept', 'application/json');
        flushMock = nock('https://test-domain.com');
      });

      it('should flush an URL for multiple caches', () => {
        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(200, {
            status: 'success',
            description: 'Cache has been cleared for URL(s).',
          });
        fasterizeAPIMock
          .delete('/v1/configs/42/cache', {
            url: 'https://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true })
          .delete('/v1/configs/42/cache', {
            url: 'https://test-domain.com/image2.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushMock
          .intercept('/image1.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' })
          .intercept('/image2.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>2</Quantity>' +
              '<Items><Path>/image1.png</Path><Path>/image2.png</Path>' +
              '</Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            200,
            `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd` +
              `</Id><Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch>` +
              `<Paths><Quantity>2</Quantity><Items><Path>/image1.png</Path>` +
              `<Path>/image2.png</Path></Items></Paths><CallerReference>` +
              `${Date.now().toString()}</CallerReference></InvalidationBatch></Invalidation>`
          );
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
              keycdn: {
                authorizationToken: 'sk_prod_XXX',
                zoneID: '1',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              incapsula: {
                incapsulaApiID: '1234',
                incapsulaApiKey: '4321',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png?fzr-v=123'],
              },
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              status: {
                keycdn: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    status: 'success',
                    description: 'Cache has been cleared for URL(s).',
                  },
                },
                fasterize: {
                  remoteStatusCode: 200,
                  remoteResponse: { success: true },
                },
                fastly: {
                  remoteStatusCode: 200,
                  remoteResponse: { status: 'ok' },
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/image1.png', '/image2.png'],
                          Quantity: 2,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
                incapsula: {
                  remoteStatusCode: 200,
                  remoteResponse: { res: 0, res_message: 'OK', debug_info: { 'id-info': '13007' } },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              flushMock.done();
              cloudfrontAPIMock.done();
              incapsulaAPIMock.done();
              resolve();
            });
        });
      });

      it('should flush an URL of Fasterize', () => {
        fasterizeAPIMock
          .delete('/v1/configs/42/cache', {
            url: 'https://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
                urls: ['https://test-domain.com/image1.png'],
              },
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
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        keycdnAPIMock.delete('/zones/purgeurl/1.json').times(0);
        fasterizeAPIMock.delete('/v1/configs/42/cache').times(0);
        flushMock.intercept('/image1.png', 'PURGE').times(0);
        cloudfrontAPIMock.post('/2019-03-26/distribution/abcd/invalidation').times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({})
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: '"value" must have at least 1 children',
              validation: { source: 'payload', keys: [''] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              flushMock.done();
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving client errors from one of the cache', () => {
        const keycdnError = {
          code: 401,
          message: 'The authorization token is invalid',
          status: 'Unauthorized',
        };

        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);
        fasterizeAPIMock
          .delete('/v1/configs/42/cache', {
            url: 'https://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushMock
          .intercept('/image1.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' })
          .intercept('/image2.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>2</Quantity>' +
              '<Items><Path>/image1.png</Path><Path>/image2.png</Path>' +
              '</Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            200,
            `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd` +
              `</Id><Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch>` +
              `<Paths><Quantity>2</Quantity><Items><Path>/image1.png</Path>` +
              `<Path>/image2.png</Path></Items></Paths><CallerReference>` +
              `${Date.now().toString()}</CallerReference></InvalidationBatch></Invalidation>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: {
                authorizationToken: 'sk_prod_XXX',
                zoneID: '1',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
                urls: ['https://test-domain.com/image1.png'],
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
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
                  remoteResponse: { status: 'ok' },
                },
                keycdn: {
                  message: 'A remote error occurred',
                  remoteStatusCode: 401,
                  remoteResponse: keycdnError,
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/image1.png', '/image2.png'],
                          Quantity: 2,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              flushMock.done();
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving an error from one of the cache servers', () => {
        const keycdnError = {
          code: 500,
          message: 'error',
          status: 'Internal Server Error',
        };

        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(500, keycdnError);
        fasterizeAPIMock
          .delete('/v1/configs/42/cache', {
            url: 'https://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushMock
          .intercept('/image1.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' })
          .intercept('/image2.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>2</Quantity>' +
              '<Items><Path>/image1.png</Path><Path>/image2.png</Path>' +
              '</Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            200,
            `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd` +
              `</Id><Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch>` +
              `<Paths><Quantity>2</Quantity><Items><Path>/image1.png</Path>` +
              `<Path>/image2.png</Path></Items></Paths><CallerReference>` +
              `${Date.now().toString()}</CallerReference></InvalidationBatch></Invalidation>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: {
                authorizationToken: 'sk_prod_XXX',
                zoneID: '1',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
                urls: ['https://test-domain.com/image1.png'],
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
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
                  remoteResponse: { status: 'ok' },
                },
                keycdn: {
                  message: 'A remote error occurred',
                  remoteStatusCode: 500,
                  remoteResponse: keycdnError,
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/image1.png', '/image2.png'],
                          Quantity: 2,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              flushMock.done();
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing 1 of the cache servers', () => {
        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .replyWithError('connection error');
        fasterizeAPIMock
          .delete('/v1/configs/42/cache', {
            url: 'https://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { success: true });
        flushMock
          .intercept('/image1.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' })
          .intercept('/image2.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .reply(200, { status: 'ok' });
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>2</Quantity>' +
              '<Items><Path>/image1.png</Path><Path>/image2.png</Path>' +
              '</Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            200,
            `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd` +
              `</Id><Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch>` +
              `<Paths><Quantity>2</Quantity><Items><Path>/image1.png</Path>` +
              `<Path>/image2.png</Path></Items></Paths><CallerReference>` +
              `${Date.now().toString()}</CallerReference></InvalidationBatch></Invalidation>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: {
                authorizationToken: 'sk_prod_XXX',
                zoneID: '1',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
                urls: ['https://test-domain.com/image1.png'],
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
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
                  remoteResponse: { status: 'ok' },
                },
                keycdn: {
                  message: 'An error occurred while accessing keycdn API: connection error',
                },
                cloudfront: {
                  remoteStatusCode: 200,
                  remoteResponse: {
                    Invalidation: {
                      CreateTime: '2019-07-24T08:47:53.726Z',
                      Id: 'abcd',
                      InvalidationBatch: {
                        CallerReference: '0',
                        Paths: {
                          Items: ['/image1.png', '/image2.png'],
                          Quantity: 2,
                        },
                      },
                      Status: 'InProgress',
                    },
                  },
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              flushMock.done();
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request over bad gateway when both caches have an error', () => {
        const keycdnError = {
          description: 'Unauthorized',
          status: 'error',
        };

        keycdnAPIMock
          .delete('/zones/purgeurl/1.json', {
            urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', `Basic ${Buffer.from('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);
        fasterizeAPIMock
          .delete('/v1/configs/42/cache', {
            url: 'https://test-domain.com/image1.png',
          })
          .matchHeader('content-type', 'application/json')
          .matchHeader('authorization', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');
        flushMock
          .intercept('/image1.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error')
          .intercept('/image2.png', 'PURGE')
          .matchHeader('accept', 'application/json')
          .matchHeader('Fastly-Key', 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
          .replyWithError('connection error');
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>2</Quantity>' +
              '<Items><Path>/image1.png</Path><Path>/image2.png</Path>' +
              '</Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .times(4)
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              keycdn: {
                authorizationToken: 'sk_prod_XXX',
                zoneID: '1',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              fasterize: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: '42',
                urls: ['https://test-domain.com/image1.png'],
              },
              fastly: {
                authorizationToken: 'U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
              cloudfront: {
                awsAccessKeyID: 'access key ID',
                awsSecretAccessKey: 'secret access key',
                zoneID: 'abcd',
                urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
              },
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
                cloudfront: {
                  message: 'An error occurred while accessing cloudfront API: connection error',
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              keycdnAPIMock.done();
              fasterizeAPIMock.done();
              flushMock.done();
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });
    });
  });
});

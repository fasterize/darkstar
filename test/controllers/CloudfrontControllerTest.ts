import * as Lab from '@hapi/lab';
export const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

import * as request from 'supertest';
import * as nock from 'nock';
import * as sinon from 'sinon';
import { expect } from '@hapi/code';

import { server } from '../../src/darkstar';

describe('/v1/caches/cloudfront', () => {
  let cloudfrontAPIMock: nock.Scope;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    cloudfrontAPIMock = nock('https://cloudfront.amazonaws.com')
      .replyContentLength()
      .defaultReplyHeaders({ 'Content-Type': 'text/xml' });
    sandbox.stub(Date, 'now').returns(0);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/cloudfront/zones/abcd')
          .set('accept', 'application/json');
      });

      it('should flush a complete zone of the Cloudfront cache', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/*</Path></Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            200,
            `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd` +
              `</Id><Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch>` +
              `<Paths><Quantity>1</Quantity><Items><Path>/*</Path></Items></Paths><CallerReference>` +
              `${Date.now().toString()}</CallerReference></InvalidationBatch></Invalidation>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
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
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        cloudfrontAPIMock.post('/2019-03-26/distribution/abcd/invalidation').times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({})
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect({
              message: 'child "awsAccessKeyID" fails because ["awsAccessKeyID" is required]',
              validation: { source: 'payload', keys: ['awsAccessKeyID'] },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Cloudfront cache client errors', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/*</Path></Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            404,
            `<?xml version="1.0"?>\n<ErrorResponse xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Error>` +
              `<Type>Sender</Type><Code>NoSuchDistribution</Code><Message>The specified distribution does not exist.` +
              `</Message></Error><RequestId>3dc42481-adf8-11e9-8aba-4165f96cf39b</RequestId></ErrorResponse>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect(res => {
              expect(res.body).to.include({
                message: 'A remote error occurred',
                remoteStatusCode: 404,
              });
              expect(res.body.remoteResponse).to.include({
                code: 'NoSuchDistribution',
                message: 'The specified distribution does not exist.',
                retryable: false,
                statusCode: 404,
              });
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Cloudfront cache server errors', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/*</Path></Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .times(4)
          .reply(
            500,
            `<?xml version="1.0"?>\n<ErrorResponse xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Error>` +
              `<Type>Sender</Type><Code>ServiceUnavailable</Code><Message>Internal server error</Message></Error>` +
              `<RequestId>3dc42481-adf8-11e9-8aba-4165f96cf39b</RequestId></ErrorResponse>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect(res => {
              expect(res.body).to.include({
                message: 'A remote error occurred',
                remoteStatusCode: 500,
              });
              expect(res.body.remoteResponse).to.include({
                code: 'ServiceUnavailable',
                message: 'Internal server error',
                retryable: true,
                statusCode: 500,
              });
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Cloudfront API', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/*</Path></Items></Paths><CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .times(4)
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing cloudfront API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });
    });
  });

  describe('/zones/${distribution_id}/urls', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;

      beforeEach(() => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/cloudfront/zones/abcd/urls')
          .set('accept', 'application/json');
      });

      it('should flush a URL of the Cloudfront cache', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/image.png</Path></Items></Paths>' +
              '<CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            200,
            `<?xml version="1.0"?>\n<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Id>abcd` +
              `</Id><Status>InProgress</Status><CreateTime>2019-07-24T08:47:53.726Z</CreateTime><InvalidationBatch>` +
              `<Paths><Quantity>1</Quantity><Items><Path>/image.png</Path></Items></Paths>` +
              `<CallerReference>${Date.now().toString()}</CallerReference></InvalidationBatch></Invalidation>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
              remoteStatusCode: 200,
              remoteResponse: {
                Invalidation: {
                  CreateTime: '2019-07-24T08:47:53.726Z',
                  Id: 'abcd',
                  InvalidationBatch: {
                    CallerReference: '0',
                    Paths: {
                      Items: ['/image.png'],
                      Quantity: 1,
                    },
                  },
                  Status: 'InProgress',
                },
              },
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should flush more than 1 URL of the Cloudfront cache', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
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
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
              urls: ['https://test-domain.com/image1.png', 'https://test-domain.com/image2.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(200)
            .expect({
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
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply "Bad request" when invalid payload is sent', () => {
        cloudfrontAPIMock.post('/2019-03-26/distribution/abcd/invalidation').times(0);

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
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
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad request when receiving Cloudfront cache client errors', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/image.png</Path></Items></Paths>' +
              '<CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .reply(
            404,
            `<?xml version="1.0"?>\n<ErrorResponse xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Error>` +
              `<Type>Sender</Type><Code>NoSuchDistribution</Code><Message>The specified distribution does not exist.` +
              `</Message></Error><RequestId>3dc42481-adf8-11e9-8aba-4165f96cf39b</RequestId></ErrorResponse>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(400)
            .expect(res => {
              expect(res.body).to.include({
                message: 'A remote error occurred',
                remoteStatusCode: 404,
              });
              expect(res.body.remoteResponse).to.include({
                code: 'NoSuchDistribution',
                message: 'The specified distribution does not exist.',
                retryable: false,
                statusCode: 404,
              });
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when receiving Cloudfront cache server errors', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/image.png</Path></Items></Paths>' +
              '<CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .times(4)
          .reply(
            500,
            `<?xml version="1.0"?>\n<ErrorResponse xmlns="http://cloudfront.amazonaws.com/doc/2018-11-05/"><Error>` +
              `<Type>Sender</Type><Code>ServiceUnavailable</Code><Message>Internal server error</Message></Error>` +
              `<RequestId>3dc42481-adf8-11e9-8aba-4165f96cf39b</RequestId></ErrorResponse>`
          );

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect(res => {
              expect(res.body).to.include({
                message: 'A remote error occurred',
                remoteStatusCode: 500,
              });
              expect(res.body.remoteResponse).to.include({
                code: 'ServiceUnavailable',
                message: 'Internal server error',
                retryable: true,
                statusCode: 500,
              });
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });

      it('should reply bad gateway when an error occurred while accessing Cloudfront API', () => {
        cloudfrontAPIMock
          .post(
            '/2019-03-26/distribution/abcd/invalidation',
            '<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2019-03-26/"><Paths><Quantity>1</Quantity>' +
              '<Items><Path>/image.png</Path></Items></Paths>' +
              '<CallerReference>0</CallerReference></InvalidationBatch>'
          )
          .times(4)
          .replyWithError('connection error');

        return new Promise((resolve, reject) => {
          flushRequest
            .send({
              awsAccessKeyID: 'access key ID',
              awsSecretAccessKey: 'secret access key',
              urls: ['https://test-domain.com/image.png'],
            })
            .expect('content-type', /application\/json/)
            .expect(502)
            .expect({
              message: 'An error occurred while accessing cloudfront API: connection error',
            })
            .end((error: any, _: request.Response) => {
              if (error) {
                reject(error);
              }
              cloudfrontAPIMock.done();
              resolve();
            });
        });
      });
    });
  });
});

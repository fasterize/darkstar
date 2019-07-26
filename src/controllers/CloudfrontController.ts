import * as Hapi from 'hapi';
import * as Joi from 'joi';
import * as Boom from 'boom';
import CacheController from './CacheController';
import { buildErrorResponse, cleanupError } from '../lib/ResponseBuilder';
import * as cloudfront from '../lib/cloudfront';
import { ServiceResponse } from '../lib/service';
import IMap from '../lib/IMap';

export default class CloudfrontController implements CacheController {
  public get flushZoneConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache', 'cloudfront'],
      description: 'Flush Cloudfront cache',
      validate: {
        params: this.paramsSchema,
        payload: this.payloadSchema,
        failAction: (_: Hapi.Request, __: Hapi.ResponseToolkit, error: Boom): Hapi.ResponseObject => {
          throw cleanupError(error);
        },
      },
      plugins: { 'hapi-swagger': { responses: this.responsesSchema } },
    };
  }

  public async flushZone(request: Hapi.Request, _: Hapi.ResponseToolkit) {
    try {
      const response: ServiceResponse = await cloudfront.flushDistribution(
        request.params['zone_id'],
        (request.payload as IMap<string>)['awsAccessKeyID'],
        (request.payload as IMap<string>)['awsSecretAccessKey']
      );
      return { remoteStatusCode: 200, remoteResponse: response.body };
    } catch (error) {
      throw buildErrorResponse(error, 'cloudfront');
    }
  }

  public get flushURLsConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushURLs.bind(this),
      tags: ['api', 'cache', 'cloudfront'],
      description: 'Flush Cloudfront cache URL',
      validate: {
        params: this.paramsSchema,
        payload: this.payloadSchema.keys({
          urls: Joi.array()
            .items(
              Joi.string().uri({
                scheme: ['http', 'https'],
              })
            )
            .min(1)
            .required(),
        }),
        failAction: (_: Hapi.Request, __: Hapi.ResponseToolkit, error: Boom): Hapi.ResponseObject => {
          throw cleanupError(error);
        },
      },
      plugins: { 'hapi-swagger': { responses: this.responsesSchema } },
    };
  }

  public async flushURLs(request: Hapi.Request, _: Hapi.ResponseToolkit) {
    try {
      const response: ServiceResponse = await cloudfront.flushURLs(
        request.params['zone_id'],
        (request.payload as IMap<string[]>)['urls'],
        (request.payload as IMap<string>)['awsAccessKeyID'],
        (request.payload as IMap<string>)['awsSecretAccessKey']
      );
      return { remoteStatusCode: 200, remoteResponse: response.body };
    } catch (error) {
      throw buildErrorResponse(error, 'cloudfront');
    }
  }

  public get key() {
    return 'cloudfront';
  }

  public get responsesSchema(): any {
    return {
      200: {
        description: 'Cloudfront cache flushed',
        schema: Joi.object({
          statusCode: Joi.number().valid(200),
          remoteResponse: Joi.object({
            Invalidation: Joi.object({
              Id: Joi.string().example('abcd'),
              Status: Joi.string().example('InProgress'),
              CreateTime: Joi.date(),
              InvalidationBatch: Joi.object({
                Paths: Joi.array(),
                CallerReference: Joi.string(),
              }),
            }),
          }),
        }),
      },
      400: {
        description: 'Bad Request',
        schema: Joi.object({
          statusCode: Joi.number().valid(400),
          error: Joi.string().example('Bad Request'),
          remoteResponse: Joi.object({
            code: Joi.number()
              .min(400)
              .max(499)
              .example(401),
            message: Joi.string().example('The authorization token is invalid'),
            status: Joi.string().example('Unauthorized'),
          }),
        }),
      },
      502: {
        description: 'Bad Gateway',
        schema: Joi.object({
          statusCode: Joi.number().valid(502),
          error: Joi.string().example('Bad Gateway'),
          remoteResponse: Joi.object({
            code: Joi.number()
              .min(500)
              .max(599)
              .example(500),
            message: Joi.string().example('An error occurred while flushing the cache'),
            status: Joi.string().example('Internal Server Error'),
          }),
        }),
      },
    };
  }

  public get paramsSchema(): IMap<Joi.Schema> {
    return {
      zone_id: Joi.string()
        .required()
        .example('abcd')
        .description('Cloudfront distribution ID to flush'),
    };
  }

  public get payloadSchema(): Joi.ObjectSchema {
    return Joi.object().keys({
      awsAccessKeyID: Joi.string()
        .required()
        .example('xxx')
        .description('AWS access key ID'),
      awsSecretAccessKey: Joi.string()
        .required()
        .example('xxx')
        .description('AWS secret access key'),
    });
  }
}

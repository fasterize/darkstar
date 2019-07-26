import * as Hapi from 'hapi';
import * as Joi from 'joi';
import * as Boom from 'boom';
import CacheController from './CacheController';
import { cleanupError, buildErrorResponse } from '../lib/ResponseBuilder';
import * as fastly from '../lib/fastly';
import IMap from '../lib/IMap';
import { ServiceResponse } from '../lib/service';

export default class FastlyController implements CacheController {
  public get flushZoneConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache', 'fastly'],
      description: 'Flush Fastly cache',
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
      const response: ServiceResponse = await fastly.flushService(
        request.params['zone_id'],
        (request.payload as IMap<string>)['authorizationToken']
      );
      return { remoteStatusCode: 200, remoteResponse: response.body };
    } catch (error) {
      throw buildErrorResponse(error, 'fastly');
    }
  }

  public get flushURLsConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushURLs.bind(this),
      tags: ['api', 'cache', 'fastly'],
      description: 'Flush Fastly cache URL',
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
      await Promise.all(
        (request.payload as IMap<string[]>)['urls'].map((url: string) => {
          return fastly.flushURL(url, (request.payload as IMap<string>)['authorizationToken']);
        })
      );
      return { remoteStatusCode: 200, remoteResponse: { status: 'ok' } };
    } catch (error) {
      throw buildErrorResponse(error, 'fastly');
    }
  }

  public get key() {
    return 'fastly';
  }

  public get responsesSchema(): any {
    return {
      200: {
        description: 'Fastly cache flushed',
        schema: Joi.object({
          statusCode: Joi.number().valid(200),
          remoteResponse: Joi.object({ success: Joi.boolean().valid(true) }),
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
        .description('Fastly Service to flush'),
    };
  }

  public get payloadSchema(): Joi.ObjectSchema {
    return Joi.object().keys({
      authorizationToken: Joi.string()
        .required()
        .example('U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
        .description('Fastly API Key'),
    });
  }
}

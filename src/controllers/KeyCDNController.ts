import * as Hapi from 'hapi';
import * as Joi from 'joi';
import * as Boom from 'boom';
import ICacheController from './CacheController';
import { cleanupError, buildErrorResponse } from '../lib/ResponseBuilder';
import * as keycdn from '../lib/keycdn';
import IMap from '../lib/IMap';
import { ServiceResponse } from '../lib/service';

// KeyCDN API documentation: https://www.keycdn.com/api
export default class KeyCDNController implements ICacheController {
  public get key() {
    return 'keycdn';
  }

  public get flushZoneConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache', 'keycdn'],
      description: 'Flush KeyCDN cache zone',
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
      const response: ServiceResponse = await keycdn.flushZone(
        request.params['zone_id'],
        (request.payload as IMap<string>)['authorizationToken']
      );
      return { remoteStatusCode: 200, remoteResponse: response.body };
    } catch (error) {
      throw buildErrorResponse(error, 'keycdn');
    }
  }

  public get flushURLsConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushURLs.bind(this),
      tags: ['api', 'cache', 'keycdn'],
      description: 'Flush KeyCDN cache URL',
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
      const response: ServiceResponse = await keycdn.flushURLs(
        request.params['zone_id'],
        (request.payload as IMap<string[]>)['urls'],
        (request.payload as IMap<string>)['authorizationToken']
      );
      return { remoteStatusCode: 200, remoteResponse: response.body };
    } catch (error) {
      throw buildErrorResponse(error, 'keycdn');
    }
  }

  public get responsesSchema(): any {
    return {
      200: {
        description: 'KeyCDN cache flushed',
        schema: Joi.object({
          statusCode: Joi.number().valid(200),
          remoteResponse: Joi.object({
            status: Joi.string().example('success'),
            description: Joi.string().example('Cache has been cleared for zone 1.'),
          }),
        }),
      },
      400: {
        description: 'Bad Request',
        schema: Joi.object({
          statusCode: Joi.number().valid(400),
          error: Joi.string().example('Bad Request'),
          remoteResponse: Joi.object({
            description: Joi.string().example('Unauthorized'),
            status: Joi.string().example('error'),
          }),
        }),
      },
      502: {
        description: 'Bad Gateway',
        schema: Joi.object({
          statusCode: Joi.number().valid(502),
          error: Joi.string().example('Bad Gateway'),
          remoteResponse: Joi.object({
            description: Joi.string().example('An error occurred while flushing the cached'),
            status: Joi.string().example('error'),
          }),
        }),
      },
    };
  }

  public get paramsSchema(): IMap<Joi.Schema> {
    return {
      zone_id: Joi.string()
        .required()
        .example('42')
        .label('KeyCDN zone ID to flush'),
    };
  }

  public get payloadSchema(): Joi.ObjectSchema {
    return Joi.object().keys({
      authorizationToken: Joi.string()
        .required()
        .example('sk_prod_XXX')
        .description('KeyCDN API Key'),
    });
  }
}

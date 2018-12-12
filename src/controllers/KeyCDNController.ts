import * as Hapi from 'hapi';
import * as Joi from 'joi';
import * as http from 'superagent';
import * as Boom from 'boom';
import ICacheController from './CacheController';
import ResponseBuilder from '../lib/ResponseBuilder';
import * as keycdn from '../lib/keycdn';
import IMap from '../lib/IMap';

// KeyCDN API documentation: https://www.keycdn.com/api
export default class KeyCDNController implements ICacheController {
  public get key() {
    return 'keycdn';
  }

  public get flushZoneConfig(): Hapi.IRouteAdditionalConfigurationOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache', 'keycdn'],
      description: 'Flush KeyCDN cache zone',
      validate: {
        params: this.paramsSchema,
        payload: this.payloadSchema,
        failAction: (request: Hapi.Request, reply: Hapi.IReply, source: string, error: Boom.BoomError) => {
          reply(ResponseBuilder.cleanupError(error));
        },
      },
      plugins: { 'hapi-swagger': { responses: this.responsesSchema } },
    };
  }

  public flushZone(request: Hapi.Request, reply: Hapi.IReply) {
    // tslint:disable-next-line:no-string-literal
    keycdn.flushZone(request.params['zone_id'], request.payload['authorizationToken'])
      .then((response: http.Response) => {
        reply({ remoteStatusCode: 200, remoteResponse: response.body })
          .code(response.status);
      })
      .catch((error: any) => {
        reply(ResponseBuilder.buildErrorResponse(error, 'keycdn'));
      });
  }

  public get flushURLsConfig(): Hapi.IRouteAdditionalConfigurationOptions {
    return {
      handler: this.flushURLs.bind(this),
      tags: ['api', 'cache', 'keycdn'],
      description: 'Flush KeyCDN cache URL',
      validate: {
        params: this.paramsSchema,
        payload: this.payloadSchema.keys({
          urls: Joi.array().items(Joi.string().uri({
            scheme: [
              'http',
              'https',
            ]
          })).min(1).required()
        }),
        failAction: (request: Hapi.Request, reply: Hapi.IReply, source: string, error: Boom.BoomError) => {
          reply(ResponseBuilder.cleanupError(error));
        },
      },
      plugins: { 'hapi-swagger': { responses: this.responsesSchema } },
    };
  }

  public flushURLs(request: Hapi.Request, reply: Hapi.IReply) {
    // tslint:disable-next-line:no-string-literal
    keycdn.flushURLs(request.params['zone_id'], request.payload['urls'], request.payload['authorizationToken'])
      .then((response: http.Response) => {
        reply({ remoteStatusCode: 200, remoteResponse: response.body })
          .code(response.status);
      })
      .catch((error: any) => {
        reply(ResponseBuilder.buildErrorResponse(error, 'keycdn'));
      });
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

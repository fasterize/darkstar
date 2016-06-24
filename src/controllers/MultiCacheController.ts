import * as Hapi from 'hapi';
import * as Joi from 'joi';
import * as http from 'superagent';
import * as Promise from 'bluebird';
import * as Boom from 'boom';
import ResponseBuilder from '../lib/ResponseBuilder';
import CacheController from './CacheController';
import * as keycdn from '../lib/keycdn';
import * as fasterize from '../lib/fasterize';
import IMap from '../lib/IMap';

export default class MultiCacheController {
  public getFlushZoneConfig(cacheControllers: CacheController[]): Hapi.IRouteAdditionalConfigurationOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache'],
      description: 'Flush multiple caches',
      validate: {
        payload: this.getPayloadRequestSchema(cacheControllers),
        failAction: (request: Hapi.Request, reply: Hapi.IReply, source: string, error: Boom.BoomError) => {
          reply(ResponseBuilder.cleanupError(error));
        },
      },
      plugins: {
        'hapi-swagger': {
          responses: {
            '200': {
              description: 'All caches have been flushed',
              schema: this.getSuccessResponseSchema(cacheControllers),
            },
            '400': {
              description: 'Bad Request',
              schema: this.getBadRequestResponseSchema(cacheControllers),
            },
            '502': {
              description: 'Bad Gateway',
              schema: this.getBadGatewayResponseSchema(cacheControllers),
            },
          },
        },
      },
    };
  }

  public flushZone(request: Hapi.Request, reply: Hapi.IReply) {
    const actions: IMap<any> = {};
    // tslint:disable:no-string-literal
    if (request.payload['keycdn']) {
      actions['keycdn'] = keycdn.flushZone(request.payload['keycdn']['zoneID'],
                                           request.payload['keycdn']['authorizationToken'])
        .reflect();
    }

    if (request.payload['fasterize']) {
      actions['fasterize'] = fasterize.flushConfig(request.payload['fasterize']['zoneID'],
                                                   request.payload['fasterize']['authorizationToken'])
        .reflect();
    }

    const flushResponses: Promise<Object> = Promise.props(actions);

    flushResponses.then((info: IMap<Promise.Inspection<http.Response>>) => {
      let statusCode = 200;
      const result: IMap<any> = {
        status: {},
      };

      for (let key in info) {
        if (info[key].isFulfilled()) {
          const response: http.Response = info[key].value();

          result['status'][key] = {
            remoteStatusCode: 200,
            remoteResponse: response.body,
          };
        } else {
          const error = info[key].reason();
          const responseError: Boom.BoomError = ResponseBuilder.buildErrorResponse(error, key);

          result['message'] = 'A remote error occurred on one of the caches to flush';
          result['status'][key] = responseError.output.payload;

          if (statusCode === 200 || statusCode >= 500) {
            statusCode = responseError.output.statusCode;
          }
        }
      }

      reply(result).code(statusCode);
    });
  }

  private getPayloadRequestSchema(cacheControllers: CacheController[]) {
    const schema: any = {};

    for (let cacheController of cacheControllers) {
      const config: Hapi.IRouteAdditionalConfigurationOptions = cacheController.flushZoneConfig;
      const paramsSchema: any = config.validate.params;
      const payloadSchema: any = config.validate.payload;

      schema[cacheController.key] = payloadSchema.concat(Joi.object({ zoneID: paramsSchema['zone_id'] }));
    }

    return Joi.object(schema).min(1);
  }

  private getSuccessResponseSchema(cacheControllers: CacheController[]) {
    const schema: any = {};

    for (let cacheController of cacheControllers) {
      const responsesSchema: IMap<{schema: Joi.Schema}> = cacheController.responsesSchema;
      schema[cacheController.key] = responsesSchema['200'].schema;
    }

    return Joi.object({
      statusCode: Joi.number().valid(200),
      status: Joi.object(schema),
    });
  }

  private getBadRequestResponseSchema(cacheControllers: CacheController[]) {
    const schema: IMap<Joi.Schema> = {};

    for (let cacheController of cacheControllers) {
      const responsesSchema: IMap<{schema: Joi.Schema}> = cacheController.responsesSchema;
      schema[cacheController.key] = Joi.alternatives([
        responsesSchema['400'].schema,
        responsesSchema['200'].schema,
        responsesSchema['502'].schema,
      ]);
    }

    return Joi.object({
      statusCode: Joi.number().valid(400),
      error: Joi.string().example('Bad Request'),
      status: Joi.object(schema),
    });
  }

  private getBadGatewayResponseSchema(cacheControllers: CacheController[]) {
    const schema: any = {};

    for (let cacheController of cacheControllers) {
      const responsesSchema: IMap<{schema: Joi.Schema}> = cacheController.responsesSchema;
      schema[cacheController.key] = Joi.alternatives([
        responsesSchema['502'].schema,
        responsesSchema['200'].schema,
        responsesSchema['400'].schema,
      ]);
    }

    return Joi.object({
      statusCode: Joi.number().valid(502),
      error: Joi.string().example('Bad Gateway'),
      status: Joi.object(schema),
    });
  }
}

import * as bluebird from 'bluebird';
import * as Boom from 'boom';
import * as Hapi from 'hapi';
import * as Joi from 'joi';
import * as cloudfront from '../lib/cloudfront';
import * as fasterize from '../lib/fasterize';
import * as fastly from '../lib/fastly';
import IMap from '../lib/IMap';
import * as incapsula from '../lib/incapsula';
import * as keycdn from '../lib/keycdn';
import { buildErrorResponse, cleanupError } from '../lib/ResponseBuilder';
import { ServiceResponse } from '../lib/service';
import CacheController from './CacheController';

export default class MultiCacheController {
  public getFlushZoneConfig(cacheControllers: CacheController[]): Hapi.RouteOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache'],
      description: 'Flush multiple caches',
      validate: {
        payload: this.getPayloadRequestSchema(cacheControllers, 'flushZoneConfig'),
        failAction: (_: Hapi.Request, __: Hapi.ResponseToolkit, error: Boom): Hapi.ResponseObject => {
          throw cleanupError(error);
        },
      },
      plugins: {
        'hapi-swagger': {
          responses: {
            200: {
              description: 'All caches have been flushed',
              schema: this.getSuccessResponseSchema(cacheControllers),
            },
            400: {
              description: 'Bad Request',
              schema: this.getBadRequestResponseSchema(cacheControllers),
            },
            502: {
              description: 'Bad Gateway',
              schema: this.getBadGatewayResponseSchema(cacheControllers),
            },
          },
        },
      },
    };
  }

  public async flushZone(request: Hapi.Request, handler: Hapi.ResponseToolkit) {
    const actions: IMap<any> = {};
    if ((request.payload as IMap<IMap<string>>)['keycdn']) {
      actions['keycdn'] = keycdn
        .flushZone(
          (request.payload as IMap<IMap<string>>)['keycdn']['zoneID'],
          (request.payload as IMap<IMap<string>>)['keycdn']['authorizationToken']
        )
        .reflect();
    }

    if ((request.payload as IMap<IMap<string>>)['fasterize']) {
      actions['fasterize'] = fasterize
        .flushConfig(
          (request.payload as IMap<IMap<string>>)['fasterize']['zoneID'],
          (request.payload as IMap<IMap<string>>)['fasterize']['authorizationToken']
        )
        .reflect();
    }

    if ((request.payload as IMap<IMap<string>>)['fastly']) {
      actions['fastly'] = fastly
        .flushService(
          (request.payload as IMap<IMap<string>>)['fastly']['zoneID'],
          (request.payload as IMap<IMap<string>>)['fastly']['authorizationToken']
        )
        .reflect();
    }

    if ((request.payload as IMap<IMap<string>>)['cloudfront']) {
      actions['cloudfront'] = cloudfront
        .flushDistribution(
          (request.payload as IMap<IMap<string>>)['cloudfront']['zoneID'],
          (request.payload as IMap<IMap<string>>)['cloudfront']['awsAccessKeyID'],
          (request.payload as IMap<IMap<string>>)['cloudfront']['awsSecretAccessKey']
        )
        .reflect();
    }

    if ((request.payload as IMap<IMap<string>>)['incapsula']) {
      actions['incapsula'] = incapsula
        .flushSite(
          (request.payload as IMap<IMap<string>>)['incapsula']['zoneID'],
          (request.payload as IMap<IMap<string>>)['incapsula']['incapsulaApiID'],
          (request.payload as IMap<IMap<string>>)['incapsula']['incapsulaApiKey']
        )
        .reflect();
    }

    return this.execAll(actions, handler);
  }

  public getFlushURLsConfig(cacheControllers: CacheController[]): Hapi.RouteOptions {
    return {
      handler: this.flushURLs.bind(this),
      tags: ['api', 'cache'],
      description: 'Flush multiple caches',
      validate: {
        payload: this.getPayloadRequestSchema(cacheControllers, 'flushURLsConfig'),
        failAction: (_: Hapi.Request, __: Hapi.ResponseToolkit, error: Boom): Hapi.ResponseObject => {
          throw cleanupError(error);
        },
      },
      plugins: {
        'hapi-swagger': {
          responses: {
            200: {
              description: 'All caches have been flushed',
              schema: this.getSuccessResponseSchema(cacheControllers),
            },
            400: {
              description: 'Bad Request',
              schema: this.getBadRequestResponseSchema(cacheControllers),
            },
            502: {
              description: 'Bad Gateway',
              schema: this.getBadGatewayResponseSchema(cacheControllers),
            },
          },
        },
      },
    };
  }

  public async flushURLs(request: Hapi.Request, handler: Hapi.ResponseToolkit) {
    const actions: IMap<any> = {};
    if ((request.payload as IMap<string>)['keycdn']) {
      actions['keycdn'] = keycdn
        .flushURLs(
          (request.payload as IMap<IMap<string>>)['keycdn']['zoneID'],
          (request.payload as IMap<IMap<string[]>>)['keycdn']['urls'],
          (request.payload as IMap<IMap<string>>)['keycdn']['authorizationToken']
        )
        .reflect();
    }

    if ((request.payload as IMap<IMap<string>>)['fasterize']) {
      actions['fasterize'] = bluebird
        .all(
          (request.payload as IMap<IMap<string[]>>)['fasterize']['urls'].map((url: string) => {
            return fasterize.flushURL(
              (request.payload as IMap<IMap<string>>)['fasterize']['zoneID'],
              url,
              (request.payload as IMap<IMap<string>>)['fasterize']['authorizationToken']
            );
          })
        )
        .then((responses: any[]) => {
          return responses[0];
        })
        .reflect();
    }

    if ((request.payload as IMap<IMap<string>>)['fastly']) {
      actions['fastly'] = bluebird
        .all(
          (request.payload as IMap<IMap<string[]>>)['fastly']['urls'].map((url: string) => {
            return fastly.flushURL(url, (request.payload as IMap<IMap<string>>)['fastly']['authorizationToken']);
          })
        )
        .then((responses: any[]) => {
          return responses[0];
        })
        .reflect();
    }

    if ((request.payload as IMap<string>)['cloudfront']) {
      actions['cloudfront'] = cloudfront
        .flushURLs(
          (request.payload as IMap<IMap<string>>)['cloudfront']['zoneID'],
          (request.payload as IMap<IMap<string[]>>)['cloudfront']['urls'],
          (request.payload as IMap<IMap<string>>)['cloudfront']['awsAccessKeyID'],
          (request.payload as IMap<IMap<string>>)['cloudfront']['awsSecretAccessKey']
        )
        .reflect();
    }

    if ((request.payload as IMap<IMap<string>>)['incapsula']) {
      actions['incapsula'] = bluebird
        .all(
          (request.payload as IMap<IMap<string[]>>)['incapsula']['urls'].map((url: string) => {
            return incapsula.flushURL(
              (request.payload as IMap<IMap<string>>)['incapsula']['zoneID'],
              url,
              (request.payload as IMap<IMap<string>>)['incapsula']['incapsulaApiID'],
              (request.payload as IMap<IMap<string>>)['incapsula']['incapsulaApiKey']
            );
          })
        )
        .then((responses: any[]) => {
          return responses[0];
        })
        .reflect();
    }

    return this.execAll(actions, handler);
  }

  private async execAll(actions: IMap<any>, handler: Hapi.ResponseToolkit) {
    const info: IMap<bluebird.Inspection<ServiceResponse>> = await bluebird.props(actions);
    let statusCode = 200;
    const result: IMap<any> = {
      status: {},
    };

    for (const key in info) {
      if (info[key].isFulfilled()) {
        const response: ServiceResponse = info[key].value();

        result['status'][key] = {
          remoteStatusCode: 200,
          remoteResponse: response.body,
        };
      } else {
        const error = info[key].reason();
        const responseError: Boom = buildErrorResponse(error, key);

        result['message'] = 'A remote error occurred on one of the caches to flush';
        result['status'][key] = responseError.output.payload;

        if (statusCode === 200 || statusCode >= 500) {
          statusCode = responseError.output.statusCode;
        }
      }
    }

    return handler.response(result).code(statusCode);
  }

  private getPayloadRequestSchema(cacheControllers: CacheController[], configMethodName: string) {
    const schema: any = {};

    for (const cacheController of cacheControllers) {
      const config: Hapi.RouteOptions = (cacheController as any)[configMethodName] as Hapi.RouteOptions;
      const paramsSchema: any = config.validate.params;
      const payloadSchema: any = config.validate.payload;

      schema[cacheController.key] = payloadSchema.concat(Joi.object({ zoneID: paramsSchema['zone_id'] }));
    }

    return Joi.object(schema).min(1);
  }

  private getSuccessResponseSchema(cacheControllers: CacheController[]) {
    const schema: any = {};

    for (const cacheController of cacheControllers) {
      const responsesSchema: IMap<{ schema: Joi.Schema }> = cacheController.responsesSchema;
      schema[cacheController.key] = responsesSchema['200'].schema;
    }

    return Joi.object({
      statusCode: Joi.number().valid(200),
      status: Joi.object(schema),
    });
  }

  private getBadRequestResponseSchema(cacheControllers: CacheController[]) {
    const schema: IMap<Joi.Schema> = {};

    for (const cacheController of cacheControllers) {
      const responsesSchema: IMap<{ schema: Joi.Schema }> = cacheController.responsesSchema;
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

    for (const cacheController of cacheControllers) {
      const responsesSchema: IMap<{ schema: Joi.Schema }> = cacheController.responsesSchema;
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

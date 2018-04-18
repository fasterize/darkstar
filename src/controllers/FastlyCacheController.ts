import * as Hapi from 'hapi';
import * as Joi from 'joi';
import * as http from 'superagent';
import * as Boom from 'boom';
import CacheController from './CacheController';
import ResponseBuilder from '../lib/ResponseBuilder';
import * as fastly from '../lib/fastly';
import IMap from '../lib/IMap';

export default class FastlyCacheController implements CacheController {
  public get flushZoneConfig(): Hapi.IRouteAdditionalConfigurationOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache', 'fastly'],
      description: 'Flush Fastly cache',
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
    fastly.flushService(request.params['zone_id'], request.payload['authorizationToken'])
      .then((response: http.Response) => {
        reply({ remoteStatusCode: 200, remoteResponse: response.body })
          .code(response.status);
      })
      .catch((error: any) => {
        reply(ResponseBuilder.buildErrorResponse(error, 'fastly'));
      });
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
            code: Joi.number().min(400).max(499).example(401),
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
            code: Joi.number().min(500).max(599).example(500),
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

  public get payloadSchema(): Joi.Schema {
    return Joi.object({
      authorizationToken: Joi.string()
        .required()
        .example('U2FsdGVkX18D8TD+GD3REqc8cdjRikR6socyNOVSrN0=')
        .description('Fastly API Key'),
    });
  }
}

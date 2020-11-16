import * as Boom from 'boom';
import * as Hapi from 'hapi';
import * as Joi from 'joi';
import IMap from '../lib/IMap';
import * as incapsula from '../lib/incapsula';
import { buildErrorResponse, cleanupError } from '../lib/ResponseBuilder';
import { ServiceResponse } from '../lib/service';
import CacheController from './CacheController';

export default class IncapsulaController implements CacheController {
  public get flushZoneConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushZone.bind(this),
      tags: ['api', 'cache', 'incapsula'],
      description: 'Flush Incapsula cache',
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
      const response: ServiceResponse = await incapsula.flushSite(
        request.params['zone_id'],
        (request.payload as IMap<string>)['incapsulaApiID'],
        (request.payload as IMap<string>)['incapsulaApiKey']
      );
      return { remoteStatusCode: 200, remoteResponse: response.body };
    } catch (error) {
      throw buildErrorResponse(error, 'incapsula');
    }
  }

  public get flushURLsConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushURLs.bind(this),
      tags: ['api', 'cache', 'incapsula'],
      description: 'Flush Incapsula cache URL',
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
          return incapsula.flushURL(
            (request.params as IMap<string>)['zone_id'],
            url,
            (request.payload as IMap<string>)['incapsulaApiID'],
            (request.payload as IMap<string>)['incapsulaApiKey']
          );
        })
      );
      return { remoteStatusCode: 200, remoteResponse: { status: 'ok' } };
    } catch (error) {
      throw buildErrorResponse(error, 'incapsula');
    }
  }

  public get flushDirectoriesConfig(): Hapi.RouteOptions {
    return {
      handler: this.flushDirectories.bind(this),
      tags: ['api', 'cache', 'incapsula'],
      description: 'Flush Incapsula cache by directory',
      validate: {
        params: this.paramsSchema,
        payload: this.payloadSchema.keys({
          directories: Joi.array()
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

  public async flushDirectories(request: Hapi.Request, _: Hapi.ResponseToolkit) {
    try {
      await Promise.all(
        (request.payload as IMap<string[]>)['directories'].map((directory: string) => {
          return incapsula.flushDirectory(
            (request.params as IMap<string>)['zone_id'],
            directory,
            (request.payload as IMap<string>)['incapsulaApiID'],
            (request.payload as IMap<string>)['incapsulaApiKey']
          );
        })
      );
      return { remoteStatusCode: 200, remoteResponse: { status: 'ok' } };
    } catch (error) {
      throw buildErrorResponse(error, 'incapsula');
    }
  }

  public get responsesSchema(): any {
    return {
      200: {
        description: 'Incapsula cache flushed',
        schema: Joi.object({
          remoteStatusCode: Joi.number().valid(200),
          remoteResponse: Joi.object({
            res: Joi.number().valid(0),
            res_message: Joi.string().example('OK'),
            debug_info: Joi.object({
              id_info: Joi.string().example('13007'),
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
            code: Joi.number().example(9411),
            message: Joi.string().example('Authentication parameters missing or incorrect'),
            status: Joi.string().example('Authentication missing or invalid'),
          }),
          remoteStatusCode: Joi.number().example(403),
        }),
      },
      502: {
        description: 'Bad Gateway',
        schema: Joi.object({
          statusCode: Joi.number().valid(502),
          error: Joi.string().example('Bad Gateway'),
          remoteResponse: Joi.object({
            code: Joi.number().example(1),
            message: Joi.string().example('Unexpected error'),
            status: Joi.string().example('The server has encountered an unexpected error'),
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
        .description('Incapsula Service to flush'),
    };
  }

  public get payloadSchema(): Joi.ObjectSchema {
    return Joi.object().keys({
      incapsulaApiID: Joi.string()
        .required()
        .example('1234')
        .description('Incapsula API Key'),
      incapsulaApiKey: Joi.string()
        .required()
        .example('4321')
        .description('Incapsula API Key'),
    });
  }

  public get key() {
    return 'incapsula';
  }
}

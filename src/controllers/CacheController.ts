import * as Hapi from 'hapi';
import * as Joi from 'joi';
import IMap from '../lib/IMap';

interface ICacheController {
  flushZoneConfig: Hapi.IRouteAdditionalConfigurationOptions;
  key: string;
  responsesSchema: any;
  paramsSchema: IMap<Joi.Schema>;
  payloadSchema: Joi.Schema;
}

export default ICacheController;

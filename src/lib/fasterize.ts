import * as http from 'superagent';
import * as bluebird from 'bluebird';
import { ServiceResponse, buildServiceResponse } from './service';

const BASE_URL = 'https://api.fasterize.com';
const BASE_PATH = '/v1/configs';

export function flushConfig(configID: string, authorizationToken: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .delete(`${BASE_URL}${BASE_PATH}/${configID}/cache`)
      .accept('application/json')
      .set('authorization', authorizationToken)
  );
}

export function flushURL(configID: string, url: string, authorizationToken: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .delete(`${BASE_URL}${BASE_PATH}/${configID}/cache`)
      .send({ url })
      .type('application/json')
      .set('authorization', authorizationToken)
  );
}

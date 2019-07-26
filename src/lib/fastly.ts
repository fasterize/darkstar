import * as http from 'superagent';
import * as bluebird from 'bluebird';
import { ServiceResponse, buildServiceResponse } from '../lib/service';

const BASE_URL = 'https://api.fastly.com';

export function flushURL(url: string, authorizationToken: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http('PURGE', url)
      .accept('application/json')
      .set('Fastly-Key', authorizationToken)
  );
}

export function flushService(serviceID: string, authorizationToken: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .post(`${BASE_URL}/service/${serviceID}/purge_all`)
      .accept('application/json')
      .set('Fastly-Key', authorizationToken)
  );
}

export function flushServiceKey(serviceID: string, key: string, authorizationToken: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .post(`${BASE_URL}/service/${serviceID}/purge/${key}`)
      .accept('application/json')
      .set('Fastly-Key', authorizationToken)
  );
}

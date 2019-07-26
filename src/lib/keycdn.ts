import * as http from 'superagent';
import * as bluebird from 'bluebird';
import { ServiceResponse, buildServiceResponse } from './service';

const BASE_URL = 'https://api.keycdn.com';

export function flushZone(zoneID: string, authorizationToken: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .get(`${BASE_URL}/zones/purge/${zoneID}.json`)
      .accept('application/json')
      .auth(authorizationToken, '')
  );
}

export function flushURLs(zoneID: string, urls: string[], authorizationToken: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .delete(`${BASE_URL}/zones/purgeurl/${zoneID}.json`)
      .send({ urls })
      .type('application/json')
      .auth(authorizationToken, '')
  );
}

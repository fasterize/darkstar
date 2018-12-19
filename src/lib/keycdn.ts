import * as http from 'superagent';
import * as Promise from 'bluebird';

const BASE_URL = 'https://api.keycdn.com';

export function flushZone(zoneID: string, authorizationToken: string): Promise<http.Response> {
  const request = http
    .get(`${BASE_URL}/zones/purge/${zoneID}.json`)
    .accept('application/json')
    .auth(authorizationToken, '');

  return Promise.promisify(request.end, { context: request })();
}

export function flushURLs(zoneID: string, urls: string[], authorizationToken: string): Promise<http.Response> {
  const request = http
    .delete(`${BASE_URL}/zones/purgeurl/${zoneID}.json`)
    .send({ urls })
    .type('application/json')
    .auth(authorizationToken, '');

  return Promise.promisify(request.end, { context: request })();
}

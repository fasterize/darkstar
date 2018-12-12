import * as http from 'superagent';
import * as Promise from 'bluebird';

const BASE_URL = 'https://api.fastly.com';

export function flushURL(url: string, authorizationToken: string): Promise<http.Response> {
  const request = http('PURGE', url)
    .accept('application/json')
    .set('Fastly-Key', authorizationToken);

  return Promise.promisify(request.end, { context: request })();
}

export function flushService(serviceID: string, authorizationToken: string): Promise<http.Response> {
  const request = http
    .post(`${BASE_URL}/service/${serviceID}/purge_all`)
    .accept('application/json')
    .set('Fastly-Key', authorizationToken);

  return Promise.promisify(request.end, { context: request })();
}

export function flushServiceKey(serviceID: string, key: string, authorizationToken: string): Promise<http.Response> {
  const request = http
    .post(`${BASE_URL}/service/${serviceID}/purge/${key}`)
    .accept('application/json')
    .set('Fastly-Key', authorizationToken);

  return Promise.promisify(request.end, { context: request })();
}

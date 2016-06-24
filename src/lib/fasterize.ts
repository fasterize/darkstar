import * as http from 'superagent';
import * as Promise from 'bluebird';

const BASE_URL = 'https://api.fasterize.com';
const BASE_PATH = '/v1/configs';

export function flushConfig(configID: string, authorizationToken: string): Promise<http.Response> {
  const request = http
    .delete(`${BASE_URL}${BASE_PATH}/${configID}/cache`)
    .accept('application/json')
    .set('authorization', authorizationToken);

  return Promise.promisify(request.end, { context: request })();
}

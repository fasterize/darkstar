import * as bluebird from 'bluebird';
import * as http from 'superagent';
import { buildServiceResponse, ServiceResponse } from '../lib/service';
import urlModule = require('url');

const BASE_URL = 'https://my.incapsula.com';
const BASE_PATH = '/api/prov/v1';

export function flushSite(siteID: string, incapsulaApiID: string, incapsulaApiKey: string): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .post(
        `${BASE_URL}${BASE_PATH}/sites/cache/purge?api_id=${incapsulaApiID}&api_key=${incapsulaApiKey}&site_id=${siteID}`
      )
      .accept('application/json')
  );
}

export function flushURL(
  siteID: string,
  url: string,
  incapsulaApiID: string,
  incapsulaApiKey: string
): bluebird<ServiceResponse> {
  return buildServiceResponse(
    http
      .post(
        `${BASE_URL}${BASE_PATH}/sites/cache/purge?api_id=${incapsulaApiID}&api_key=${incapsulaApiKey}&site_id=${siteID}&resource_pattern=${encodeURIComponent(
          urlModule.parse(url).path
        )}`
      )
      .accept('application/json')
  );
}

import * as Hapi from 'hapi';
import CacheController from './controllers/CacheController';
import CloudfrontController from './controllers/CloudfrontController';
import FastlyController from './controllers/FastlyController';
import IncapsulaController from './controllers/IncapsulaController';
import KeyCDNController from './controllers/KeyCDNController';

export default function(server: Hapi.Server) {
  const cacheControllers: CacheController[] = [];

  const keyCDNController = new KeyCDNController();
  server.route({
    method: 'DELETE',
    path: '/v1/caches/keycdn/zones/{zone_id}',
    options: keyCDNController.flushZoneConfig,
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/keycdn/zones/{zone_id}/urls',
    options: keyCDNController.flushURLsConfig,
  });
  cacheControllers.push(keyCDNController);

  const fastlyController = new FastlyController();
  server.route({
    method: 'DELETE',
    path: '/v1/caches/fastly/zones/{zone_id}',
    options: fastlyController.flushZoneConfig,
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/fastly/zones/{zone_id}/urls',
    options: fastlyController.flushURLsConfig,
  });
  cacheControllers.push(fastlyController);

  const cloudfrontController = new CloudfrontController();
  server.route({
    method: 'DELETE',
    path: '/v1/caches/cloudfront/zones/{zone_id}',
    options: cloudfrontController.flushZoneConfig,
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/cloudfront/zones/{zone_id}/urls',
    options: cloudfrontController.flushURLsConfig,
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/cloudfront/zones/{zone_id}/directories',
    options: cloudfrontController.flushDirectoriesConfig,
  });
  cacheControllers.push(cloudfrontController);

  const incapsulaController = new IncapsulaController();
  server.route({
    method: 'DELETE',
    path: '/v1/caches/incapsula/zones/{zone_id}',
    options: incapsulaController.flushZoneConfig,
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/incapsula/zones/{zone_id}/urls',
    options: incapsulaController.flushURLsConfig,
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/incapsula/zones/{zone_id}/directories',
    options: incapsulaController.flushDirectoriesConfig,
  });
  cacheControllers.push(incapsulaController);

  server.route({
    method: 'GET',
    path: '/heartbeat',
    handler: (_: Hapi.Request, handler: Hapi.ResponseToolkit) => {
      return handler.response('I am alive!').code(200);
    },
    options: { description: 'Endpoint to check service availability' },
  });
}

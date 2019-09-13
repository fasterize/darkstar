import * as Hapi from 'hapi';
import CacheController from './controllers/CacheController';
import FasterizeCacheController from './controllers/FasterizeCacheController';
import FastlyController from './controllers/FastlyController';
import KeyCDNController from './controllers/KeyCDNController';
import CloudfrontController from './controllers/CloudfrontController';
import MultiCacheController from './controllers/MultiCacheController';

export default function(server: Hapi.Server) {
  const cacheControllers: CacheController[] = [];

  const fasterizeCacheController = new FasterizeCacheController();
  server.route({
    method: 'DELETE',
    path: '/v1/caches/fasterize/zones/{zone_id}',
    options: fasterizeCacheController.flushZoneConfig,
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/fasterize/zones/{zone_id}/urls',
    options: fasterizeCacheController.flushURLsConfig,
  });
  cacheControllers.push(fasterizeCacheController);

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
  cacheControllers.push(cloudfrontController);

  const multiCacheController = new MultiCacheController();
  server.route({
    method: 'DELETE',
    path: '/v1/caches/zones',
    options: multiCacheController.getFlushZoneConfig(cacheControllers),
  });
  server.route({
    method: 'DELETE',
    path: '/v1/caches/urls',
    options: multiCacheController.getFlushURLsConfig(cacheControllers),
  });

  server.route({
    method: 'GET',
    path: '/heartbeat',
    handler: (_: Hapi.Request, handler: Hapi.ResponseToolkit) => {
      return handler.response('I am alive!').code(200);
    },
    options: { description: 'Endpoint to check service availability' },
  });
}

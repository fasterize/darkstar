import * as Hapi from 'hapi';
import CacheController from './controllers/CacheController';
import FasterizeCacheController from './controllers/FasterizeCacheController';
import FastlyCacheController from './controllers/FastlyCacheController';
import KeyCDNController from './controllers/KeyCDNController';
import MultiCacheController from './controllers/MultiCacheController';

export default function(server: Hapi.Server) {
  const cacheControllers: CacheController[] = [];

  const fasterizeCacheController = new FasterizeCacheController();
  server.route({ method: 'DELETE', path: '/v1/caches/fasterize/zones/{zone_id}',
                 config: fasterizeCacheController.flushZoneConfig });
  cacheControllers.push(fasterizeCacheController);

  const keyCDNController = new KeyCDNController();
  server.route({ method: 'DELETE', path: '/v1/caches/keycdn/zones/{zone_id}',
                 config: keyCDNController.flushZoneConfig });
  cacheControllers.push(keyCDNController);

  const fastlyCacheController = new FastlyCacheController();
  server.route({ method: 'DELETE', path: '/v1/caches/fastly/zones/{zone_id}',
                 config: fastlyCacheController.flushZoneConfig });
  cacheControllers.push(fastlyCacheController);

  const multiCacheController = new MultiCacheController();
  server.route({ method: 'DELETE', path: '/v1/caches/zones',
                 config: multiCacheController.getFlushZoneConfig(cacheControllers) });

  server.route({ method: 'GET', path: '/heartbeat',
                 handler: function (request: Hapi.Request, reply: Hapi.IReply) { reply('I am alive!').code(200); },
                 config: { description: 'Endpoint to check service availability' },
  });
}

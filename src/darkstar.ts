/// <reference path="../typings/index.d.ts" />
import * as Hapi from 'hapi';
import * as nconf from 'nconf';
import routes from './routes';

nconf
  .argv()
  .env()
  .defaults({
    config: 'config/darkstar.conf',
    port: 9080,
    log_file: 'darkstar.log',
  });
nconf.file({ file: nconf.get('config') });

export const server = new Hapi.Server();
server.connection({ port: nconf.get('port') });

routes(server);

const plugins: any[] = [];

if (!module.parent) {
  plugins.push({ register: require('blipp'), options: {} });
  plugins.push({ register: require('good'), options: {
    reporters: {
      console: [
        { module: 'good-squeeze', name: 'Squeeze', args: [{ log: '*', response: '*', request: '*', error: '*' }] },
        { module: 'good-console' },
        'stdout',
      ],
      file: [
        { module: 'good-squeeze', name: 'Squeeze', args: [{ log: '*', response: '*', request: '*', error: '*' }] },
        { module: 'good-squeeze', name: 'SafeJson' },
        { module: 'good-file', args: [ nconf.get('log_file') ] },
      ],
    },
  }}); // tslint:disable-next-line:no-var-requires
  plugins.push(require('inert')); // tslint:disable-next-line:no-var-requires
  plugins.push(require('vision'));
  plugins.push({ register: require('hapi-swagger'), options: {
    info: { title: 'Darkstar documentation', version: require('../package.json').version },
    documentationPath: '/doc',
  } }); // tslint:disable-next-line:no-var-requires
  plugins.push(require('tv'));
  plugins.push({ register: require('hapi-api-version'), options: { validVersions: [1], defaultVersion: 1 } });
}

server.register(plugins, function (err) {
  if (!module.parent) {
    server.start();
  }
});

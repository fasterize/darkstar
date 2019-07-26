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

export const server = new Hapi.Server({ port: nconf.get('port') });

routes(server);

const plugins: any[] = [];

if (!module.parent) {
  plugins.push({ plugin: require('blipp'), options: {} });
  plugins.push({
    plugin: require('good'),
    options: {
      reporters: {
        console: [
          {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: '*', response: '*', request: '*', error: '*' }],
          },
          { module: 'good-console' },
          'stdout',
        ],
        file: [
          {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: '*', response: '*', request: '*', error: '*' }],
          },
          { module: 'good-squeeze', name: 'SafeJson' },
          { module: 'good-file', args: [nconf.get('log_file')] },
        ],
      },
    },
  });
  // tslint:disable-next-line:no-var-requires
  plugins.push(require('inert'));
  // tslint:disable-next-line:no-var-requires
  plugins.push(require('vision'));
  plugins.push({
    plugin: require('hapi-swagger'),
    options: {
      info: {
        title: 'Darkstar documentation',
        version: require('../package.json').version,
      },
      documentationPath: '/doc',
    },
  });
  // tslint:disable-next-line:no-var-requires
  plugins.push({
    plugin: require('hapi-api-version'),
    options: { validVersions: [1], defaultVersion: 1, vendorName: 'darkstar' },
  });
}

server.register(plugins).then(() => {
  if (!module.parent) {
    server.start();
  }
});

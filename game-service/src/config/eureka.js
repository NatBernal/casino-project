const Eureka = require('eureka-js-client').Eureka;

function registerEureka() {
  return new Promise((resolve, reject) => {
    const eurekaHost = process.env.EUREKA_HOST || 'localhost';
    const eurekaPort = parseInt(process.env.EUREKA_PORT) || 8761;
    const servicePort = parseInt(process.env.PORT) || 8083;

    const client = new Eureka({
      instance: {
        app: 'game-service',
        hostName: 'game-service',
        ipAddr: '127.0.0.1',
        port: { '$': servicePort, '@enabled': 'true' },
        vipAddress: 'game-service',
        dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
        },
        statusPageUrl: `http://game-service:${servicePort}/health`,
        healthCheckUrl: `http://game-service:${servicePort}/health`,
        homePageUrl: `http://game-service:${servicePort}/`,
      },
      eureka: {
        host: eurekaHost,
        port: eurekaPort,
        servicePath: '/eureka/apps/',
        maxRetries: 3,
        requestRetryDelay: 2000,
      },
    });

    client.logger.level = 'warn';

    client.start((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('[Eureka] Servicio registrado correctamente');
        resolve(client);
      }
    });
  });
}

module.exports = { registerEureka };

/* global __dirname */
const { existsSync } = require('node:fs');
const { join } = require('node:path');

module.exports = ({ config }) => {
  const localFile = './google-services.json';
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ||
    (existsSync(join(__dirname, localFile)) ? localFile : undefined);
  if (!googleServicesFile) return config;

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile,
    },
  };
};

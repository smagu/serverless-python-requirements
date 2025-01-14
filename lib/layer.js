const BbPromise = require('bluebird');
const fse = require('fs-extra');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { writeZip, addTree } = require('./zipTree');

BbPromise.promisifyAll(fse);

/**
 * Zip up requirements to be used as layer package.
 * @return {Promise} the JSZip object constructed.
 */
function zipRequirements() {
  const rootZip = new JSZip();
  const src = path.join('.serverless', 'requirements');
  fs.mkdirSync(src, { recursive: true })
  const runtimepath = 'python';

  return addTree(rootZip.folder(runtimepath), src).then(() =>
    writeZip(rootZip, path.join('.serverless', 'pythonRequirements.zip'))
  );
}

/**
 * Creates a layer on the serverless service for the requirements zip.
 * @return {Promise} empty promise
 */
function createLayers() {
  if (!this.serverless.service.layers) {
    this.serverless.service.layers = {};
  }
  this.serverless.service.layers['pythonRequirements'] = Object.assign(
    {
      artifact: path.join('.serverless', 'pythonRequirements.zip'),
      name: `${
        this.serverless.service.service
      }-${this.serverless.providers.aws.getStage()}-python-requirements`,
      description:
        'Python requirements generated by serverless-python-requirements.',
      compatibleRuntimes: [this.serverless.service.provider.runtime]
    },
    this.options.layer
  );

  return BbPromise.resolve();
}

/**
 * Creates a layer from the installed requirements.
 * @return {Promise} the combined promise for requirements layer.
 */
function layerRequirements() {
  if (!this.options.layer) {
    return BbPromise.resolve();
  }

  this.serverless.cli.log('Packaging Python Requirements Lambda Layer...');

  return BbPromise.bind(this)
    .then(zipRequirements)
    .then(createLayers);
}

module.exports = {
  layerRequirements
};

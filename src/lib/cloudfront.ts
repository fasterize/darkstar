import * as AWS from 'aws-sdk';
import * as bluebird from 'bluebird';
import { ServiceResponse, ServiceError } from './service';

const WILDCARD_FLUSH = '/*';

export async function flushDistribution(
  distributionID: string,
  awsAccessKeyID: string,
  awsSecretAccessKey: string
): bluebird<ServiceResponse> {
  return flushURLs(distributionID, [WILDCARD_FLUSH], awsAccessKeyID, awsSecretAccessKey);
}

export async function flushDirectories(
  distributionID: string,
  directories: string[],
  awsAccessKeyID: string,
  awsSecretAccessKey: string
): bluebird<ServiceResponse> {
  return flushURLs(
    distributionID,
    directories.map(directory => (directory.endsWith('/') ? `${directory}*` : `${directory}/*`)),
    awsAccessKeyID,
    awsSecretAccessKey
  );
}

export async function flushURLs(
  distributionID: string,
  urls: string[],
  awsAccessKeyID: string,
  awsSecretAccessKey: string
): bluebird<ServiceResponse> {
  let uniqPaths: string[];

  if (urls.length === 1 && urls[0] === WILDCARD_FLUSH) {
    uniqPaths = urls;
  } else {
    // it is currently not possible to invalidate by domain and Cloudfront invalidation by path only.
    const paths = urls.map(url => new URL(url)).map(url => `${url.pathname}${url.search}`);
    uniqPaths = Array.from(new Set(paths));
  }

  try {
    const request = new AWS.CloudFront({
      apiVersion: '2020-05-31',
      region: 'eu-west-3',
      credentials: {
        accessKeyId: awsAccessKeyID,
        secretAccessKey: awsSecretAccessKey,
      },
    }).createInvalidation({
      DistributionId: distributionID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: uniqPaths.length,
          Items: uniqPaths,
        },
      },
    });
    const response = await bluebird.resolve(request.promise());
    return { body: response } as ServiceResponse;
  } catch (error) {
    throw new ServiceError(error.message, {
      status: error.statusCode,
      body: error,
    } as ServiceResponse);
  }
}

import * as AWS from 'aws-sdk';
import * as bluebird from 'bluebird';
import { ServiceResponse, ServiceError } from './service';

export async function flushDistribution(
  distributionID: string,
  awsAccessKeyID: string,
  awsSecretAccessKey: string
): bluebird<ServiceResponse> {
  return flushURLs(distributionID, ['/'], awsAccessKeyID, awsSecretAccessKey);
}

export async function flushURLs(
  distributionID: string,
  urls: string[],
  awsAccessKeyID: string,
  awsSecretAccessKey: string
): bluebird<ServiceResponse> {
  try {
    const request = new AWS.CloudFront({
      apiVersion: '2019-03-26',
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
          Quantity: 1,
          Items: urls,
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

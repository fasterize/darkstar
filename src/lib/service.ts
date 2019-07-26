import * as http from 'superagent';
import * as bluebird from 'bluebird';

export class ServiceResponse {
  body: any;
  status: number;
}

export class ServiceError extends Error {
  response: ServiceResponse;

  constructor(message: any, response: ServiceResponse) {
    super(message);
    this.response = response;
  }
}

export async function buildServiceResponse(response: Promise<http.Response>): bluebird<ServiceResponse> {
  try {
    const res = await bluebird.resolve(response);
    return {
      body: res.body,
      status: res.status,
    } as ServiceResponse;
  } catch (error) {
    throw new ServiceError(
      error.message,
      error.response
        ? ({
            status: error.response.status,
            body: error.response.body,
          } as ServiceResponse)
        : null
    );
  }
}

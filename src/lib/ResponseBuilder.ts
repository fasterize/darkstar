import * as Boom from 'boom';
import { ServiceError } from './service';

interface DarkstarErrorPayload extends Boom.Payload {
  remoteResponse: object;
  remoteStatusCode: number;
}

export function buildErrorResponse(error: ServiceError, errorKey: string): Boom {
  let responseError: Boom;

  if (error.response && error.response.status) {
    if (error.response.status >= 400 && error.response.status < 500) {
      responseError = Boom.badRequest();
    } else if (error.response.status >= 500 && error.response.status < 600) {
      responseError = Boom.badGateway();
    }

    responseError.output.payload = {
      message: 'A remote error occurred',
      remoteResponse: error.response.body,
      remoteStatusCode: error.response.status,
    } as DarkstarErrorPayload;
  } else {
    responseError = Boom.boomify(new Error(`An error occurred while accessing ${errorKey} API: ${error.message}`), {
      statusCode: 502,
    });
  }

  return cleanupError(responseError);
}

export function cleanupError(error: Boom): Boom {
  delete error.output.payload.statusCode;
  delete error.output.payload.error;
  return error;
}

import * as Boom from 'boom';

namespace ResponseBuilder {
  export function buildErrorResponse(error: any, errorKey: string): Boom.BoomError {
    let responseError: Boom.BoomError;

    if (error.response) {
      if (error.response.status >= 400 && error.response.status < 500) {
        responseError = Boom.badRequest();
      }

      if (error.response.status >= 500 && error.response.status < 600) {
        responseError = Boom.badGateway();
      }

      responseError.output.payload.message = 'A remote error occurred';
      responseError.output.payload.remoteResponse = error.response.body;
      responseError.output.payload.remoteStatusCode = error.response.status;
    } else {
      responseError = Boom.wrap(new Error(`An error occurred while accessing ${errorKey} API: ${error.message}`), 502);
    }

    return cleanupError(responseError);
  }

  export function cleanupError(error: Boom.BoomError): Boom.BoomError {
    delete error.output.payload.statusCode;
    delete error.output.payload.error;
    return error;
  }
}

export default ResponseBuilder;

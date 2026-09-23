/**
 * Errors thrown by the service layer.
 *
 * The UI only ever sees a ServiceError, whether the data came from the mock
 * store (today) or the REST API (Phase 2 — see http.ts, which converts HTTP
 * status codes into these same codes).
 */
export type ServiceErrorCode = 'NOT_FOUND' | 'BAD_REQUEST' | 'CONFLICT' | 'FORBIDDEN' | 'UNAUTHORIZED' | 'INTERNAL';

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

export function notFound(entity: string, id: string): ServiceError {
  return new ServiceError('NOT_FOUND', `${entity} ${id} was not found.`);
}

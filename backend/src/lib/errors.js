/** An error that is safe to show to the client. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}
export const badRequest = (message, details) => new AppError(400, 'bad_request', message, details)
export const unauthorized = (message = 'Please sign in.') => new AppError(401, 'unauthorized', message)
export const forbidden = (message = 'You are not allowed to do this.') => new AppError(403, 'forbidden', message)
export const notFound = (message = 'Not found.') => new AppError(404, 'not_found', message)
export const conflict = (message, code = 'conflict') => new AppError(409, code, message)
export const tooMany = (message = 'Too many attempts. Please try again later.') => new AppError(429, 'rate_limited', message)

import type { StatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(
    public statusCode: StatusCode,
    public override message: string,
    public details: unknown = null
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details: unknown = null) {
    super(400, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: unknown = null) {
    super(422, message, details);
  }
}

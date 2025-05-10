import { NextFunction, Request, Response } from "express";
import logger from "./logger.js"; // Import the logger
import {
  ErrorCode,
  ErrorDetail,
  RequestContext,
} from "../../../shared/types/error.js";

export class AppError extends Error {
  status: number;
  details?: ErrorDetail;
  code: ErrorCode;
  requestContext?: RequestContext;

  constructor(
    message: string,
    status: number = 500,
    options?: {
      details?: ErrorDetail;
      code?: ErrorCode;
      request?: Request;
    },
  ) {
    super(message);
    this.status = status;
    this.details = options?.details;
    this.code = options?.code || ErrorCode.INTERNAL_ERROR;
    this.name = this.constructor.name;

    if (options?.request) {
      this.requestContext = {
        method: options.request.method,
        path: options.request.path,
        params: options.request.params as Record<string, unknown>,
        query: options.request.query as Record<string, unknown>,
        ip: options.request.ip,
        userId: options.request.session?.userId,
      };
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandlerMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction, // Prefixed unused parameter
) => {
  const status = "status" in err ? err.status : 500;
  const message = err.message || "Something went wrong";
  const details = "details" in err ? err.details : undefined;
  const code = "code" in err ? err.code : ErrorCode.INTERNAL_ERROR;

  // Enhanced error logging
  // Avoid logging expected errors like 401 Unauthorized unless needed for debugging
  if (status >= 500 || (status < 500 && status !== 401 && status !== 404)) { // Log server errors and unexpected client errors
    const logPayload = {
      error: {
        name: err.name,
        message,
        code,
        status,
        stack: err.stack, // Include stack trace
        details,
        request: "requestContext" in err ? err.requestContext : { // Use context from AppError if available
          method: req.method,
          path: req.path,
          params: req.params as Record<string, unknown>,
          query: req.query as Record<string, unknown>,
          ip: req.ip, // Add IP address
          userId: req.session?.userId, // Add user ID if available
        },
      },
    };
    // Use logger.error, passing the structured payload as the first argument
    logger.error(logPayload, `Error handled by middleware: ${message}`);
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      code,
      details, // Only include details in response if safe/necessary
      status,
    },
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      // Log the original error before wrapping it, if it's not an AppError
      if (!(err instanceof AppError)) {
        logger.warn(
          { err, path: req.path, method: req.method },
          "Caught non-AppError in asyncHandler, wrapping...",
        );
        const errorMessage = err instanceof Error
          ? err.message
          : "An unexpected error occurred";
        const errorDetails = {
          type: "unexpected",
          stack: err instanceof Error ? err.stack : undefined,
        };

        err = new AppError(errorMessage, 500, {
          request: req,
          details: errorDetails,
          code: ErrorCode.INTERNAL_ERROR,
        });
      }
      next(err);
      // No explicit return needed here, next() passes control
    });
  };
};

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => { // Prefixed unused parameter
  const details = {
    type: "resource" as const,
    resourceType: "endpoint",
    resourceId: req.originalUrl,
  };

  const error = new AppError(`Resource not found - ${req.originalUrl}`, 404, {
    request: req,
    code: ErrorCode.NOT_FOUND,
    details,
  });
  // Optionally log 404s if needed for analytics/debugging, but often they are just noise
  // logger.warn({ path: req.originalUrl, method: req.method, ip: req.ip }, 'Resource not found');
  next(error);
};

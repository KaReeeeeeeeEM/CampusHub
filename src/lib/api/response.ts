import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ApiError, isApiError } from "@/lib/errors/api-error";

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiFailure = {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ data, error: null }, init);
}

export function apiFailure(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json<ApiFailure>(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload.",
          details: error.flatten()
        }
      },
      { status: 422 }
    );
  }

  if (isApiError(error)) {
    return NextResponse.json<ApiFailure>(
      {
        data: null,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json<ApiFailure>(
    {
      data: null,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred."
      }
    },
    { status: 500 }
  );
}

export function notFound(message = "Resource not found.") {
  return new ApiError({ statusCode: 404, code: "NOT_FOUND", message });
}

export function forbidden(message = "You do not have access to this resource.") {
  return new ApiError({ statusCode: 403, code: "FORBIDDEN", message });
}

export function unauthorized(message = "Authentication is required.") {
  return new ApiError({ statusCode: 401, code: "UNAUTHORIZED", message });
}

import { apiErrorSchema, type ApiErrorResponse } from "@orchid/shared";

const apiBaseUrl = import.meta.env.VITE_API_URL || "";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly response: ApiErrorResponse,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init.body !== null;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const payload = apiErrorSchema.safeParse(await response.json().catch(() => null));
    const errorResponse = payload.success
      ? payload.data
      : {
          error: {
            code: "INTERNAL_ERROR" as const,
            message: "Unexpected API error",
            details: [],
            errors: []
          }
        };

    throw new ApiClientError(errorResponse.error.message, errorResponse, response.status);
  }

  return (await response.json()) as T;
}

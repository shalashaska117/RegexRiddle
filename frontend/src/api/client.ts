export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  readonly code: string | undefined;

  /**
   * Keep a failed API response in one error object.
   * @param status - HTTP status of the failed response.
   * @param message - Message to show or inspect.
   * @param fieldErrors - Validation messages keyed by field name; empty when absent.
   * @param code - Optional machine-readable error code, such as a missing session.
   * @returns An ApiError instance with status, message, field errors and optional code.
   */
  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

let authenticationRequiredHandler: (() => void) | undefined;

/**
 * Register the application callback for a missing session.
 * @param handler - Callback that clears local session state and handles navigation.
 * @returns Nothing; replaces the callback used for authentication failures.
 */
export function setAuthenticationRequiredHandler(handler: () => void): void {
  authenticationRequiredHandler = handler;
}

/**
 * Read an error response while allowing non-JSON bodies.
 * @param res - Failed HTTP response whose body will be read.
 * @returns Promise of an ApiError with available response details.
 */
async function toApiError(res: Response): Promise<ApiError> {
  let message = `Request failed with status ${res.status}`;
  let fieldErrors: Record<string, string> = {};
  let code: string | undefined;
  try {
    const body = (await res.json()) as {
      error?: unknown;
      errors?: unknown;
      code?: unknown;
    };
    if (typeof body.error === "string") message = body.error;
    if (typeof body.code === "string") code = body.code;
    if (body.errors && typeof body.errors === "object") {
      fieldErrors = body.errors as Record<string, string>;
    }
  } catch {
    // Non-JSON error body; keep the status-based message.
  }
  return new ApiError(res.status, message, fieldErrors, code);
}

/**
 * Send a request, handle session errors and decode its response.
 * @param path - API URL to request.
 * @param init - Fetch options; an empty object uses a GET request.
 * @returns Promise of the decoded JSON value, or undefined for HTTP 204.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const error = await toApiError(res);
    // A wrong password also returns 401, but does not end the session.
    if (error.status === 401 && error.code === "AUTHENTICATION_REQUIRED") {
      authenticationRequiredHandler?.();
    }
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Fetch JSON from an API endpoint.
 * @param path - API URL to fetch.
 * @returns Promise of the decoded response, with the caller's expected type.
 */
export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

/**
 * Send an optional JSON body with POST.
 * @param path - API URL to call.
 * @param body - Optional data to encode as JSON; omitted when undefined.
 * @returns Promise of the decoded response, or undefined for HTTP 204.
 */
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Send a partial update as JSON.
 * @param path - API URL to update.
 * @param body - Fields to encode as JSON.
 * @returns Promise of the decoded response, or undefined for HTTP 204.
 */
export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Upload multipart form data with PUT.
 * @param path - API URL that accepts the upload.
 * @param form - Form data containing the file and any other fields.
 * @returns Promise of the decoded response, or undefined for HTTP 204.
 */
export function apiPutMultipart<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "PUT", body: form });
}

// Domain error carrying an HTTP status. The central error handler maps it
// to a JSON response; the message is safe to show to the client.
export class AppError extends Error {
  /**
   * Creates an error that the API can return to a client.
   * @param status - HTTP status to send.
   * @param message - Client-safe explanation of the failure.
   * @returns A new error with the supplied status and message.
   */
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthenticationRequiredError extends AppError {
  /**
   * Creates an error for a missing or invalid session.
   * Parameters: none.
   * @returns A new authentication error with status 401.
   */
  constructor() {
    super(401, "Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

// Semantic validation failure raised by a service, one message per field.
// Rendered as the same 422 shape the error handler builds for zod failures,
// so the client sees a single format for both.
export class ValidationError extends AppError {
  /**
   * Creates a validation error for individual fields.
   * @param errors - Field names mapped to their validation messages.
   * @returns A new error with status 422 and the field messages.
   */
  constructor(public readonly errors: Record<string, string>) {
    super(422, "Validation failed");
    this.name = "ValidationError";
  }
}

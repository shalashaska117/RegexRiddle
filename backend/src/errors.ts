// Domain error carrying an HTTP status. The central error handler maps it
// to a JSON response; the message is safe to show to the client.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Semantic validation failure raised by a service, one message per field.
// Rendered as the same 422 shape the error handler builds for zod failures,
// so the client sees a single format for both.
export class ValidationError extends AppError {
  constructor(public readonly errors: Record<string, string>) {
    super(422, "Validation failed");
    this.name = "ValidationError";
  }
}

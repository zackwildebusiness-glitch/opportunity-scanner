export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UrlValidationError extends AppError {
  constructor(
    code: string,
    message: string,
    userMessage = "Please enter a valid public website URL.",
  ) {
    super(code.startsWith("url_") ? code : `url_${code}`, message, userMessage);
    this.name = "UrlValidationError";
  }
}

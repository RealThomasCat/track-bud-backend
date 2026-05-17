// Custom error class for consistent error handling across the app
// - AppError -> request/response application errors
// - Error -> internal infrastructure/library/programming errors

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

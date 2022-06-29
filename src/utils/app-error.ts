// custom error class

interface AppErrorClass {
  message: string;
  statusCode: number;
  status?: string;
  isOperational?: boolean;
}

class AppError extends Error implements AppErrorClass {
  constructor(
    public message: string,
    public statusCode: number,
    public status?: string,
    public isOperational?: boolean
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;

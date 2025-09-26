declare global {
  interface Logger {
    info(message: string, data?: any): void;
    error(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    debug(message: string, data?: any): void;
  }
}

declare module '@hapi/hapi' {
  interface Request {
    logger: Logger;
    payload: any;
    server: Server;
  }

  interface Server {
    logger: Logger;
    postgresDb: any;
  }

  interface ResponseToolkit {
    response(data: any): ResponseObject;
  }

  interface ResponseObject {
    code(statusCode: number): ResponseObject;
  }
}

import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';

import { WalletNotFoundError } from '@/application/use-cases/wallet-use-case.errors';

type HttpResponse = {
  status: (statusCode: number) => HttpResponse;
  json: (body: Record<string, unknown>) => void;
};

type HttpRequest = {
  url: string;
};

@Catch(WalletNotFoundError)
export class WalletExceptionFilter implements ExceptionFilter<WalletNotFoundError> {
  catch(exception: WalletNotFoundError, host: ArgumentsHost): void {
    // Traduz erro da aplicacao para HTTP sem acoplar use case ao NestJS.
    const httpException = new NotFoundException(exception.message);
    const statusCode = httpException.getStatus();
    const request = host.switchToHttp().getRequest<HttpRequest>();
    const response = host.switchToHttp().getResponse<HttpResponse>();

    response.status(statusCode).json({
      statusCode,
      message: exception.message,
      error: 'NotFound',
      path: request.url,
    });
  }
}

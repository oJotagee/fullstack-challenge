import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';

import {
  BetNotFoundError,
  CurrentRoundNotFoundError,
  DuplicatedBetError,
  RoundFairnessNotRevealedError,
  RoundNotBettingError,
  RoundNotFoundError,
  RoundNotRunningError,
} from '@/application/use-cases/game-use-case.errors';

type HttpResponse = {
  status: (statusCode: number) => HttpResponse;
  json: (body: Record<string, unknown>) => void;
};

type HttpRequest = {
  url: string;
};

type GameApplicationError =
  | CurrentRoundNotFoundError
  | RoundNotFoundError
  | BetNotFoundError
  | RoundNotBettingError
  | RoundNotRunningError
  | DuplicatedBetError
  | RoundFairnessNotRevealedError;

@Catch(
  CurrentRoundNotFoundError,
  RoundNotFoundError,
  BetNotFoundError,
  RoundNotBettingError,
  RoundNotRunningError,
  DuplicatedBetError,
  RoundFairnessNotRevealedError,
)
export class GameExceptionFilter implements ExceptionFilter<GameApplicationError> {
  catch(exception: GameApplicationError, host: ArgumentsHost): void {
    // Traduz erros de regra da aplicacao para HTTP sem acoplar use cases ao NestJS.
    const httpException = toHttpException(exception);
    const statusCode = httpException.getStatus();
    const request = host.switchToHttp().getRequest<HttpRequest>();
    const response = host.switchToHttp().getResponse<HttpResponse>();

    response.status(statusCode).json({
      statusCode,
      message: exception.message,
      error: httpException.name.replace('Exception', ''),
      path: request.url,
    });
  }
}

function toHttpException(exception: GameApplicationError) {
  if (
    exception instanceof CurrentRoundNotFoundError ||
    exception instanceof RoundNotFoundError ||
    exception instanceof BetNotFoundError
  ) {
    return new NotFoundException(exception.message);
  }

  return new ConflictException(exception.message);
}

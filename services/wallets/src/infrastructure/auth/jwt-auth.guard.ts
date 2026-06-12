import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JSONWebKeySet,
  type JWTPayload,
} from 'jose';

import type { AuthenticatedPlayer } from '@crash/shared/auth';

type KeycloakJwtPayload = JWTPayload & {
  sub?: string;
  preferred_username?: string;
  email?: string;
  azp?: string;
  realm_access?: {
    roles?: string[];
  };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly issuer =
    process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/crash-game';
  private readonly clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'crash-game-client';
  private readonly jwksUri =
    process.env.KEYCLOAK_JWKS_URI ??
    'http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs';
  private readonly jwks = this.createJwks();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthenticatedPlayer;
    }>();

    const token = this.extractBearerToken(request.headers.authorization);
    const payload = await this.verifyWithKeycloak(token);

    this.ensureTokenWasIssuedForThisClient(payload);

    request.user = {
      // Usamos o username como playerId estavel para bater com o seed local do desafio.
      playerId: payload.preferred_username ?? payload.sub ?? '',
      username: payload.preferred_username ?? payload.sub ?? '',
      email: payload.email,
      roles: payload.realm_access?.roles ?? [],
    };

    if (!request.user.playerId) {
      throw new UnauthorizedException('Token does not contain a player identifier.');
    }

    return true;
  }

  protected async verifyWithKeycloak(token: string): Promise<KeycloakJwtPayload> {
    try {
      return (await this.verifyJwtSignature(token)) as KeycloakJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid bearer token.');
    }
  }

  protected async verifyJwtSignature(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
    });

    return payload;
  }

  private createJwks(): ReturnType<typeof createLocalJWKSet> {
    if (process.env.KEYCLOAK_JWKS_JSON) {
      return createLocalJWKSet(JSON.parse(process.env.KEYCLOAK_JWKS_JSON) as JSONWebKeySet);
    }

    return createRemoteJWKSet(new URL(this.jwksUri));
  }

  private ensureTokenWasIssuedForThisClient(payload: KeycloakJwtPayload): void {
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud].filter(Boolean);

    if (payload.azp !== this.clientId && !audience.includes(this.clientId)) {
      throw new UnauthorizedException('Token was not issued for this client.');
    }
  }

  private extractBearerToken(authorization?: string): string {
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    return token;
  }
}

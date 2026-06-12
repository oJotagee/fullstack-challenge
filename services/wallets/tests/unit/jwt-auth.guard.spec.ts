import { describe, expect, it } from 'bun:test';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard } from '../../src/infrastructure/auth/jwt-auth.guard';

type TestRequest = {
  headers: { authorization?: string };
  user?: {
    playerId: string;
    username: string;
    email?: string;
    roles: string[];
  };
};

type VerifiedPayload = {
  sub?: string;
  preferred_username?: string;
  email?: string;
  azp?: string;
  aud?: string | string[];
  realm_access?: {
    roles?: string[];
  };
};

class FakeJwtAuthGuard extends JwtAuthGuard {
  constructor(private readonly payloadOrError: VerifiedPayload | Error) {
    super();
  }

  protected override async verifyJwtSignature(): Promise<VerifiedPayload> {
    if (this.payloadOrError instanceof Error) {
      throw this.payloadOrError;
    }

    return this.payloadOrError;
  }
}

function createContext(request: TestRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('rejects requests without a bearer token with 401', async () => {
    const guard = new FakeJwtAuthGuard({ preferred_username: 'player-1' });
    const request: TestRequest = { headers: {} };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('sets the authenticated player from a Keycloak token payload', async () => {
    const guard = new FakeJwtAuthGuard({
      preferred_username: 'player-1',
      email: 'player@example.com',
      azp: 'crash-game-client',
      realm_access: { roles: ['player'] },
    });
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      playerId: 'player-1',
      username: 'player-1',
      email: 'player@example.com',
      roles: ['player'],
    });
  });

  it('accepts the client id from the token audience', async () => {
    const guard = new FakeJwtAuthGuard({
      sub: 'player-sub',
      aud: ['account', 'crash-game-client'],
    });
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user?.playerId).toBe('player-sub');
  });

  it('rejects tokens issued for another client', async () => {
    const guard = new FakeJwtAuthGuard({
      preferred_username: 'player-1',
      azp: 'other-client',
    });
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects tokens without a player identifier', async () => {
    const guard = new FakeJwtAuthGuard({
      email: 'player@example.com',
      azp: 'crash-game-client',
    });
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects tokens that fail Keycloak verification', async () => {
    const guard = new FakeJwtAuthGuard(new Error('invalid signature'));
    const request: TestRequest = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('validates a signed JWT with issuer and JWKS', async () => {
    const previousIssuer = process.env.KEYCLOAK_ISSUER;
    const previousClientId = process.env.KEYCLOAK_CLIENT_ID;
    const previousJwksJson = process.env.KEYCLOAK_JWKS_JSON;
    const issuer = 'http://localhost:8080/realms/crash-game';
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(publicKey);

    publicJwk.kid = 'test-key';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    process.env.KEYCLOAK_ISSUER = issuer;
    process.env.KEYCLOAK_CLIENT_ID = 'crash-game-client';
    process.env.KEYCLOAK_JWKS_JSON = JSON.stringify({ keys: [publicJwk] });

    try {
      const token = await new SignJWT({
        preferred_username: 'player',
        email: 'player@crash-game.dev',
        azp: 'crash-game-client',
        realm_access: { roles: ['player'] },
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(issuer)
        .setSubject('player-sub')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);
      const guard = new JwtAuthGuard();
      const request: TestRequest = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
      expect(request.user).toEqual({
        playerId: 'player',
        username: 'player',
        email: 'player@crash-game.dev',
        roles: ['player'],
      });
    } finally {
      restoreEnv('KEYCLOAK_ISSUER', previousIssuer);
      restoreEnv('KEYCLOAK_CLIENT_ID', previousClientId);
      restoreEnv('KEYCLOAK_JWKS_JSON', previousJwksJson);
    }
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

import {
  RefreshTokenCommand,
  RefreshTokenCommandHandler,
} from "@auth/commands/refreshToken/refreshToken.command";
import { FakeRefreshSessionRepository } from "@auth/database/fakeRefreshSession.repository";
import { RefreshSessionRepository } from "@auth/database/refreshSession.repository.port";
import { InvalidRefreshTokenException } from "@auth/domain/auth.errors";
import {
  generateTokens,
  getSignTokenParams,
  refreshSessionExpiry,
  refreshVerifyOptions,
} from "@auth/util/signTokenParams";
import { UnprocessableEntityException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { FakeLoggerService } from "@shared/logger/adapters/fake/fakeLogger.service";
import { executeTask } from "@shared/utils/application/executeTask";
import { O } from "@shared/utils/application/monads";
import { RealUUIDGeneratorService } from "@shared/uuid/adapters/secondaries/realUUIDGenerator.service";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import { PinoLogger } from "nestjs-pino";

describe("[Unit] Refresh token", () => {
  let refreshTokenCommandHandler: RefreshTokenCommandHandler;
  let userRepository: UserRepository;
  let refreshSessionRepository: FakeRefreshSessionRepository;
  let jwtService: JwtService;
  const user = new UserBuilder().build();
  const session = {
    sessionId: createTestId(TableNameEnum.RefreshSession, 1),
    jti: createTestId(TableNameEnum.None, 1),
  };

  const refresh = (refreshToken: string) =>
    refreshTokenCommandHandler.execute(
      new RefreshTokenCommand({ refreshToken }),
    );

  // A logged in user: stored, with a refresh session and its token
  const login = async () => {
    await executeTask(userRepository.save(user));
    await executeTask(
      refreshSessionRepository.create({
        id: session.sessionId,
        userId: user.id,
        currentJti: session.jti,
        expiresAt: refreshSessionExpiry(),
      }),
    );
    return generateTokens(jwtService)(user, session);
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtService,
        RefreshTokenCommandHandler,
        RealUUIDGeneratorService,
        { provide: UserRepository, useClass: FakeUserRepository },
        {
          provide: RefreshSessionRepository,
          useClass: FakeRefreshSessionRepository,
        },
        { provide: PinoLogger, useClass: FakeLoggerService },
      ],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    refreshSessionRepository = moduleRef.get(RefreshSessionRepository);
    jwtService = moduleRef.get<JwtService>(JwtService);
    refreshTokenCommandHandler = moduleRef.get<RefreshTokenCommandHandler>(
      RefreshTokenCommandHandler,
    );
  });

  it("Should return new tokens for a valid refresh token", async () => {
    //Given a logged in user
    const { refreshToken } = await login();

    //When we refresh
    const result = await refresh(refreshToken);

    //Then it should return new tokens for that user, in the same session
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(refreshToken);
    expect(result.user.id).toBe(user.id);
    const claims = await jwtService.verifyAsync<{ sid: string }>(
      result.refreshToken,
      refreshVerifyOptions,
    );
    expect(claims.sid).toBe(session.sessionId);
  });

  it("Should accept the rotated refresh token", async () => {
    const { refreshToken } = await login();
    const first = await refresh(refreshToken);

    const second = await refresh(first.refreshToken);

    expect(second.user.id).toBe(user.id);
  });

  it("Should revoke the session when a refresh token is reused", async () => {
    //Given a refresh token that was already used
    const { refreshToken } = await login();
    const rotated = await refresh(refreshToken);

    //When it is used again
    const reuse = refresh(refreshToken);

    //Then it is rejected and the session ends, so the newer token stops working too
    await expect(reuse).rejects.toBeInstanceOf(InvalidRefreshTokenException);
    expect(
      await executeTask(refreshSessionRepository.findById(session.sessionId)),
    ).toEqual(O.none);
    await expect(refresh(rotated.refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it("Should not refresh without a session", async () => {
    //Given a refresh token whose session no longer exists
    await executeTask(userRepository.save(user));
    const { refreshToken } = await generateTokens(jwtService)(user, session);

    await expect(refresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it("Should not accept a refresh token issued without a session", async () => {
    //Given a token signed before refresh tokens were rotated
    await executeTask(userRepository.save(user));
    const refreshToken = await jwtService.signAsync(
      { sub: user.id, ver: user.tokenVersion },
      getSignTokenParams(user.id, {}).refreshOptions,
    );

    await expect(refresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it("Should not accept an access token as refresh token", async () => {
    const { accessToken } = await login();

    await expect(refresh(accessToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it("Should not accept a malformed refresh token", async () => {
    await expect(refresh("not-a-jwt")).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it("Should not accept an empty refresh token", async () => {
    await expect(refresh("")).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it("Should not refresh if the user no longer exists", async () => {
    //Given a valid refresh token for a user that was deleted
    const { refreshToken } = await login();
    await executeTask(userRepository.deleteById(user.id));

    await expect(refresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });

  it("Should not refresh after the user's tokens were revoked", async () => {
    //Given a refresh token issued before logout
    const { refreshToken } = await login();
    await executeTask(userRepository.incrementTokenVersion(user.id));

    await expect(refresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidRefreshTokenException,
    );
  });
});

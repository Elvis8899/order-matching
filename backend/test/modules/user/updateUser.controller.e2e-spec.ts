import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { UserRepository } from "@user/database/user.repository.port";
import { UserRoleEnum } from "@user/domain/user.entity";
import { unsafeCoerce } from "fp-ts/lib/function";

const testModule = new E2EModule((app) => ({
  userRepository: app.get(UserRepository),
}));
const userBuilder = new UserBuilder();
const originalUser = userBuilder.withUsername("Test").build();

beforeAll(async () => {
  await testModule.init();
});
afterAll(async () => {
  await testModule.close();
});
beforeEach(async () => {
  await testModule.prismaService.user.deleteMany();

  userBuilder.reset();
  testModule.authGuard.reset();
  await executeTask(testModule.r.userRepository.save(originalUser));
});
afterEach(async () => {
  await testModule.prismaService.user.deleteMany();
});

describe("[e2e] PUT /v1/users/{userId}", () => {
  const v1Route = (id: string) => "/v1/users/" + id;
  it("Should respond 200 updated for a valid user", async () => {
    const userDTO = userBuilder.buildCreateDTO();
    const response = await testModule
      .request()
      .put(v1Route(originalUser.id))
      .send(userDTO);
    expect(response.status).toBe(200);
  });

  it("Should respond 422 for invalid name", async () => {
    const userDTO = userBuilder.withUsername("").buildCreateDTO();
    const response = await testModule
      .request()
      .put(v1Route(originalUser.id))
      .send(userDTO);
    expect(response.status).toBe(422);
  });

  it("Should respond 422 for invalid name type", async () => {
    const userDTO = userBuilder.withUsername(unsafeCoerce(1)).buildCreateDTO();
    const response = await testModule
      .request()
      .put(v1Route(originalUser.id))
      .send(userDTO);
    expect(response.status).toBe(422);
  });

  it("Should respond 403 when a client changes their role", async () => {
    const response = await testModule
      .request()
      .put(v1Route(originalUser.id))
      .send({ username: "Test", role: UserRoleEnum.Admin });
    expect(response.status).toBe(403);
  });

  it("Should respond 404 for someone else's account", async () => {
    const other = new UserBuilder(2).build();
    await executeTask(testModule.r.userRepository.save(other));

    const response = await testModule
      .request()
      .put(v1Route(other.id))
      .send({ username: "Renamed" });
    expect(response.status).toBe(404);
  });

  it("Should let an admin change someone's role", async () => {
    testModule.authGuard
      .withSub(new UserBuilder(9).build().id)
      .withRole(UserRoleEnum.Admin);

    const response = await testModule
      .request()
      .put(v1Route(originalUser.id))
      .send({ username: "Test", role: UserRoleEnum.Admin });

    expect(response.status).toBe(200);
    const stored = await testModule.prismaService.user.findUnique({
      where: { id: originalUser.id },
    });
    expect(stored?.role).toBe(UserRoleEnum.Admin);
  });

  it("Should respond 409 for two users with same username", async () => {
    // With User Saved with cpf to repeat
    const user = new UserBuilder(2).withUsername("12345678902").build();
    await executeTask(testModule.r.userRepository.save(user));

    const repeaUsername = user.username;

    const userDTO = userBuilder.withUsername(repeaUsername).buildCreateDTO();
    const response = await testModule
      .request()
      .put(v1Route(originalUser.id))
      .send(userDTO);
    expect(response.status).toBe(409);
  });
});

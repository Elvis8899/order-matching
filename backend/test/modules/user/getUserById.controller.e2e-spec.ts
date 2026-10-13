import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { UserRepository } from "@user/database/user.repository.port";

const testModule = new E2EModule((app) => ({
  userRepository: app.get(UserRepository),
}));

beforeAll(async () => {
  await testModule.init();
});
afterAll(async () => {
  await testModule.close();
});

beforeEach(async () => {
  await testModule.prismaService.user.deleteMany();
  testModule.authGuard.reset();
});

afterEach(async () => {
  await testModule.prismaService.user.deleteMany();
});

describe("[e2e] GET /v1/users/:id", () => {
  const v1Route = (id: string) => "/v1/users/" + id;

  it("Should respond 200 with user List", async () => {
    const user = new UserBuilder().withUsername("Test").build();
    await executeTask(testModule.r.userRepository.save(user));

    const response = await testModule.request().get(v1Route(user.id)).query({
      limit: 10,
      page: 0,
    });
    expect(response.status).toBe(200);
    expect(response.body?.id).toBe(user.id);
    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("tokenVersion");
  });

  it("Should respond 404 for someone else's account", async () => {
    const other = new UserBuilder(2).build();
    await executeTask(testModule.r.userRepository.save(other));

    const response = await testModule.request().get(v1Route(other.id));

    expect(response.status).toBe(404);
  });

  it("Should respond 404 when user not found", async () => {
    const response = await testModule
      .request()
      .get(v1Route(createTestId(TableNameEnum.User, 0)))
      .query({
        limit: 100,
        page: 1,
      });
    expect(response.status).toBe(404);
  });
});

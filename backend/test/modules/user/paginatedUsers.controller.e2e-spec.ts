import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/data-builders/userBuilder";
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
});

afterEach(async () => {
  await testModule.prismaService.user.deleteMany();
});

describe("[e2e] GET /v1/users", () => {
  const v1Route = "/v1/users";

  it("Should respond 200 with user List", async () => {
    const user = new UserBuilder().withUsername("Test").build();
    await executeTask(testModule.r.userRepository.save(user));

    const response = await testModule.request().get(v1Route).query({
      limit: 10,
      page: 0,
    });
    expect(response.status).toBe(200);
    expect(response.body?.count).toBe(1);
    expect(response.body?.data?.length).toBe(1);
  });

  it("Should respond 200 with empty list", async () => {
    const response = await testModule.request().get(v1Route).query({
      limit: 100,
      page: 1,
    });
    expect(response.status).toBe(200);
    expect(response.body?.count).toBe(0);
  });
});

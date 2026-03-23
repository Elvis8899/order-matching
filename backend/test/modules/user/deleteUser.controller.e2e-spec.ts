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

describe("[e2e] DELETE /v1/users/:id", () => {
  const v1Route = (userId: string) => "/v1/users/" + userId;

  it("Should respond 200 for deleted user", async () => {
    const user = new UserBuilder().withUsername("Test").build();
    await executeTask(testModule.r.userRepository.save(user));

    const response = await testModule.request().delete(v1Route(user.id));

    expect(response.status).toBe(200);
    const userAmount = await testModule.prismaService.user.count();
    expect(userAmount).toBe(0);
  });

  it("Should respond 422 for invalid id", async () => {
    const response = await testModule.request().delete(v1Route("fakeId"));
    expect(response.status).toBe(422);
  });

  it("Should respond 404 for user not found", async () => {
    const user = new UserBuilder().withUsername("Test").build();
    const response = await testModule.request().delete(v1Route(user.id));
    expect(response.status).toBe(404);
  });
});

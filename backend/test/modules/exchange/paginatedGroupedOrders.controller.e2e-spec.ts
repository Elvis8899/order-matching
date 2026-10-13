import { OrderRepository } from "@exchange/database/order.repository.port";
import { executeTask } from "@shared/utils/application/executeTask";
import { OrderBuilder } from "@test/dataBuilders/orderBuilder";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { UserRepository } from "@user/database/user.repository.port";

const testModule = new E2EModule((app) => ({
  orderRepository: app.get(OrderRepository),
  userRepository: app.get(UserRepository),
}));
const v1Route = "/v1/orders/grouped";

beforeAll(async () => {
  await testModule.init();

  await executeTask(
    testModule.r.userRepository.save(new UserBuilder().build()),
  );
});
afterAll(async () => {
  await testModule.close();
});
beforeEach(async () => {
  await testModule.prismaService.order.deleteMany();
});
afterEach(async () => {
  await testModule.prismaService.order.deleteMany();
});

describe(`[e2e] GET ${v1Route}`, () => {
  it("Should respond 200 with order List", async () => {
    const order = new OrderBuilder().build();
    await executeTask(testModule.r.orderRepository.save(order));

    const response = await testModule.request().get(v1Route).query({
      limit: 10,
      page: 0,
      side: "buy",
    });
    expect(response.status).toBe(200);
    expect(response.body?.count).toBe(1);
    expect(response.body?.data?.length).toBe(1);
  });

  it("Should respond 200 with empty list", async () => {
    const response = await testModule.request().get(v1Route).query({
      limit: 100,
      page: 1,
      side: "buy",
    });
    expect(response.status).toBe(200);
    expect(response.body?.count).toBe(0);
  });
});

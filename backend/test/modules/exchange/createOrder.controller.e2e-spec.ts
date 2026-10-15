import { OrderRepository } from "@exchange/database/order.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { CreateOrderSubscriber } from "@exchange/subscribers/createOrder.subscriber";
import { executeTasks } from "@shared/utils/application/executeTask";
import { OrderBuilder } from "@test/dataBuilders/orderBuilder";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { UserRepository } from "@user/database/user.repository.port";

const orderBuilder = new OrderBuilder();
const testModule = new E2EModule((app) => ({
  orderRepository: app.get(OrderRepository),
  userRepository: app.get(UserRepository),
  walletRepository: app.get(WalletRepository),
}));
const v1Route = "/v1/orders";

beforeAll(async () => {
  testModule.builder.overrideProvider(CreateOrderSubscriber).useValue({});
  await testModule.init();

  await executeTasks(
    testModule.r.userRepository.save(new UserBuilder().build()),
  );
  await executeTasks(
    testModule.r.walletRepository.save(new WalletBuilder().build()),
  );
});
afterAll(async () => {
  await testModule.close();
});

beforeEach(async () => {
  await testModule.prismaService.order.deleteMany();
  orderBuilder.reset();
});

afterEach(async () => {
  await testModule.prismaService.order.deleteMany();
});

describe("[e2e] POST /v1/orders", () => {
  it("Should respond 201 for a valid order", async () => {
    const order = orderBuilder.buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(order);
    expect(response.status).toBe(201);
  });

  it("Should store decimal strings exactly", async () => {
    const order = orderBuilder
      .withPrice("30000.55")
      .withAmount("0.1")
      .buildCreateDTO();

    const response = await testModule.request().post(v1Route).send(order);

    expect(response.status).toBe(201);
    const [stored] = await testModule.prismaService.order.findMany();
    expect([stored?.price.toString(), stored?.amount.toString()]).toEqual([
      "30000.55",
      "0.1",
    ]);
  });

  it("Should respond 422 for a price with more than 2 places", async () => {
    const order = orderBuilder.withPrice("100.001").buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(order);
    expect(response.status).toBe(422);
  });

  it("Should respond 422 for invalid amount", async () => {
    const order = orderBuilder.withAmount(0).buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(order);
    expect(response.status).toBe(422);
  });
});

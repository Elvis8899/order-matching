import { OrderRepository } from "@src/modules/exchange/database/order.repository.port";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { CreateOrderSubscriber } from "@src/modules/exchange/subscribers/createOrder.subscriber";
import { executeTasks } from "@src/modules/shared/utils/application/executeTask";
import { UserRepository } from "@src/modules/user/database/user.repository.port";
import { OrderBuilder } from "@test/data-builders/orderBuilder";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { WalletBuilder } from "@test/data-builders/walletBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";

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

  it("Should respond 422 for invalid amount", async () => {
    const order = orderBuilder.withAmount(0).buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(order);
    expect(response.status).toBe(422);
  });
});

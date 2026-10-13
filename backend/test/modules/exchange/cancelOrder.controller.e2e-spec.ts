import { OrderRepository } from "@exchange/database/order.repository.port";
import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { CreateOrderSubscriber } from "@exchange/subscribers/createOrder.subscriber";
import { HttpStatus } from "@nestjs/common";
import { executeTasks } from "@shared/utils/application/executeTask";
import { OrderBuilder } from "@test/dataBuilders/orderBuilder";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { UserRepository } from "@user/database/user.repository.port";

const testModule = new E2EModule((app) => ({
  orderRepository: app.get(OrderRepository),
  userRepository: app.get(UserRepository),
  walletRepository: app.get(WalletRepository),
}));
const v1Route = (id: string) => `/v1/orders/${id}`;
const defaultOrder = new OrderBuilder().build();

beforeAll(async () => {
  testModule.builder.overrideProvider(CreateOrderSubscriber).useValue({});
  await testModule.init();

  await executeTasks(
    testModule.r.userRepository.save(new UserBuilder().build()),
  );
  await executeTasks(
    testModule.r.orderRepository.save(defaultOrder),
    testModule.r.walletRepository.save(new WalletBuilder().build()),
  );
});
afterAll(async () => {
  await testModule.close();
});
beforeEach(async () => {});
afterEach(async () => {});

describe(`[e2e] DELETE ${v1Route(":id")}`, () => {
  it(`Should respond ${String(HttpStatus.OK)} for a valid order`, async () => {
    const response = await testModule
      .request()
      .delete(v1Route(defaultOrder.id));
    expect(response.status).toBe(HttpStatus.OK);
  });

  it(`Should respond ${String(HttpStatus.NOT_FOUND)} for invalid id`, async () => {
    const response = await testModule
      .request()
      .delete(v1Route(createTestId(TableNameEnum.None)));
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
  });
});

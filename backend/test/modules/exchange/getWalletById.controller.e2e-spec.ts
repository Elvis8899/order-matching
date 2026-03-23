import { executeTask } from "@shared/utils/application/executeTask";
import { WalletRepository } from "@src/modules/exchange/database/wallet.repository.port";
import { UserRepository } from "@src/modules/user/database/user.repository.port";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { WalletBuilder } from "@test/data-builders/walletBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";

const testModule = new E2EModule((app) => ({
  userRepository: app.get(UserRepository),
  walletRepository: app.get(WalletRepository),
}));

const v1Route = "/v1/wallet";

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
  await testModule.prismaService.wallet.deleteMany();
});

afterEach(async () => {
  await testModule.prismaService.wallet.deleteMany();
});

describe(`[e2e] GET ${v1Route}`, () => {
  it("Should respond 200 with wallet", async () => {
    const wallet = new WalletBuilder().build();
    await executeTask(testModule.r.walletRepository.save(wallet));

    const response = await testModule.request().get(v1Route);
    expect(response.status).toBe(200);
    expect(response.body?.id).toBe(wallet.id);
  });

  it("Should respond 404 when wallet not found", async () => {
    const response = await testModule.request().get(v1Route);

    expect(response.status).toBe(404);
  });
});

import { WalletRepository } from "@exchange/database/wallet.repository.port";
import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { WalletBuilder } from "@test/dataBuilders/walletBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { UserRepository } from "@user/database/user.repository.port";

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

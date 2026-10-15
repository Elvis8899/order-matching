import { MatchRepository } from "@exchange/database/match.repository.port";
import { executeTask } from "@shared/utils/application/executeTask";
import { MatchBuilder } from "@test/dataBuilders/matchBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";

const testModule = new E2EModule((app) => ({
  matchRepository: app.get(MatchRepository),
}));
const v1Route = "/v1/match/statistics";

beforeAll(async () => {
  await testModule.init();
});
afterAll(async () => {
  await testModule.close();
});
beforeEach(async () => {
  await testModule.prismaService.match.deleteMany();
});

afterEach(async () => {
  await testModule.prismaService.match.deleteMany();
});

describe(`[e2e] GET ${v1Route}`, () => {
  it("Should respond 200 with match List", async () => {
    const match = new MatchBuilder().build();
    await executeTask(testModule.r.matchRepository.save(match));

    const response = await testModule.request().get(v1Route);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      usdVolume24h: match.volume.toString(),
      btcVolume24h: match.volume.div(match.price).toString(),
      lastPrice: match.price.toString(),
      high24h: match.price.toString(),
      low24h: match.price.toString(),
    });
  });

  it("Should respond 200 with empty list", async () => {
    const response = await testModule.request().get(v1Route);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      usdVolume24h: "0",
      btcVolume24h: "0",
      lastPrice: null,
      high24h: null,
      low24h: null,
    });
  });
});

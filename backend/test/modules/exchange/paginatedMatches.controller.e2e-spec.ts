import { MatchRepository } from "@exchange/database/match.repository.port";
import { executeTask } from "@shared/utils/application/executeTask";
import { MatchBuilder } from "@test/data-builders/matchBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";

const testModule = new E2EModule((app) => ({
  matchRepository: app.get(MatchRepository),
}));
const v1Route = "/v1/matches";

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

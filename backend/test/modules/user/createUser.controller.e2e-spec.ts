import { CreateUserSubscriber } from "@src/modules/exchange/subscribers/createUser.subscriber";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { unsafeCoerce } from "fp-ts/lib/function";

const userBuilder = new UserBuilder(1);
const testModule = new E2EModule(() => ({}));

beforeAll(async () => {
  testModule.builder.overrideProvider(CreateUserSubscriber).useValue({});
  await testModule.init();
});
afterAll(async () => {
  await testModule.close();
});

beforeEach(async () => {
  await testModule.prismaService.user.deleteMany();
  userBuilder.reset();
});

afterEach(async () => {
  await testModule.prismaService.user.deleteMany();
});

describe("[e2e] POST /v1/users", () => {
  const v1Route = "/v1/users";

  it("Should respond 201 for a valid user", async () => {
    const user = userBuilder.withUsername("Test").buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(user);
    expect(response.status).toBe(201);
  });

  it("Should respond 422 for invalid name", async () => {
    const user = userBuilder.withUsername("").buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(user);
    expect(response.status).toBe(422);
  });

  it("Should respond 422 for invalid name type", async () => {
    const user = userBuilder.withUsername(unsafeCoerce(1)).buildCreateDTO();
    const response = await testModule.request().post(v1Route).send(user);
    expect(response.status).toBe(422);
  });

  it("Should respond 409 for two users with same cpf", async () => {
    const user = userBuilder.buildCreateDTO();
    const userCopy = user;
    const newuserResponse = await testModule.request().post(v1Route).send(user);
    expect(newuserResponse.status).toBe(201);
    const response = await testModule.request().post(v1Route).send(userCopy);
    expect(response.status).toBe(409);
  });
});

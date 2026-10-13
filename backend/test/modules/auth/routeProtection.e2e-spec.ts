import { HttpStatus } from "@nestjs/common";
import { UserBuilder } from "@test/dataBuilders/userBuilder";
import { createTestId, TableNameEnum } from "@test/util/defaultIds";
import { E2EModule } from "@test/util/defaultModule.e2e";
import { UserRoleEnum } from "@user/domain/user.entity";
import { AddressInfo } from "net";
import { io } from "socket.io-client";

// Unlike the other e2e specs, AuthGuard is not replaced here: requests go
// through the real guard with real tokens from POST /v1/login

// Every route not listed here must require a token. Adding a public route
// means adding it to this list on purpose.
const publicRoutes = [
  "POST /v1/login",
  "POST /v1/refresh",
  // Sign up
  "POST /v1/users",
  "GET /check/status",
];

const checkedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const testModule = new E2EModule(() => ({}), { realAuth: true });
const routes: string[] = [];
let socketUrl: string;

const admin = new UserBuilder(1)
  .withUsername("route-admin")
  .withRole(UserRoleEnum.Admin);
const client = new UserBuilder(2)
  .withUsername("route-client")
  .withRole(UserRoleEnum.Client);

const clearUsers = async () => {
  await testModule.prismaService.refreshSession.deleteMany();
  await testModule.prismaService.user.deleteMany();
};

const login = async (builder: UserBuilder) => {
  const { username, password } = builder.build();
  const response = await testModule
    .request()
    .post("/v1/login")
    .send({ username, password });
  expect(response.status).toBe(HttpStatus.OK);
  return (response.body as { accessToken: string }).accessToken;
};

// Resolves "connected", or the message of the handshake's connect_error
const connectSocket = (auth: Record<string, unknown>): Promise<string> =>
  new Promise((resolve) => {
    const socket = io(socketUrl, {
      path: "/v1/socket.io",
      transports: ["websocket"],
      reconnection: false,
      auth,
    });
    socket.on("connect", () => {
      socket.disconnect();
      resolve("connected");
    });
    socket.on("connect_error", (error) => {
      socket.disconnect();
      resolve(error.message);
    });
  });

beforeAll(async () => {
  // Nest registers its routes during init, so this sees every one of them
  await testModule.init((app) => {
    app
      .getHttpAdapter()
      .getInstance()
      .addHook("onRoute", ({ method, url }) => {
        for (const m of [method].flat()) {
          if (checkedMethods.includes(m)) routes.push(`${m} ${url}`);
        }
      });
  });
  await clearUsers();
  await testModule.prismaService.user.create({
    data: await admin.buildWithHashedPassword(),
  });
  await testModule.prismaService.user.create({
    data: await client.buildWithHashedPassword(),
  });

  // The Socket.IO gateway only answers on a listening server
  await testModule.app.listen(0, "127.0.0.1");
  const { port } = testModule.app.getHttpServer().address() as AddressInfo;
  socketUrl = `http://127.0.0.1:${String(port)}`;
});

afterAll(async () => {
  await clearUsers();
  await testModule.close();
});

describe("[e2e] Route protection", () => {
  it("Should register the public routes", () => {
    expect(routes).toEqual(expect.arrayContaining(publicRoutes));
  });

  it("Should reject every other route without a token", async () => {
    const protectedRoutes = routes.filter((r) => !publicRoutes.includes(r));
    // Guards run before validation, so placeholder ids and no body are enough
    const id = createTestId(TableNameEnum.None, 1);

    // One at a time: firing them all at once resets connections
    const results: string[] = [];
    for (const route of protectedRoutes) {
      const [method = "", url = ""] = route.split(" ");
      const path = url.replace(/:\w+/g, id);
      const response = await testModule
        .request()
        [
          method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete"
        ](path);
      results.push(`${route} -> ${String(response.status)}`);
    }

    expect(protectedRoutes.length).toBeGreaterThan(0);
    expect(results).toEqual(
      protectedRoutes.map(
        (route) => `${route} -> ${String(HttpStatus.UNAUTHORIZED)}`,
      ),
    );
  });

  it("Should reject a token that is not a valid JWT", async () => {
    const response = await testModule
      .request()
      .get("/v1/orders")
      .set("Authorization", "Bearer not-a-jwt");

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it("Should let a client with a login token read orders but not users", async () => {
    const token = await login(client);

    const [orders, users] = await Promise.all([
      testModule
        .request()
        .get("/v1/orders")
        .set("Authorization", `Bearer ${token}`),
      testModule
        .request()
        .get("/v1/users")
        .set("Authorization", `Bearer ${token}`),
    ]);

    expect(orders.status).toBe(HttpStatus.OK);
    expect(users.status).toBe(HttpStatus.FORBIDDEN);
  });

  it("Should let an admin with a login token list users", async () => {
    const token = await login(admin);

    const response = await testModule
      .request()
      .get("/v1/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(HttpStatus.OK);
  });
});

describe("[e2e] Socket.IO gateway protection", () => {
  it("Should refuse a connection without a token", async () => {
    await expect(connectSocket({})).resolves.toBe("Unauthorized");
  });

  it("Should refuse a connection with an invalid token", async () => {
    await expect(connectSocket({ token: "not-a-jwt" })).resolves.toBe(
      "Unauthorized",
    );
  });

  it("Should accept a connection with a login token", async () => {
    const token = await login(client);

    await expect(connectSocket({ token })).resolves.toBe("connected");
  });
});

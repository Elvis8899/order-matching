import { HttpStatus } from "@nestjs/common";
import { E2EModule } from "@test/util/defaultModule.e2e";

// Checks the setup that main.ts gets from app.setup.ts: helmet and Swagger

describe("[e2e] App setup", () => {
  const testModule = new E2EModule(() => ({}));

  beforeAll(async () => {
    await testModule.init();
  });

  afterAll(async () => {
    await testModule.close();
  });

  it("Should send helmet's security headers, without a CSP", async () => {
    const response = await testModule.request().get("/check/status");

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["strict-transport-security"]).toBeDefined();
    // Disabled on purpose in app.setup.ts
    expect(response.headers["content-security-policy"]).toBeUndefined();
  });

  it("Should serve the Swagger UI and the OpenAPI document", async () => {
    const [ui, document] = await Promise.all([
      testModule.request().get("/swagger"),
      testModule.request().get("/swagger-json"),
    ]);

    expect(ui.status).toBe(HttpStatus.OK);
    expect(ui.headers["content-type"]).toContain("text/html");
    expect(document.status).toBe(HttpStatus.OK);
    const body = document.body as {
      info: { title: string };
      paths: Record<string, unknown>;
      components: { securitySchemes: Record<string, unknown> };
    };
    expect(body.info.title).toBe("Exchange");
    expect(body.paths).toHaveProperty("/v1/orders");
    expect(body.components.securitySchemes).toHaveProperty("bearer");
  });
});

import { GET } from "../../app/api/health/route";
import { callRoute } from "./nextApiTestUtils";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const { res, json } = await callRoute(GET, {
      url: "http://localhost/api/health",
      method: "GET",
    });

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("status", "ok");
    expect(json).toHaveProperty("timestamp");
  });
});

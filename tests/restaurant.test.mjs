import request from "supertest";
import app from "../src/app.js";

describe("Restaurant API", () => {
  test("POST /restaurant/create should create restaurant", async () => {
    const res = await request(app)
      .post("/restaurant/create")
      .send({
        name: "Test Resto",
        description: "Pizzeria avec recettes italiennes",
        address: "Hydra, Alger",
        lat: 36.75,
        lng: 3.06
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("uuid");
  });
});

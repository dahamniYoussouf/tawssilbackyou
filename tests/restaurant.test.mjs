import request from "supertest";
import app from "../src/app.js";   // ✅ import app, not index.js
import { sequelize } from "../src/config/database.js";

beforeAll(async () => {
  // Reset DB before tests
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Safely close DB connection after tests
  if (sequelize && sequelize.close) {
    try {
      await sequelize.close();
    } catch (err) {
      console.warn("⚠️ Sequelize already closed:", err.message);
    }
  }
});

describe("Restaurant API", () => {
  test("POST /restaurant/create → should create restaurant", async () => {
    const res = await request(app)
      .post("/restaurant/create")
      .send({
        name: "Test Resto",
        description: "Pizzeria avec recettes italiennes",
        address: "Hydra, Alger",
        lat: 36.75,   // ✅ match controller param
        lng: 3.06,    // ✅ match controller param
      });

    // Assertions
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("uuid");
  });
});

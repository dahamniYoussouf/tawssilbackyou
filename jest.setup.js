import { sequelize } from "./src/config/database.js";
import Restaurant from "./src/models/Restaurant.js";

beforeAll(async () => {
  await sequelize.sync({ force: true }); // fresh schema before tests
});

afterEach(async () => {
  await Restaurant.destroy({ where: {} }); // clear restaurants table between tests
});

afterAll(async () => {
  await sequelize.close(); // close DB connection after all tests
});

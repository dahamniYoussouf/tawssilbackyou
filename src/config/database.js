import "./env.js";
import { Sequelize } from "sequelize";

const nodeEnv = process.env.NODE_ENV || "development";
const isTestEnv = nodeEnv === "test";

const parseBoolean = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return null;
};

const databaseUrl = process.env.DATABASE_URL;

if (!isTestEnv && !databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Put it in `tawssilbackyou/.env` or your environment variables."
  );
}

const sslEnabled = parseBoolean(process.env.DB_SSL) ?? true;

const sequelize = isTestEnv
  ? new Sequelize("sqlite::memory:", { dialect: "sqlite", logging: false })
  : new Sequelize(databaseUrl, {
      dialect: "postgres",
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
        evict: 1000
      },
      dialectOptions: {
        statement_timeout: 15000,
        idle_in_transaction_session_timeout: 10000,
        keepAlive: true,
        ...(sslEnabled && {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        })
      },
      logging: false,
      retry: {
        max: 3
      }
    });

export { sequelize };
export default sequelize;


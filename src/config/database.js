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

const resolveDatabaseUrl = () => {
  const direct = process.env.DATABASE_URL;
  if (direct) return direct;

  const host = process.env.DB_PG_HOST;
  const name = process.env.DB_PG_NAME;
  const user = process.env.DB_PG_USER;
  const password = process.env.DB_PG_PASSWORD;
  const port = process.env.DB_PG_PORT;

  if (!host || !name || !user) return null;

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = password ? encodeURIComponent(password) : null;
  const auth = encodedPassword ? `${encodedUser}:${encodedPassword}` : encodedUser;
  const portSuffix = port ? `:${port}` : "";

  return `postgresql://${auth}@${host}${portSuffix}/${name}`;
};

const databaseUrl = resolveDatabaseUrl();

if (!isTestEnv && !databaseUrl) {
  throw new Error(
    "Database config missing. Set DATABASE_URL (recommended) or DB_PG_HOST/DB_PG_NAME/DB_PG_USER/DB_PG_PASSWORD (optional DB_PG_PORT)."
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

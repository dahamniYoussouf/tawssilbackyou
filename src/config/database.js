import { Sequelize } from "sequelize";

let sequelize;

if (process.env.NODE_ENV === "test") {
  sequelize = new Sequelize("sqlite::memory:", {
    dialect: "sqlite",
    logging: false,
  });
} else {
  sequelize = new Sequelize(
    "postgresql://postgres.ruuirjmkvdjonkddxwfi:63bCnsvMf125qUXm@aws-1-eu-north-1.pooler.supabase.com:5432/postgres",
    {
      dialect: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: false,
    }
  );
}

export { sequelize };
export default sequelize;


// const { Sequelize } = require('sequelize');

// const sequelize = new Sequelize('resto_app', 'postgres', '1234', {
//   host: 'localhost',
//   dialect: 'postgres',
//   port: 5432,
//   logging: false, // mettre true si tu veux voir les requêtes SQL
//   pool: {
//     max: 10,
//     min: 0,
//     acquire: 30000,
//     idle: 10000
//   }
// });

// module.exports = sequelize;
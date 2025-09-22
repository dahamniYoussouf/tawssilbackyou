const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DATABASE_URL,
  {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

module.exports = sequelize;

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


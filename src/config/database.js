import { Sequelize } from "sequelize";

let sequelize;

if (process.env.NODE_ENV === "test") {
  sequelize = new Sequelize("sqlite::memory:", {
    dialect: "sqlite",
    logging: false,
  });
} else {
  sequelize = new Sequelize(
    "postgresql://postgres.ruuirjmkvdjonkddxwfi:63bCnsvMf125qUXm@aws-1-eu-north-1.pooler.supabase.com:6543/postgres",
    {
      dialect: "postgres",
      pool: {
        max: 5,          // ← Pour Transaction Mode (port 6543)
        min: 0,          // ← Libère les connexions inutilisées
        acquire: 30000,  // ← temps max pour obtenir une connexion (ms)
        idle: 10000,     // ← ferme une connexion idle après 10s
        evict: 1000      // ← vérifie toutes les 1s pour évictions
      },
      dialectOptions: {
        statement_timeout: 15000,   // PG tue les requêtes > 15s
        idle_in_transaction_session_timeout: 10000,
        keepAlive: true,
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: false,
      
      // Retry logic pour gérer les connexions échouées
      retry: {
        max: 3  // Réessayer 3 fois en cas d'échec
      }
    }
  );
}

export { sequelize };
export default sequelize;


// import { Sequelize } from "sequelize";

// const sequelize = new Sequelize('resto_app', 'postgres', '1234', {
//   host: 'localhost',
//   dialect: 'postgres',
//   port: 5432,
//   logging: false,
//   pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
// });

// export default sequelize;
// export { sequelize }
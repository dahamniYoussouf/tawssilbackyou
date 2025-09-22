const sequelize = require('./config/database');
const Restaurant = require('./models/Restaurant');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion réussie à PostgreSQL');

    await sequelize.sync({ alter: true }); 
    console.log('✅ Tables synchronisées');

    process.exit();
  } catch (err) {
    console.error('❌ Erreur de connexion :', err);
  }
})();

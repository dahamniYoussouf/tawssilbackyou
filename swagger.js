// swagger.js - Fichier de génération automatique
import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    version: '1.0.0',
    title: 'My API',
    description: 'Documentation générée automatiquement'
  },
  host: process.env.HOST,
  basePath: '/',
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    
  ],
  definitions: {
    Restaurant: {
      name: "Le Bistrot",
      address: "123 Rue de la Paix",
      latitude: 48.8566,
      longitude: 2.3522,
      cuisine: "Française"
    },
    Error: {
      message: "Message d'erreur",
      code: 400
    }
  }
};

const outputFile = './swagger-output.json';
const routes = [
  './src/routes/restaurant.route.js',
  './src/routes/menuItem.route.js',
  './src/routes/foodCategory.route.js',
  './src/routes/uploadRoutes.js', 
  './src/routes/geocode.js'
];

// Génère automatiquement
swaggerAutogen()(outputFile, routes, doc).then(() => {
  console.log('Documentation générée !');
});
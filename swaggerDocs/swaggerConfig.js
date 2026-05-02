const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi =  require('swagger-ui-express');
// const logger =  require('../config/logger');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BookMyCuts API',
      version: '1.0.0',
      description: 'Backend API for the BookMyCuts platform',
    },
    tags: [
      { name: 'User', description: 'Endpoints for standard users (booking, finding shops, etc.)' },
      { name: 'ShopOwner', description: 'Endpoints for shop owners (managing services, barbers, payouts, etc.)' },
      { name: 'Admin', description: 'Endpoints for administrators (dashboard tracking, user management, etc.)' },
      { name: 'Common', description: 'Shared endpoints for all roles (auth operations, notifications, etc.)' }
    ],
  },
  apis: ['./swaggerDocs/*.yaml'],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
//   logger.info('Docs available at /api/docs');
  console.log('Docs available at /api/docs');
}

module.exports = setupSwagger;
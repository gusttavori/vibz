const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// Rota GET /api/config/prices
// Pública: Não exige autenticação pois o formulário de cadastro precisa saber os preços antes do login/cadastro completo em alguns casos, ou apenas para exibição.
router.get('/prices', configController.getPublicConfig);

module.exports = router;
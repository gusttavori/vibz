const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController');
// Importe seu middleware de autenticação se houver, ex: const auth = require('../middlewares/auth');

router.post('/', artistController.createArtist); // Adicionar middleware de admin/auth depois
router.get('/', artistController.getAllArtists);
router.put('/:id', artistController.updateArtist);
router.delete('/:id', artistController.deleteArtist);

module.exports = router;
const express = require('express');
const router = express.Router();
const placeController = require('../controllers/placeController');

router.post('/', placeController.createPlace); 
router.get('/', placeController.getAllPlaces);
router.put('/:id', placeController.updatePlace);
router.delete('/:id', placeController.deletePlace);

module.exports = router;
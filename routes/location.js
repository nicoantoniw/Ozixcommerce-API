const express = require('express');
const { body } = require('express-validator');

const locationController = require('../controllers/location');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/locations', auth.isAdmin, locationController.getLocations);
router.get(
    '/locations/:locationId',
    auth.isUser,
    locationController.getLocation
);
router.post(
    '/add',
    auth.isAdmin,
    locationController.addLocation
);
router.put(
    '/update/:locationId',
    auth.isAdmin,
    locationController.updateLocation
);
router.delete(
    '/delete/:locationId',
    auth.isAdmin,
    locationController.deleteLocation
);

module.exports = router;

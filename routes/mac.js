const express = require('express');
const { body } = require('express-validator');

const macController = require('../controllers/mac');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get(
    '/address',
    auth.isAdmin,
    macController.getAddress
);
router.post(
    '/add',
    auth.isAdmin,
    macController.addAddress
);
router.delete(
    '/delete',
    auth.isAdmin,
    macController.removeAddress
);
module.exports = router;

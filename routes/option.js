const express = require('express');
const { body } = require('express-validator');

const optionController = require('../controllers/option');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/options', auth.isAdmin, optionController.getOptions);
router.get(
    '/options/:optionId',
    auth.isWebsiteUser,
    optionController.getOption
);
router.post(
    '/add',
    auth.isAdmin,
    optionController.addOption
);
router.put(
    '/update/:optionId',
    auth.isAdmin,
    optionController.updateOption
);
router.delete(
    '/delete/:optionId',
    auth.isAdmin,
    optionController.deleteOption
);
router.delete(
    '/delete-multiple',
    auth.isAdmin,
    optionController.deleteOptions
);

module.exports = router;

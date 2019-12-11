const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.post('/login', authController.login);
router.get('/status', auth.isAdmin, authController.getUserStatus);
router.patch(
  '/activate/:userStatusId',
  auth.isAdmin,
  authController.activateUserStatus
);
router.patch(
  '/deactivate/:userStatusId',
  auth.isAdmin,
  authController.deactivateUserStatus
);

module.exports = router;

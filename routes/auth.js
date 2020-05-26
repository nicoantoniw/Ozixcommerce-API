const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/user', auth.isSuper, authController.createUser);
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
router.post('/website-login', authController.websiteLogin);
router.post('/website-signup', authController.websiteSignup);

module.exports = router;

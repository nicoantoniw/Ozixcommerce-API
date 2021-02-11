const express = require('express');

const groupController = require('../controllers/group');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/groups', auth.isPrime, groupController.getGroups);
router.get('/groups/group', auth.isUser, groupController.getGroup);
router.post('/add', auth.isUser, groupController.addGroup);
router.post('/add-logo', auth.isUser, groupController.addLogo);
router.put('/update', auth.isAdmin, groupController.updateBusinessInfo);


module.exports = router;

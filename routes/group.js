const express = require('express');

const groupController = require('../controllers/group');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/groups', auth.isPrime, groupController.getGroups);
router.get('/groups/group', auth.isUser, groupController.getGroup);
router.get('/sale-points', auth.isUser, groupController.getSalePoints);
router.post('/add', auth.isUser, groupController.addGroup);
router.post('/add-sale-point', auth.isUser, groupController.addSalePoint);
router.put('/update', auth.isAdmin, groupController.updateContactalData);
router.put('/update-sale-point', auth.isAdmin, groupController.updateDefaultSalePoint);
router.delete('/delete-sale-point', auth.isAdmin, groupController.deleteSalePoint);


module.exports = router;

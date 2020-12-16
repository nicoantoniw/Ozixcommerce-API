const express = require('express');
const { body } = require('express-validator');

const transferController = require('../controllers/transfer');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/transfers', auth.isUser, transferController.getTransfers);
router.get(
    '/transfers/:transferId',
    auth.isUser,
    transferController.getTransfer
);
router.post(
    '/add',
    auth.isSeller,
    transferController.addTransfer
);
router.put(
    '/unassigned/:productId',
    auth.isSeller,
    transferController.transferUnassignedStock
);
router.put(
    '/update/:transferId',
    auth.isSeller,
    transferController.updateTransfer
);
router.delete(
    '/delete/:transferId',
    auth.isAdmin,
    transferController.deleteTransfer
);
router.delete(
    '/delete-multiple',
    auth.isAdmin,
    transferController.deleteTransfers
);

module.exports = router;

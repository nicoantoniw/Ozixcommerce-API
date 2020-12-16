const express = require('express');
const { body } = require('express-validator');

const accountController = require('../controllers/account');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/accounts', auth.isUser, accountController.getAccounts);
// router.get('/accounts/transactions/:accountId', auth.isUser, accountController.getAccountTransactions);
router.get(
    '/accounts/:accountId',
    auth.isUser,
    accountController.getAccount
);
router.post(
    '/add',
    auth.isSeller,
    accountController.addAccount
);
router.post(
    '/add-movement/:accountId',
    auth.isSeller,
    accountController.addMovement
);
router.put(
    '/update/:accountId',
    auth.isSeller,
    accountController.updateAccount
);
router.delete(
    '/delete/:accountId',
    auth.isAdmin,
    accountController.deleteAccount
);
router.delete(
    '/delete-multiple',
    auth.isAdmin,
    accountController.deleteAccounts
);

module.exports = router;

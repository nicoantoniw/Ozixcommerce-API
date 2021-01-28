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
router.get(
    '/accounts/transfer/:accountTransferId',
    auth.isUser,
    accountController.getAccountTransfer
);
router.post(
    '/add',
    auth.isSeller,
    accountController.addAccount
);
router.post(
    '/add-transfer',
    auth.isSeller,
    accountController.addAccountTransfer
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
    '/delete-transfer/:accountTransferId',
    auth.isAdmin,
    accountController.deleteAccountTransfer
);

module.exports = router;

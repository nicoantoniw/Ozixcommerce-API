const express = require('express');
const { body } = require('express-validator');

const cashController = require('../controllers/cash');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/cash-registers', auth.isUser, cashController.getCashRegisters);
router.get(
    '/cash-registers/:cashRegisterId',
    auth.isUser,
    cashController.getCashRegister
);
router.post(
    '/add',
    auth.isSeller,
    cashController.addCashRegister
);
router.post(
    '/add-movement/:cashRegisterId',
    auth.isSeller,
    cashController.addMovement
);
router.delete(
    '/delete/:cashRegisterId',
    auth.isAdmin,
    cashController.deleteCashRegister
);

module.exports = router;

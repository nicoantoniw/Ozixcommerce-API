const express = require('express');
const { body } = require('express-validator');

const expenseController = require('../controllers/expense');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/expenses', auth.isAdmin, auth.isPrime, expenseController.getExpenses);
router.get('/expenses-bills', auth.isAdmin, auth.isPrime, expenseController.getExpensesAndBills);
router.get(
    '/expenses/:expenseId',
    auth.isAdmin, auth.isPrime,
    expenseController.getExpense
);
router.get('/expenses-by-filter', auth.isAdmin, expenseController.getExpensesByFilter);
router.post('/print', auth.isAdmin, expenseController.createPDF);
router.post(
    '/add',
    auth.isAdmin,
    expenseController.addExpense
);
router.delete(
    '/delete/:expenseId',
    auth.isAdmin, auth.isPrime,
    expenseController.deleteExpense
);

module.exports = router;
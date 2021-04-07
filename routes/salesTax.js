const express = require('express');
const { body } = require('express-validator');

const salesTaxController = require('../controllers/salesTax');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/sales-tax', auth.isAdmin, salesTaxController.getSalesTax);
router.get('/categories', auth.isAdmin, salesTaxController.getCategories);
router.get('/rates', auth.isAdmin, salesTaxController.getTaxRates);
router.post('/validate', auth.isAdmin, salesTaxController.validateAddress);
router.post('/add-rate', auth.isAdmin, salesTaxController.addTaxRate);
router.delete('/delete-rate/:taxRateId', auth.isAdmin, salesTaxController.deleteTaxRate);

module.exports = router;

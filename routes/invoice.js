const express = require('express');
const { body } = require('express-validator');

const invoiceController = require('../controllers/invoice');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/invoices', auth.isAdmin, invoiceController.getInvoices);
router.get('/invoices-by-filter', auth.isAdmin, invoiceController.getInvoicesByFilter);
router.get('/invoices/:invoiceId', auth.isAdmin, invoiceController.getInvoice);
router.post('/print', invoiceController.createPDF);
router.post('/add', auth.isUser, invoiceController.addInvoice);
router.patch('/activate/:invoiceId', auth.isAdmin, invoiceController.activateInvoice);
router.delete('/delete/:invoiceId', auth.isAdmin, invoiceController.deleteInvoice);

module.exports = router;

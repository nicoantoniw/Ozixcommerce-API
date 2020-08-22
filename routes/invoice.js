const express = require('express');
const { body } = require('express-validator');

const invoiceController = require('../controllers/invoice');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/invoices', auth.isAdmin, invoiceController.getInvoices);
router.get('/invoices-by-date', auth.isAdmin, invoiceController.getInvoicesByDate);
router.get('/invoices/:invoiceId', auth.isAdmin, invoiceController.getInvoice);
router.get(
  '/invoices/seller/:sellerId',
  auth.isAdmin,
  invoiceController.getInvoicesBySeller
);
router.get('/invoices30days', auth.isAdmin, invoiceController.getInvoices30Days);
router.post('/ticketa4', invoiceController.createPDF);
router.post(
  '/add',
  auth.isUser,
  invoiceController.addInvoice
);
router.put(
  '/update/:invoiceId',
  [
    body('ticketType')
      .isString()
      .trim(),
    body('ticketNumber')
      .isString()
      .trim(),
  ],
  auth.isAdmin,
  invoiceController.updateInvoice
);
router.patch('/activate/:invoiceId', auth.isAdmin, invoiceController.activateInvoice);
router.patch(
  '/deactivate/:invoiceId',
  auth.isAdmin,
  invoiceController.deactivateInvoice
);
router.delete('/delete/:invoiceId', auth.isAdmin, invoiceController.deleteInvoice);

module.exports = router;

const express = require('express');
const { body } = require('express-validator');

const saleController = require('../controllers/sale');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/sales', auth.isAdmin, saleController.getSales);
router.get('/sales-by-date', auth.isAdmin, saleController.getSalesByDate);
router.get('/sales/:saleId', auth.isAdmin, saleController.getSale);
router.get(
  '/sales/seller/:sellerId',
  auth.isAdmin,
  saleController.getSalesBySeller
);
router.post('/ticket', auth.isUser, saleController.createTicket);
router.post(
  '/add',
  [
    body('ticketType')
      .isString()
      .trim()
  ],
  auth.isUser,
  saleController.addSale
);
router.put(
  '/update/:saleId',
  [
    body('ticketType')
      .isString()
      .trim(),
    body('ticketNumber')
      .isString()
      .trim(),
  ],
  auth.isAdmin,
  saleController.updateSale
);
router.patch('/activate/:saleId', auth.isAdmin, saleController.activateSale);
router.patch(
  '/deactivate/:saleId',
  auth.isAdmin,
  saleController.deactivateSale
);
router.delete('/delete/:saleId', auth.isAdmin, saleController.deleteSale);

module.exports = router;

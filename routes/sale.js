const express = require('express');
const { body } = require('express-validator');

const saleController = require('../controllers/sale');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/sales', auth.isUser, saleController.getSales);
router.get('/sales/:saleId', auth.isUser, saleController.getSale);
router.get(
  '/sales/seller/:sellerId',
  auth.isUser,
  saleController.getSalesBySeller
);
router.get(
  '/sales/customer/:customerId',
  auth.isUser,
  saleController.getSalesByCustomer
);
router.get('/list', auth.isUser, saleController.listSale);
router.post(
  '/add',
  [
    body('ticketType')
      .isString()
      .trim(),
    body('ticketSerie')
      .isString()
      .trim(),
    body('ticketNumber')
      .isString()
      .trim(),
    body('aggregateDiscount')
      .isNumeric()
      .trim()
  ],
  auth.isSeller,
  saleController.addSale
);
router.put(
  '/update/:saleId',
  [
    body('ticketType')
      .isString()
      .trim(),
    body('ticketSerie')
      .isString()
      .trim(),
    body('ticketNumber')
      .isString()
      .trim(),
    body('aggregateDiscount')
      .isNumeric()
      .trim()
  ],
  auth.isSeller,
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

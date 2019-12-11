const express = require('express');
const { body } = require('express-validator');

const purchaseController = require('../controllers/purchase');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/purchases', auth.isUser, purchaseController.getPurchases);
router.get(
  '/purchases/:purchaseId',
  auth.isUser,
  purchaseController.getPurchase
);
router.get(
  '/purchases/supplier/:supplierId',
  auth.isUser,
  purchaseController.getPurchasesBySupplier
);
router.get('/list', auth.isUser, purchaseController.listPurchase);
router.post(
  '/add',
  [
    body('title')
      .isString()
      .trim(),
    body('description')
      .isString()
      .trim(),
    body('ticketType')
      .isString()
      .trim(),
    body('ticketSerie')
      .isNumeric()
      .trim(),
    body('ticketNumber')
      .isString()
      .trim(),
    body('total')
      .isFloat()
      .trim()
  ],
  auth.isSeller,
  purchaseController.addPurchase
);
router.put(
  '/update/:purchaseId',
  [
    body('title')
      .isString()
      .trim(),
    body('description')
      .isString()
      .trim(),
    body('ticketType')
      .isString()
      .trim(),
    body('ticketSerie')
      .isNumeric()
      .trim(),
    body('ticketNumber')
      .isString()
      .trim(),
    body('total')
      .isFloat()
      .trim()
  ],
  auth.isSeller,
  purchaseController.updatePurchase
);
router.patch(
  '/activate/:purchaseId',
  auth.isAdmin,
  purchaseController.activatePurchase
);
router.patch(
  '/deactivate/:purchaseId',
  auth.isAdmin,
  purchaseController.deactivatePurchase
);
router.delete(
  '/delete/:purchaseId',
  auth.isAdmin,
  purchaseController.deletePurchase
);

module.exports = router;

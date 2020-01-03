const express = require('express');
const { body } = require('express-validator');

const purchaseController = require('../controllers/purchase');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/purchases', auth.isAdmin, auth.isPrime, purchaseController.getPurchases);
router.get(
  '/purchases/:purchaseId',
  auth.isAdmin, auth.isPrime,
  purchaseController.getPurchase
);
router.get(
  '/purchases/supplier/:supplierId',
  auth.isAdmin, auth.isPrime,
  purchaseController.getPurchasesBySupplier
);
router.post(
  '/add',
  [
    body('description')
      .isString()
      .trim(),
    body('ticketType')
      .isString()
      .trim(),
    body('ticketNumber')
      .isString()
      .trim(),
    body('total')
      .isFloat()
      .trim()
  ],
  auth.isAdmin, auth.isPrime,
  purchaseController.addPurchase
);
// router.put(
//   '/update/:purchaseId',
//   [
//     body('description')
//       .isString()
//       .trim(),
//     body('ticketType')
//       .isString()
//       .trim(),
//     body('ticketSerie')
//       .isNumeric()
//       .trim(),
//     body('ticketNumber')
//       .isString()
//       .trim(),
//     body('total')
//       .isFloat()
//       .trim()
//   ],
//   auth.isSeller,
//   purchaseController.updatePurchase
// );
router.patch(
  '/activate/:purchaseId',
  auth.isAdmin, auth.isPrime,
  purchaseController.activatePurchase
);
router.patch(
  '/deactivate/:purchaseId',
  auth.isAdmin, auth.isPrime,
  purchaseController.deactivatePurchase
);
router.delete(
  '/delete/:purchaseId',
  auth.isAdmin, auth.isPrime,
  purchaseController.deletePurchase
);

module.exports = router;

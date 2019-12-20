const express = require('express');
const { body } = require('express-validator');

const purchaseController = require('../controllers/purchase');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/purchases', auth.isAdmin, purchaseController.getPurchases);
router.get(
  '/purchases/:purchaseId',
  auth.isAdmin,
  purchaseController.getPurchase
);
router.get(
  '/purchases/supplier/:supplierId',
  auth.isAdmin,
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
  auth.isAdmin,
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

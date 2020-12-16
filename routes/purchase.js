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
router.get('/purchases-by-date', auth.isAdmin, purchaseController.getPurchasesByDate);
router.get(
  '/purchases/supplier/:supplierId',
  auth.isAdmin, auth.isPrime,
  purchaseController.getPurchasesBySupplier
);
router.post(
  '/add',
  auth.isAdmin, auth.isAdmin,
  purchaseController.addPurchase
);
router.delete(
  '/delete/:purchaseId',
  auth.isAdmin, auth.isPrime,
  purchaseController.deletePurchase
);

module.exports = router;

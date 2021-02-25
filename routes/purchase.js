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
router.get('/purchases-by-filter', auth.isAdmin, purchaseController.getPurchasesByFilter);
router.post('/print', auth.isAdmin, purchaseController.createPDF);
router.post(
  '/add',
  auth.isAdmin,
  purchaseController.addPurchase
);
router.put(
  '/update-status/:purchaseId',
  auth.isAdmin,
  purchaseController.updatePurchaseStatus
);
router.put(
  '/update-status-multiple/:purchaseId',
  auth.isAdmin,
  purchaseController.updatePurchasesStatus
);
router.delete(
  '/delete/:purchaseId',
  auth.isAdmin, auth.isPrime,
  purchaseController.deletePurchase
);

module.exports = router;

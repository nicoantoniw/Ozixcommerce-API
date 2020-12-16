const express = require('express');
const { body } = require('express-validator');

const sellerController = require('../controllers/seller');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/sellers', auth.isAdmin, sellerController.getSellers);
router.get('/sellers/:sellerId', auth.isUser, sellerController.getSeller);
router.get('/sellers/transactions/:sellerId', auth.isUser, sellerController.getSellerTransactions);
router.post(
  '/add',

  auth.isAdmin,
  sellerController.addSeller
);
router.post(
  '/debt/add/:sellerId',
  body('debt')
    .isNumeric()
    .trim(),
  body('description')
    .isString()
    .isLength({ max: 100 }),
  auth.isAdmin,
  sellerController.addDebt
);
router.post(
  '/debt/subtract/:sellerId',
  body('debt')
    .isNumeric()
    .trim(),
  body('description')
    .isString()
    .isLength({ max: 100 }),
  auth.isAdmin,
  sellerController.subtractDebt
);
router.put(
  '/update/:sellerId',

  auth.isAdmin,
  sellerController.updateSeller
);
router.patch(
  '/activate/:sellerId',
  auth.isAdmin,
  sellerController.activateSeller
);
router.patch(
  '/deactivate/:sellerId',
  auth.isAdmin,
  sellerController.deactivateSeller
);
router.delete('/delete/:sellerId', auth.isAdmin, sellerController.deleteSeller);
router.delete('/delete-multiple', auth.isAdmin, sellerController.deleteSellers);

module.exports = router;

const express = require('express');
const { body } = require('express-validator');

const sellerController = require('../controllers/seller');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/sellers', auth.isAdmin, sellerController.getSellers);
router.get('/sellersFS', auth.isUser, sellerController.getSellersForSale);
router.get('/sellers/:sellerId', auth.isUser, sellerController.getSeller);
router.post(
  '/add',
  [
    body('name')
      .isString()
      .isLength({ max: 40 }),
    body('lastName')
      .isString()
      .isLength({ max: 40 }),
    body('typeId')
      .trim()
      .isString(),
    body('numberId')
      .trim()
      .isNumeric(),
    body('address')
      .trim()
      .isString(),
    body('phoneNumber')
      .trim()
      .isNumeric(),
    body('email')
      .trim()
      .isEmail()
  ],
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
  [
    body('name')
      .isString()
      .isLength({ max: 40 }),
    body('lastName')
      .isString()
      .isLength({ max: 40 }),
    body('typeId')
      .trim()
      .isString(),
    body('numberId')
      .trim()
      .isString(),
    body('address')
      .isString(),
    body('phoneNumber')
      .trim()
      .isNumeric(),
    body('email')
      .trim()
      .isEmail()
  ],
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

module.exports = router;

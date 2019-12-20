const express = require('express');
const { body } = require('express-validator');

const productController = require('../controllers/product');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/products', auth.isUser, productController.getProducts);
router.get('/products/:productId', auth.isUser, productController.getProduct);
router.get(
  '/products/category/:categoryId',
  auth.isUser,
  productController.getProductsByCategory
);
router.post(
  '/add',
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 2, max: 40 }),
    body('code')
      .trim()
      .isAlphanumeric(),
    body('description')
      .isString()
      .trim()
      .isLength({ max: 100 }),
    body('price')
      .trim()
      .isNumeric(),
    body('percentage')
      .trim()
      .isNumeric(),
    body('stock')
      .trim()
      .isNumeric()
  ],
  auth.isSeller,
  productController.addProduct
);
router.put(
  '/update/:productId',
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 2, max: 20 }),
    body('code')
      .trim()
      .isAlphanumeric(),
    body('description')
      .isString()
      .trim()
      .isLength({ max: 100 }),
    body('price')
      .trim()
      .isFloat(),
    body('percentage')
      .trim()
      .isNumeric(),
    body('stock')
      .trim()
      .isNumeric()
  ],
  auth.isSeller,
  productController.updateProduct
);
router.patch(
  '/activate/:productId',
  auth.isSeller,
  productController.activateProduct
);
router.patch(
  '/deactivate/:productId',
  auth.isSeller,
  productController.deactivateProduct
);
router.delete(
  '/delete/:productId',
  auth.isSeller,
  productController.deleteProduct
);

module.exports = router;

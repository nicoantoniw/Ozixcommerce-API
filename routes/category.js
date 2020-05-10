const express = require('express');
const { body } = require('express-validator');

const categoryController = require('../controllers/category');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/categories', auth.isUser, categoryController.getCategories);
router.get(
  '/categories/:categoryId',
  auth.isUser,
  categoryController.getCategory
);
router.post(
  '/add',
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 2, max: 40 })
  ],
  auth.isSeller,
  categoryController.addCategory
);
router.put(
  '/update/:categoryId',
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 2, max: 20 })
  ],
  auth.isSeller,
  categoryController.updateCategory
);
router.patch(
  '/activate/:categoryId',
  auth.isAdmin,
  categoryController.activateCategory
);
router.patch(
  '/deactivate/:categoryId',
  auth.isAdmin,
  categoryController.deactivateCategory
);
router.delete(
  '/delete/:categoryId',
  auth.isAdmin,
  categoryController.deleteCategory
);

module.exports = router;

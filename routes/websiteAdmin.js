const express = require('express');
const { body } = require('express-validator');

const websiteAdminController = require('../controllers/websiteAdmin');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/products', websiteAdminController.getWebsiteProducts);
router.get('/featured-products', websiteAdminController.getFeaturedProducts);
router.get('/promotion-products', websiteAdminController.getPromotionProducts);
router.put('/edit', auth.isAdmin, websiteAdminController.editProductWebsiteStatus);

module.exports = router;
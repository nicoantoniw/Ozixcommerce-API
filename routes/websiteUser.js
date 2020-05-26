const express = require('express');
const { body } = require('express-validator');

const websiteUserController = require('../controllers/websiteUser');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/products-perfumerialiliana', auth.isAdmin, websiteUserController.getProductsPerfumeriaLiliana);
router.get('/products-perfumerialiliana/:productId', websiteUserController.getProductPerfumeriaLiliana);
router.get('/cart/:websiteUserId', auth.isWebsiteUser, websiteUserController.getCart);
router.post(
    '/add', auth.isWebsiteUser,
    websiteUserController.addItem
);
router.post(
    '/add-mercadopago-sale', auth.isWebsiteUser,
    websiteUserController.addMercadopagoSale
);
router.patch('/restore', auth.isWebsiteUser, websiteUserController.restoreCart);
router.delete(
    '/delete/:productId', auth.isWebsiteUser,
    websiteUserController.deleteItem
);

module.exports = router;
const express = require('express');
const { body } = require('express-validator');

const websiteUserController = require('../controllers/websiteUser');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/user', auth.isWebsiteUser, websiteUserController.getWebsiteUser);
router.get('/products-perfumerialiliana', auth.isAdmin, websiteUserController.getProductsPerfumeriaLiliana);
router.get('/products-perfumerialiliana/:productId', websiteUserController.getProductPerfumeriaLiliana);
router.get('/cart/:websiteUserId', auth.isWebsiteUser, websiteUserController.getCart);
router.get('/orders', auth.isWebsiteUser, websiteUserController.getOrders);
router.get('/order/:orderId', auth.isWebsiteUser, websiteUserController.getOrder);
router.post(
    '/add', auth.isWebsiteUser,
    websiteUserController.addItem
);
router.post(
    '/add-mercadopago-sale', auth.isWebsiteUser,
    websiteUserController.addMercadopagoSale
);
router.post(
    '/add-last-order', auth.isWebsiteUser,
    websiteUserController.addLastOrder
);
router.post(
    '/send-email', auth.isWebsiteUser,
    websiteUserController.sendEmail
);
router.post(
    '/change-password', auth.isWebsiteUser,
    websiteUserController.changePassword
);
router.put(
    '/update', auth.isWebsiteUser,
    websiteUserController.updateWebsiteUser
);
router.patch('/restore', auth.isWebsiteUser, websiteUserController.restoreCart);
router.delete(
    '/delete/:productId', auth.isWebsiteUser,
    websiteUserController.deleteItem
);

module.exports = router;
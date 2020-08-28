const express = require('express');
const { body } = require('express-validator');

const websiteUserController = require('../controllers/websiteUser');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/user', auth.isWebsiteUser, websiteUserController.getWebsiteUser);
router.get('/products-perfumerialiliana', auth.isAdmin, websiteUserController.getProductsPerfumeriaLiliana);
router.get('/products-perfumerialiliana/:productId', websiteUserController.getProductPerfumeriaLiliana);
router.get('/cart/:websiteUserId', auth.isWebsiteUser, websiteUserController.getCart);
router.get('/quotes', auth.isWebsiteUser, websiteUserController.getQuotes);
router.get('/quote/:quoteId', auth.isWebsiteUser, websiteUserController.getQuote);
router.post(
    '/add', auth.isWebsiteUser,
    websiteUserController.addItem
);
router.post(
    '/add-mercadopago-sale', auth.isWebsiteUser,
    websiteUserController.addMercadopagoSale
);
router.post(
    '/add-last-quote', auth.isWebsiteUser,
    websiteUserController.addLastQuote
);
router.post(
    '/send-email',
    websiteUserController.sendEmail
);
router.post(
    '/change-password', auth.isWebsiteUser,
    websiteUserController.changePassword
);
router.put(
    '/restore-password',
    websiteUserController.restorePassword
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
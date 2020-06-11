const express = require('express');
const { body } = require('express-validator');

const orderController = require('../controllers/order');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/orders', auth.isUser, orderController.getOrders);
router.get('/orders/:orderId', auth.isUser, orderController.getOrder);
router.post(
    '/add', auth.isSeller,
    orderController.addOrder
);
router.post(
    '/add-from-website',
    auth.isWebsiteUser,
    orderController.addOrder
);
router.put(
    '/update/:orderId',

    auth.isSeller,
    orderController.updateOrder
);
router.patch(
    '/status/:orderId',
    // auth.isSeller,
    orderController.changeOrderStatus
);
router.delete(
    '/delete/:orderId',
    auth.isSeller,
    orderController.deleteOrder
);

module.exports = router;

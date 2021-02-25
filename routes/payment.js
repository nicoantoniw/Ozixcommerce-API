const express = require('express');
const { body } = require('express-validator');

const paymentController = require('../controllers/payment');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/payments', auth.isAdmin, paymentController.getPayments);
router.get(
    '/payments/:paymentId',
    auth.isUser,
    paymentController.getPayment
);
router.post(
    '/add',
    auth.isAdmin,
    paymentController.addPayment
);
router.post('/print', auth.isAdmin, paymentController.createPDF);
// router.put(
//     '/update/:paymentId',
//     auth.isAdmin,
//     paymentController.updatePayment
// );
router.delete(
    '/delete/:paymentId',
    auth.isAdmin,
    paymentController.deletePayment
);

module.exports = router;

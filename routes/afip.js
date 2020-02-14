const express = require('express');

const afipController = require('../controllers/afip');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/voucher', auth.isAdmin, afipController.getVoucher);
router.get('/last-voucher', auth.isAdmin, afipController.getLastVoucher);
router.get('/ticket-types', auth.isAdmin, afipController.getVoucherTypes);
router.get('/id-types', auth.isAdmin, afipController.getIdTypes);
router.get('/aloquot-types', auth.isAdmin, afipController.getAloquotTypes);
router.get('/currency-types', auth.isAdmin, afipController.getCurrencyTypes);
router.get('/tax-types', auth.isAdmin, afipController.getTaxTypes);
router.get('/server', auth.isAdmin, afipController.getServerStatus);
router.post(
    '/add',
    auth.isUser,
    afipController.addVoucher
);

module.exports = router;

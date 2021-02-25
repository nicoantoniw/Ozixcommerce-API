const express = require('express');
const { body } = require('express-validator');

const billController = require('../controllers/bill');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/bills', auth.isAdmin, billController.getBills);
router.get('/bills-by-filter', auth.isAdmin, billController.getBillsByFilter);
router.get('/bills/:billId', auth.isAdmin, billController.getBill);
router.post('/print', auth.isAdmin, billController.createPDF);
router.post('/add', auth.isUser, billController.addBill);
router.patch('/activate/:billId', auth.isAdmin, billController.activateBill);
router.delete('/delete/:billId', auth.isAdmin, billController.deleteBill);
// router.delete('/delete-multiple', auth.isAdmin, billController.deleteBills);

module.exports = router;

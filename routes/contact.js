const express = require('express');
const { body } = require('express-validator');

const contactController = require('../controllers/contact');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/contacts', auth.isAdmin, auth.isPrime, contactController.getContacts);
router.get('/suppliers', auth.isAdmin, auth.isPrime, contactController.getSuppliers);
router.get('/customers', auth.isUser, contactController.getCustomers);
router.get('/contacts/:contactId', auth.isUser, auth.isPrime, contactController.getContact);
router.get('/contacts/transactions/:contactId', auth.isUser, contactController.getContactTransactions);
router.post(
  '/add',
  auth.isUser, auth.isPrime, auth.isWebsiteUser,
  contactController.addContact
);
router.post(
  '/debt/add',
  body('debt')
    .isNumeric()
    .trim(),
  body('description')
    .isString()
    .trim()
    .isLength({ max: 100 }),
  auth.isUser, auth.isPrime,
  contactController.addDebt
);
router.post(
  '/debt/subtract',
  body('debt')
    .isNumeric()
    .trim(),
  body('description')
    .isString()
    .trim()
    .isLength({ max: 100 }),
  auth.isUser, auth.isPrime,
  contactController.subtractDebt
);
router.put(
  '/update/:contactId',
  auth.isUser, auth.isPrime,
  contactController.updateContact
);
router.delete('/delete/:contactId', auth.isSeller, auth.isPrime, contactController.deleteContact);
router.delete('/delete-multiple', auth.isSeller, auth.isPrime, contactController.deleteContacts);

module.exports = router;

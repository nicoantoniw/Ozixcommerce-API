const express = require('express');
const { body } = require('express-validator');

const personController = require('../controllers/person');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/suppliers', auth.isAdmin, auth.isPrime, personController.getSuppliers);
router.get('/suppliersFP', auth.isUser, personController.getSuppliersForPurchase);
router.get('/customers', auth.isUser, personController.getCustomers);
router.get('/persons/:personId', auth.isUser, auth.isPrime, personController.getPerson);
router.post(
  '/add',
  auth.isUser, auth.isPrime,
  personController.addPerson
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
  personController.addDebt
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
  personController.subtractDebt
);
router.put(
  '/update/:personId',
  auth.isUser, auth.isPrime,
  personController.updatePerson
);
router.patch(
  '/activate/:personId',
  auth.isUser, auth.isPrime,
  personController.activatePerson
);
router.patch(
  '/deactivate/:personId',
  auth.isUser, auth.isPrime,
  personController.deactivatePerson
);
router.delete('/delete/:personId', auth.isSeller, auth.isPrime, personController.deletePerson);

module.exports = router;

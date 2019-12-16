const express = require('express');
const { body } = require('express-validator');

const personController = require('../controllers/person');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/customers', auth.isUser, personController.getCustomers);
router.get('/suppliers', auth.isUser, personController.getSuppliers);
router.get('/persons/:personId', auth.isUser, personController.getPerson);
router.get('/list/customers', auth.isUser, personController.listCustomer);
router.get('/list/suppliers', auth.isUser, personController.listSupplier);
router.post(
  '/add',
  [

    body('company')
      .trim()
      .isString(),

  ],
  auth.isSeller,
  personController.addPerson
);
router.post(
  '/debt/add/:personId',
  body('debt')
    .isNumeric()
    .trim(),
  body('description')
    .isString()
    .trim()
    .isLength({ max: 100 }),
  auth.isAdmin,
  personController.addDebt
);
router.post(
  '/debt/subtract/:personId',
  body('debt')
    .isNumeric()
    .trim(),
  body('description')
    .isString()
    .trim()
    .isLength({ max: 100 }),
  auth.isAdmin,
  personController.subtractDebt
);
router.put(
  '/update/:personId',
  [
    body('company')
      .trim()
      .isString()
  ],
  auth.isSeller,
  personController.updatePerson
);
router.patch(
  '/activate/:personId',
  auth.isAdmin,
  personController.activatePerson
);
router.patch(
  '/deactivate/:personId',
  auth.isAdmin,
  personController.deactivatePerson
);
router.delete('/delete/:personId', auth.isAdmin, personController.deletePerson);

module.exports = router;

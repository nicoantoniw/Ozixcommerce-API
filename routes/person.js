const express = require('express');
const { body } = require('express-validator');

const personController = require('../controllers/person');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/customers', auth.isUser, personController.getCustomers);
router.get('/suppliers', auth.isAdmin, personController.getSuppliers);
router.get('/persons/:personId', auth.isUser, personController.getPerson);
router.post(
  '/add',
  [

    body('company')
      .trim()
      .isString(),

  ],
  auth.isUser,
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
  auth.isUser,
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
  auth.isUser,
  personController.subtractDebt
);
router.put(
  '/update/:personId',
  [
    body('company')
      .trim()
      .isString()
  ],
  auth.isUser,
  personController.updatePerson
);
router.patch(
  '/activate/:personId',
  auth.isUser,
  personController.activatePerson
);
router.patch(
  '/deactivate/:personId',
  auth.isUser,
  personController.deactivatePerson
);
router.delete('/delete/:personId', auth.isSeller, personController.deletePerson);

module.exports = router;

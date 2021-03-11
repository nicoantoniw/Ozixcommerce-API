const express = require('express');
const { body } = require('express-validator');

const creditNoteController = require('../controllers/creditNote');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/credit-notes', auth.isAdmin, creditNoteController.getCreditNotes);
router.get('/credit-notes-by-contact/:contactId', auth.isAdmin, creditNoteController.getCreditNotesByContact);
router.get('/credit-notes/:creditNoteId', auth.isAdmin, creditNoteController.getCreditNote);
router.post('/print', auth.isAdmin, creditNoteController.createPDF);
router.post('/add', auth.isUser, creditNoteController.addCreditNote);
router.post('/apply', auth.isUser, creditNoteController.applyCredit);
router.delete('/delete/:creditNoteId', auth.isAdmin, creditNoteController.deleteCreditNote);

module.exports = router;
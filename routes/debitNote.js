const express = require('express');
const { body } = require('express-validator');

const debitNoteController = require('../controllers/debitNote');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/debit-notes', auth.isAdmin, debitNoteController.getDebitNotes);
router.get('/debit-notes-by-contact/:contactId', auth.isAdmin, debitNoteController.getDebitNotesByContact);
router.get('/debit-notes/:debitNoteId', auth.isAdmin, debitNoteController.getDebitNote);
router.post('/print', auth.isAdmin, debitNoteController.createPDF);
router.post('/add', auth.isUser, debitNoteController.addDebitNote);
router.post('/apply', auth.isUser, debitNoteController.applyDebit);
router.delete('/delete/:debitNoteId', auth.isAdmin, debitNoteController.deleteDebitNote);

module.exports = router;
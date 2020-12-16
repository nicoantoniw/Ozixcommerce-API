const express = require('express');
const { body } = require('express-validator');

const quoteController = require('../controllers/quote');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/quotes', auth.isAdmin, quoteController.getQuotes);
router.get('/quotes-by-filter', auth.isAdmin, quoteController.getQuotesByFilter);
router.get('/quotes/:quoteId', auth.isAdmin, quoteController.getQuote);
router.post('/print', quoteController.createPDF);
router.post(
    '/add',
    auth.isUser,
    quoteController.addQuote
);
router.put(
    '/update/:quoteId',
    auth.isAdmin,
    quoteController.updateQuote
);
router.delete('/delete/:quoteId', auth.isAdmin, quoteController.deleteQuote);
router.delete('/delete-multiple', auth.isAdmin, quoteController.deleteQuotes);

module.exports = router;

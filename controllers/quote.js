const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const moment = require('moment');

const Quote = require('../models/quote');
const Product = require('../models/product');
const Group = require('../models/group');
const Account = require('../models/account');

exports.getQuotes = async (req, res, next) => {
    try {
        const totalQuotes = await Quote.find({
            creator: req.groupId
        }).countDocuments();
        const quotes = await Quote.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('customer', { name: 1, _id: 1 })
            .sort({ number: -1 });

        if (totalQuotes === 0) {
            const error = new Error('No quotes found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            quotes,
            totalQuotes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getQuotesByFilter = async (req, res, next) => {
    let quotes;
    let dateFrom;
    let dateTo;
    if (req.query.dateFrom != null) {
        dateFrom = moment.utc(req.query.dateFrom).toISOString();
    } if (req.query.dateTo != null) {
        dateTo = moment.utc(req.query.dateTo).toISOString();
    }
    let customer = req.query.customer;
    if (!customer) {
        customer = '';
    }
    try {
        if (dateFrom === null && dateTo === null && customer != '') {
            quotes = await Quote.find({ customer: customer, creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer', { name: 1, _id: 1 })
                .sort({ number: -1 });
        } else if (customer === '' && dateFrom != null && dateTo != null) {
            quotes = await Quote.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer', { name: 1, _id: 1 })
                .sort({ number: -1 });
        } else if (dateFrom != null && dateTo != null && customer != '') {
            quotes = await Quote.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer', { name: 1, _id: 1 })
                .sort({ number: -1 });
        } else {
            quotes = await Quote.find({ creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer', { name: 1, _id: 1 })
                .sort({ number: -1 });
        }
        if (quotes.length < 1) {
            const error = new Error('No quotes found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            quotes
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getQuote = async (req, res, next) => {
    const quoteId = req.params.quoteId;
    try {
        const quote = await Quote.findById(quoteId)
            .populate('creator', { name: 1, _id: 1 })
            .populate('customer', { name: 1, _id: 1 });
        if (!quote) {
            const error = new Error('No quote found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            quote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addQuote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        const quote = new Quote({
            number: req.body.quote.number,
            details: req.body.quote.details,
            total: req.body.quote.total,
            subtotal: req.body.quote.subtotal,
            taxes: req.body.quote.taxes,
            discounts: Number(req.body.quote.discounts),
            creator: req.groupId,
            description: req.body.quote.description,
            customer: req.body.quote.customer,
            dueDate: moment.utc(req.body.quote.dueDate),
            createdAt: moment.utc(req.body.quote.createdAt)
        });
        await quote.save();
        res.status(200).json({
            message: 'quote created.',
            quote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPDF = (req, res, next) => {
    let date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    if (day < 10) {
        day = `0${day}`;
    }
    if (month === 13) {
        month = 1;
        year = year + 1;
    }
    if (month < 10) {
        month = `0${month}`;
    }
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const pdfDocA4 = new PDFDocument({
        size: 'A4',
        margins: {
            top: 25,
            bottom: 20,
            left: 20,
            right: 30,
        }
    });
    const number = 40001;
    pdfDocA4.pipe(
        fs.createWriteStream(path.join('assets', `${day}-${month}-${year}::${hour}:${minutes}:${seconds}`))
    );
    pdfDocA4.pipe(res);
    pdfDocA4.fontSize(50).text('                               A');
    pdfDocA4.fontSize(12).text('                                                                                          COD. 01');
    pdfDocA4.rect(250, 20, 75, 65).stroke();
    //derecha
    pdfDocA4.fontSize(20).text('FACTURA', { align: 'right' });
    pdfDocA4.fontSize(18).text('ORIGINAL', { align: 'right' });
    pdfDocA4.fontSize(12).text('numero comprobante', { align: 'right' });
    pdfDocA4.fontSize(12).text('fecha emision', { align: 'right' });
    pdfDocA4.fontSize(12).text('categoria tributaria', { align: 'right' });
    pdfDocA4.fontSize(12).text('cuit', { align: 'right' });
    pdfDocA4.fontSize(12).text('ingresos brutos', { align: 'right' });
    pdfDocA4.fontSize(12).text('inicio actividades', { align: 'right' });
    // izquierda
    //logo
    pdfDocA4.fontSize(12).text(' razon social');
    pdfDocA4.fontSize(12).text(' domicilio');
    pdfDocA4.fontSize(12).text(' localidad, provincia');
    pdfDocA4.rect(pdfDocA4.x, 20, 560, pdfDocA4.y).stroke();
    pdfDocA4.fontSize(12).text(' ');
    pdfDocA4.fontSize(12).text(' ');
    pdfDocA4.fontSize(12).text(' ');
    pdfDocA4.fontSize(12).text('  razon social cliente');
    pdfDocA4.fontSize(12).text('  domicilio');
    pdfDocA4.fontSize(12).text('  localidad, provincia', { lineGap: -33 });
    //derecha
    pdfDocA4.fontSize(12).text('resp. iva', { align: 'center' });
    pdfDocA4.fontSize(12).text('cuit', { align: 'center' });
    pdfDocA4.fontSize(12).text('condicion de venta', { align: 'center' });
    pdfDocA4.rect(pdfDocA4.x, 20, 560, pdfDocA4.y).stroke();
    pdfDocA4.fontSize(12).text(' ');
    pdfDocA4.fontSize(12).text(' ');
    pdfDocA4.fontSize(12).text('      Codigo                   Descripcion                Cantidad      Precio Unit.     % Bonif   Alicuota        Total');
    pdfDocA4.fontSize(12).text('                                                                                                                                     IVA ');
    pdfDocA4.fontSize(10).text(`  `);
    pdfDocA4.fontSize(10).text(`                   ${number}00`);
    pdfDocA4.rect(20, 377, 80, 40).stroke();
    pdfDocA4.rect(100, 377, 150, 40).stroke();
    pdfDocA4.rect(250, 377, 65, 40).stroke();
    pdfDocA4.rect(315, 377, 85, 40).stroke();
    pdfDocA4.rect(400, 377, 50, 40).stroke();
    pdfDocA4.rect(450, 377, 50, 40).stroke();
    pdfDocA4.rect(500, 377, 80, 40).stroke();
    details.forEach(detail => {
        pdfDocA4.fontSize(10).text(`${detail.quantity},000 x ${detail.price / detail.quantity}`);
        pdfDocA4.fontSize(10).text(`${detail.product}`, { lineGap: -10, align: 'left' });
        pdfDocA4.fontSize(10).text(`$${detail.price}`, { align: 'right' });
    });
    pdfDocA4.rect(pdfDocA4.x, 20, 560, pdfDocA4.y).stroke();
    pdfDocA4.fontSize(10).text(`  `);
    pdfDocA4.fontSize(10).text(`TOTAL:`, { lineGap: -10, align: 'bottom' });
    pdfDocA4.fontSize(10).text(`$652000`, { align: 'right' });
    pdfDocA4.end();
};

exports.updateQuote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    const quoteId = req.params.quoteId;
    try {
        const quote = await Quote.findById(quoteId)
            .populate('creator', { name: 1, _id: 1 })
            .populate('customer', { name: 1, _id: 1 });
        if (!quote) {
            const error = new Error('Could not find any quote');
            error.statusCode = 404;
            throw error;
        }
        if (quote.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        const details = {
            product: req.body.product,
            quantity: req.body.quantity,
            price: req.body.price
        };
        quote.ticketType = req.body.ticketType;
        quote.ticketNumber = req.body.ticketNumber;
        quote.total = req.body.total;
        quote.aggregateDiscount = req.body.aggregateDiscount;
        quote.details = details;

        await quote.save();
        res.status(200).json({
            message: 'quote updated.',
            quote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteQuote = async (req, res, next) => {
    const quoteId = req.params.quoteId;
    try {
        const quote = await Quote.findById(quoteId);
        if (!quote) {
            const error = new Error('Could not find any quote');
            error.statusCode = 404;
            throw error;
        }
        if (quote.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await quote.remove();
        const totalQuotes = await Quote.find().countDocuments();
        res.status(200).json({
            message: 'quote deleted',
            totalQuotes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
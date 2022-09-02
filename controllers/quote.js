const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const Quote = require('../models/quote');
const Contact = require('../models/contact');
const Product = require('../models/product');
const Group = require('../models/group');
const Account = require('../models/account');

AWS.config.loadFromPath('/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/config.json');

exports.getQuotes = async (req, res, next) => {
    try {
        const totalQuotes = await Quote.find({
            creator: req.groupId
        }).countDocuments();
        const quotes = await Quote.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('customer')
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
    let dateFrom = req.query.dateFrom;
    let dateTo = req.query.dateTo;
    let customer = req.query.customer;
    if (!customer) {
        customer = '';
    }
    if (req.query.dateFrom) {
        dateFrom = moment.utc(req.query.dateFrom).toISOString();
    } else {
        dateFrom = null;
    }
    if (req.query.dateTo) {
        dateTo = moment.utc(req.query.dateTo).toISOString();
    } else {
        dateTo = null;
    }
    try {
        if (dateFrom === null && dateTo === null && customer != '') {
            quotes = await Quote.find({ customer: customer, creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer')
                .sort({ number: -1 });
        } else if (customer === '' && dateFrom != null && dateTo != null) {
            quotes = await Quote.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer')
                .sort({ number: -1 });
        } else if (dateFrom != null && dateTo != null && customer != '') {
            quotes = await Quote.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer')
                .sort({ number: -1 });
        } else {
            quotes = await Quote.find({ creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('customer')
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
            .populate('customer');
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

        const contact = await Contact.findById(req.body.quote.customer);
        if (contact.type === 'None') {
            contact.type = 'Customer';
            await contact.save();
        } else if (contact.type === 'Supplier') {
            contact.type = 'All';
            await contact.save();
        }

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
        quote.number = req.body.quote.number;
        quote.details = req.body.quote.details;
        quote.total = req.body.quote.total;
        quote.subtotal = req.body.quote.subtotal;
        quote.taxes = req.body.quote.taxes;
        quote.discounts = Number(req.body.quote.discounts);
        quote.description = req.body.quote.description;
        quote.customer = req.body.quote.customer;
        quote.dueDate = moment.utc(req.body.quote.dueDate);
        quote.createdAt = moment.utc(req.body.quote.createdAt);

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

exports.deleteQuotes = async (req, res, next) => {
    const quotes = req.body.quotes;
    try {
        for (let index = 0; index < quotes.length; index++) {
            const element = quotes[index];
            const quote = await Quote.findById(element._id);
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
        }
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

exports.createPDF = async (req, res, next) => {
    const quote = req.body.quote;
    const groupId = req.groupId;
    const subject = req.body.subject;
    const sender = 'nicolasantoniw@gmail.com';
    const receiver = req.body.receiver;
    const html = req.body.html;
    const sendPdf = req.body.sendPdf;
    const deletePdf = req.query.delete;
    const quoteName = `QUOTE-${quote.number}.pdf`;
    if (quote.total[0] === "$") {
        quote.total = req.body.quote.total.substring(1);
    }
    if (Number.isInteger(quote.taxes)) {
        quote.taxes = quote.taxes.toFixed(2);
    }
    if (Number.isInteger(quote.subtotal)) {
        quote.subtotal = quote.subtotal.toFixed(2);
    }
    if (Number.isInteger(quote.total)) {
        quote.total = quote.total.toFixed(2);
    }
    if (quote.total[0] === "$") {
        quote.total = req.body.quote.total.substring(1);
    }
    const fonts = {
        Helvetica: {
            normal: 'Helvetica',
            bold: 'Helvetica-Bold',
            italics: 'Helvetica-Oblique',
            bolditalics: 'Helvetica-BoldOblique'
        },
    };
    if (sendPdf) {
        sendQuote(subject, sender, receiver, quoteName, html);
        return res.status(200).json({
            message: 'pdf sent'
        });
    } else {

        const printer = new PdfMake(fonts);
        let docDefinition;
        const group = await Group.findById(groupId);
        if (group.hasLogo) {
            //here convert image
            let base64Str = '';
            const s3 = new AWS.S3();
            const params = {
                Bucket: 'ozixcommerce.com-images',
                Key: group.logo.key
            };

            s3.getObject(
                params, function (error, data) {
                    if (error != null) {
                        console.log(error);
                    } else {
                        base64Str = data.Body.toString('base64');
                    }
                }
            );
            setTimeout(() => {
                docDefinition = {
                    content: [
                        {
                            columns: [
                                {
                                    image:
                                        `data:image/png;base64,${base64Str}`,
                                    width: 150,
                                },
                                [
                                    {
                                        text: 'Quote',
                                        color: '#333333',
                                        width: '*',
                                        fontSize: 28,
                                        bold: true,
                                        alignment: 'right',
                                        margin: [0, 0, 0, 15],
                                    },
                                    {
                                        stack: [
                                            {
                                                columns: [
                                                    {
                                                        text: 'Quote No.',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${quote.number}`,
                                                        bold: true,
                                                        color: '#333333',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        width: 120,
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                ],
                                            },
                                            {
                                                columns: [
                                                    {
                                                        text: 'Date Issued',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${quote.createdAt}`,
                                                        bold: true,
                                                        color: '#333333',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        width: 120,
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                ],
                                            },
                                            {
                                                columns: [
                                                    {
                                                        text: 'Due Date',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        width: '*',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${quote.dueDate}`,
                                                        bold: true,
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        color: '#333333',
                                                        width: 120,
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            ],
                            margin: [0, 0, 0, 50]
                        },
                        table(quote.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
                        '\n',
                        '\n\n',
                        {
                            layout: {
                                defaultBorder: false,
                                hLineWidth: function (i, node) {
                                    return 1;
                                },
                                vLineWidth: function (i, node) {
                                    return 1;
                                },
                                hLineColor: function (i, node) {
                                    return '#eaeaea';
                                },
                                vLineColor: function (i, node) {
                                    return '#eaeaea';
                                },
                                hLineStyle: function (i, node) {
                                    // if (i === 0 || i === node.table.body.length) {
                                    return null;
                                    //}
                                },
                                // vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
                                paddingLeft: function (i, node) {
                                    return 10;
                                },
                                paddingRight: function (i, node) {
                                    return 10;
                                },
                                paddingTop: function (i, node) {
                                    return 3;
                                },
                                paddingBottom: function (i, node) {
                                    return 3;
                                },
                                fillColor: function (rowIndex, node, columnIndex) {
                                    return '#fff';
                                },
                            },
                            table: {
                                headerRows: 1,
                                widths: ['*', 'auto'],
                                body: [
                                    [
                                        {
                                            text: 'Subtotal',
                                            border: [false, true, false, true],
                                            alignment: 'right',
                                            margin: [0, 5, 0, 5],
                                        },
                                        {
                                            border: [false, true, false, true],
                                            text: `$${quote.subtotal}`,
                                            alignment: 'right',
                                            fillColor: '#f5f5f5',
                                            margin: [0, 5, 0, 5],
                                        },
                                    ],
                                    [
                                        {
                                            text: 'Taxes',
                                            border: [false, false, false, true],
                                            alignment: 'right',
                                            margin: [0, 5, 0, 5],
                                        },
                                        {
                                            text: `$${quote.taxes}`,
                                            border: [false, false, false, true],
                                            fillColor: '#f5f5f5',
                                            alignment: 'right',
                                            margin: [0, 5, 0, 5],
                                        },
                                    ],
                                    [
                                        {
                                            text: 'Total',
                                            bold: true,
                                            fontSize: 20,
                                            alignment: 'right',
                                            border: [false, false, false, true],
                                            margin: [0, 5, 0, 5],
                                        },
                                        {
                                            text: `$${quote.total}`,
                                            bold: true,
                                            fontSize: 20,
                                            alignment: 'right',
                                            border: [false, false, false, true],
                                            fillColor: '#f5f5f5',
                                            margin: [0, 5, 0, 5],
                                        },
                                    ],
                                ],
                            },
                        },

                    ],
                    styles: {
                        notesTitle: {
                            fontSize: 10,
                            bold: true,
                            margin: [0, 50, 0, 3],
                        },
                        notesText: {
                            fontSize: 10,
                        },
                    },
                    defaultStyle: {
                        columnGap: 20,
                        font: 'Helvetica',
                    },

                };
                let pdfDoc = printer.createPdfKitDocument(docDefinition);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader(`Content-Disposition`, `inline; filename= ${quoteName}`);
                if (!deletePdf) {
                    pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'quote.pdf')));
                }
                pdfDoc.pipe(res);
                pdfDoc.end();
            }, 5000);
        }
        else {

            docDefinition = {
                content: [
                    {
                        columns: [

                            [
                                {
                                    text: 'Quote',
                                    color: '#333333',
                                    width: '*',
                                    fontSize: 28,
                                    bold: true,
                                    alignment: 'right',
                                    margin: [0, 0, 0, 15],
                                },
                                {
                                    stack: [
                                        {
                                            columns: [
                                                {
                                                    text: 'Quote No.',
                                                    color: '#aaaaab',
                                                    bold: true,
                                                    width: '*',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    margin: [0, 0, 0, 5],
                                                },
                                                {
                                                    text: `${quote.number}`,
                                                    bold: true,
                                                    color: '#333333',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    width: 120,
                                                    margin: [0, 0, 0, 5],
                                                },
                                            ],
                                        },
                                        {
                                            columns: [
                                                {
                                                    text: 'Date Issued',
                                                    color: '#aaaaab',
                                                    bold: true,
                                                    width: '*',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    margin: [0, 0, 0, 5],
                                                },
                                                {
                                                    text: `${quote.createdAt}`,
                                                    bold: true,
                                                    color: '#333333',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    width: 120,
                                                    margin: [0, 0, 0, 5],
                                                },
                                            ],
                                        },
                                        {
                                            columns: [
                                                {
                                                    text: 'Due Date',
                                                    color: '#aaaaab',
                                                    bold: true,
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    width: '*',
                                                    margin: [0, 0, 0, 5],
                                                },
                                                {
                                                    text: `${quote.dueDate}`,
                                                    bold: true,
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    color: '#333333',
                                                    width: 120,
                                                    margin: [0, 0, 0, 5],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        ],
                        margin: [0, 0, 0, 50]
                    },
                    table(quote.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
                    '\n',
                    '\n\n',
                    {
                        layout: {
                            defaultBorder: false,
                            hLineWidth: function (i, node) {
                                return 1;
                            },
                            vLineWidth: function (i, node) {
                                return 1;
                            },
                            hLineColor: function (i, node) {
                                return '#eaeaea';
                            },
                            vLineColor: function (i, node) {
                                return '#eaeaea';
                            },
                            hLineStyle: function (i, node) {
                                // if (i === 0 || i === node.table.body.length) {
                                return null;
                                //}
                            },
                            // vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
                            paddingLeft: function (i, node) {
                                return 10;
                            },
                            paddingRight: function (i, node) {
                                return 10;
                            },
                            paddingTop: function (i, node) {
                                return 3;
                            },
                            paddingBottom: function (i, node) {
                                return 3;
                            },
                            fillColor: function (rowIndex, node, columnIndex) {
                                return '#fff';
                            },
                        },
                        table: {
                            headerRows: 1,
                            widths: ['*', 'auto'],
                            body: [
                                [
                                    {
                                        text: 'Subtotal',
                                        border: [false, true, false, true],
                                        alignment: 'right',
                                        margin: [0, 5, 0, 5],
                                    },
                                    {
                                        border: [false, true, false, true],
                                        text: `$${quote.subtotal}`,
                                        alignment: 'right',
                                        fillColor: '#f5f5f5',
                                        margin: [0, 5, 0, 5],
                                    },
                                ],
                                [
                                    {
                                        text: 'Taxes',
                                        border: [false, false, false, true],
                                        alignment: 'right',
                                        margin: [0, 5, 0, 5],
                                    },
                                    {
                                        text: `$${quote.taxes}`,
                                        border: [false, false, false, true],
                                        fillColor: '#f5f5f5',
                                        alignment: 'right',
                                        margin: [0, 5, 0, 5],
                                    },
                                ],
                                [
                                    {
                                        text: 'Total',
                                        bold: true,
                                        fontSize: 20,
                                        alignment: 'right',
                                        border: [false, false, false, true],
                                        margin: [0, 5, 0, 5],
                                    },
                                    {
                                        text: `$${quote.total}`,
                                        bold: true,
                                        fontSize: 20,
                                        alignment: 'right',
                                        border: [false, false, false, true],
                                        fillColor: '#f5f5f5',
                                        margin: [0, 5, 0, 5],
                                    },
                                ],
                            ],
                        },
                    },

                ],
                styles: {
                    notesTitle: {
                        fontSize: 10,
                        bold: true,
                        margin: [0, 50, 0, 3],
                    },
                    notesText: {
                        fontSize: 10,
                    },
                },
                defaultStyle: {
                    columnGap: 20,
                    font: 'Helvetica',
                },

            };
            let pdfDoc = printer.createPdfKitDocument(docDefinition);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(`Content-Disposition`, `inline; filename= ${quoteName}`);
            if (!deletePdf) {
                pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'quote.pdf')));
            }
            pdfDoc.pipe(res);
            pdfDoc.end();
        }

    }
};

const sendQuote = (subject, sender, receiver, filename, html) => {
    const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/quote.pdf`);
    let ses_mail = "From: <" + sender + ">\n";
    ses_mail += "To: " + receiver + "\n";
    ses_mail += "Subject: " + subject + "\n";
    ses_mail += "MIME-Version: 1.0\n";
    ses_mail += "Content-Type: multipart/mixed; boundary=\"NextPart\"\n\n";
    ses_mail += "--NextPart\n";
    ses_mail += "Content-Type: text/html\n\n";
    ses_mail += `${html}\n\n`;
    ses_mail += "--NextPart\n";
    ses_mail += `Content-Type: application/octet-stream; name=\"${filename}\"\n`;
    ses_mail += "Content-Transfer-Encoding: base64\n";
    ses_mail += "Content-Disposition: attachment\n\n";
    ses_mail += data.toString("base64").replace(/([^\0]{76})/g, "$1\n") + "\n\n";
    ses_mail += "--NextPart--";

    const params = {
        RawMessage: { Data: ses_mail },
        Destinations: [receiver],
        Source: "'AWS SES Attchament Configuration' <" + sender + ">'"
    };

    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendRawEmail(params).promise();

    sendPromise.then(
        (data) => {
            fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/quote.pdf`);
            return;
        }).catch(
            (err) => {
                console.error(err, err.stack);
            });
};

const buildTableBody = (details, columns) => {
    const body = [];
    body.push([{
        text: 'Item',
        fillColor: '#eaf2f5',
        border: [false, true, false, true],
        margin: [0, 5, 0, 5],

    },
    {
        text: 'Quantity',
        border: [false, true, false, true],
        alignment: 'left',
        fillColor: '#eaf2f5',
        margin: [0, 5, 0, 5],

    },
    {
        text: 'Unit Price',
        border: [false, true, false, true],
        alignment: 'right',
        fillColor: '#eaf2f5',
        margin: [0, 5, 0, 5],

    },
    {
        text: 'Discount',
        border: [false, true, false, true],
        alignment: 'right',
        fillColor: '#eaf2f5',
        margin: [0, 5, 0, 5],

    },
    {
        text: 'Amount',
        border: [false, true, false, true],
        alignment: 'right',
        fillColor: '#eaf2f5',
        margin: [0, 5, 0, 5],

    }]);

    for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        const dataRow = [];
        if (Number.isInteger(detail.price)) {
            detail.price = detail.price.toFixed(2);
        }
        if (Number.isInteger(detail.product.sellingPrice)) {
            detail.product.sellingPrice = detail.product.sellingPrice.toFixed(2);
        }
        if (Number.isInteger(detail.discount)) {
            detail.discount = detail.discount.toFixed(2);
        }
        for (let o = 0; o < columns.length; o++) {
            const column = columns[o];

            if (column === 'Item') {
                dataRow.push({
                    text: detail['product']['name'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'left',
                });
            } else if (column === 'Quantity') {
                dataRow.push({
                    text: detail['quantity'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'left',
                });
            } else if (column === 'Unit Price') {
                dataRow.push({
                    text: detail['product']['sellingPrice'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'right',
                });
            } else if (column === 'Discount') {
                dataRow.push({
                    text: detail['discount'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'right',
                });
            } else if (column === 'Amount') {
                dataRow.push({
                    text: detail['price'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'right',
                });
            }
        }
        body.push(dataRow);
    }
    return body;
};

const table = (details, columns) => {
    return {
        table: {
            headerRows: 1,
            widths: ['*', 80, 'auto', 'auto', 'auto'],
            body: buildTableBody(details, columns)
        },
        layout: {
            defaultBorder: false,
            hLineWidth: function (i, node) {
                return 1;
            },
            vLineWidth: function (i, node) {
                return 1;
            },
            hLineColor: function (i, node) {
                if (i === 1 || i === 0) {
                    return '#bfdde8';
                }
                return '#eaeaea';
            },
            vLineColor: function (i, node) {
                return '#eaeaea';
            },
            hLineStyle: function (i, node) {
                // if (i === 0 || i === node.table.body.length) {
                return null;
                //}
            },
            // vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
            paddingLeft: function (i, node) {
                return 10;
            },
            paddingRight: function (i, node) {
                return 10;
            },
            paddingTop: function (i, node) {
                return 2;
            },
            paddingBottom: function (i, node) {
                return 2;
            },
            fillColor: function (rowIndex, node, columnIndex) {
                return '#fff';
            },
        }
    };
};
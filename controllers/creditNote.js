const fs = require('fs');
const path = require('path');

const { validationResult, body } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const CreditNote = require('../models/creditNote');
const Invoice = require('../models/invoice');
const Product = require('../models/product');
const Contact = require('../models/contact');
const Group = require('../models/group');
const Account = require('../models/account');
const Notification = require('../models/notification');

AWS.config.update({
    region: 'us-east-1',
    accessKeyId: 'AKIAJFUT6AOGGD44UV7Q',
    secretAccessKey: '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'
});

exports.getCreditNotes = async (req, res, next) => {
    try {
        const totalCreditNotes = await CreditNote.find({
            creator: req.groupId
        }).countDocuments();
        const creditNotes = await CreditNote.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('contact', { name: 1, email: 1, _id: 1 })
            .sort({ number: -1 });

        if (totalCreditNotes === 0) {
            const error = new Error('No creditNotes found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            creditNotes,
            totalCreditNotes,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getCreditNotesByContact = async (req, res, next) => {
    try {
        const totalCreditNotes = await CreditNote.find({
            creator: req.groupId,
            contact: req.params.contactId,
            $or: [{ status: 'Partially Paid' }, { status: 'Unpaid' }]
        }).countDocuments();
        const creditNotes = await CreditNote.find({
            creator: req.groupId,
            contact: req.params.contactId,
            $or: [{ status: 'Partially Paid' }, { status: 'Unpaid' }]
        })
            .populate('creator', { name: 1, _id: 1 })
            .populate('contact', { name: 1, email: 1, _id: 1 })
            .sort({ number: -1 });

        if (totalCreditNotes === 0) {
            const error = new Error('No creditNotes found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            creditNotes,
            totalCreditNotes,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getCreditNote = async (req, res, next) => {
    const creditNoteId = req.params.creditNoteId;
    try {
        const creditNote = await CreditNote.findById(creditNoteId)
            .populate('creator', { name: 1, _id: 1 })
            .populate('contact', { name: 1, _id: 1, email: 1 });
        if (!creditNote) {
            const error = new Error('No creditNote found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            creditNote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addCreditNote = async (req, res, next) => {
    let result;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        const creditNote = new CreditNote({
            number: req.body.creditNote.number,
            details: req.body.creditNote.details,
            total: Number(req.body.creditNote.total),
            due: Number(req.body.creditNote.total),
            subtotal: req.body.creditNote.subtotal,
            taxes: req.body.creditNote.taxes,
            discounts: Number(req.body.creditNote.discounts),
            creator: req.groupId,
            contact: req.body.creditNote.contact,
            createdAt: moment.utc(req.body.creditNote.createdAt)
        });

        if (req.body.fromInvoice) {
            const creditNotes = await CreditNote.find({ creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('contact', { name: 1, _id: 1, email: 1 })
                .sort({ number: -1 });
            const creditNote2 = creditNotes[0];
            creditNote.number = Number(creditNote2.number) + 1;

            const invoice = await Invoice.findById(req.body.invoice);
            invoice.status = 'Paid';
            invoice.paid = creditNote.total;
            invoice.due = 0;
            await invoice.save();
            CreditNote.status = 'Paid';
            CreditNote.paid = creditNote.total;
            CreditNote.due = 0;
        }
        //contact
        const contact = await Contact.findById(creditNote.contact);
        if (contact.type === 'None') {
            contact.type = 'Customer';
        } else if (contact.type === 'Supplier') {
            contact.type = 'All';
        }
        if (req.body.shipToAddressCheckbox) {
            creditNote.shippingAddress = req.body.creditNote.shippingAddress;
        }
        contact.totalDebt -= Math.round((creditNote.total + Number.EPSILON) * 100) / 100;
        if (contact.totalDebt > 0) {
            contact.owes = contact.totalDebt;
            contact.credit = 0;
        } else if (contact.totalDebt < 0) {
            contact.credit = contact.totalDebt * -1;
            contact.owes = 0;
        } else {
            contact.owes = 0;
            contact.credit = 0;
        }

        // accounts receivable
        let account = await Account.findOne({ code: 1100 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= creditNote.total;
        account.movements.push({
            transactionRef: 'CreditNote',
            transaction: creditNote._id,
            date: creditNote.createdAt,
            description: `Credit Note # ${creditNote.number}`,
            amount: creditNote.total
        });
        await account.save();

        // sales tax account
        account = await Account.findOne({ code: 1400 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= creditNote.taxes;
        account.movements.push({
            transactionRef: 'CreditNote',
            transaction: creditNote._id,
            date: creditNote.createdAt,
            description: `Credit Note # ${creditNote.number}`,
            amount: creditNote.taxes
        });
        await account.save();

        if (creditNote.details.length > 0) {
            for (let i = 0; i < creditNote.details.length; i++) {
                const detail = creditNote.details[i];
                if (detail.product.trackItem) {
                    result = await increaseStock(detail.product, Number(detail.quantity), detail.location);
                }
                if (result) {
                    const notification = new Notification({
                        description: `Product '${detail.product.name}' ran out of stock in location '${result}'`,
                        importance: 'moderate',
                        creator: req.groupId
                    });
                    await notification.save();
                }
                // product sales account
                account = await Account.findById(detail.product.salesAccount);
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= detail.price;
                account.movements.push({
                    transactionRef: 'CreditNote',
                    transaction: creditNote._id,
                    date: creditNote.createdAt,
                    description: `Credit Note # ${creditNote.number}`,
                    amount: detail.price
                });
                await account.save();

                // product cost of goods account
                if (detail.product.trackItem) {
                    account = await Account.findById(detail.product.costOfGoodsAccount);
                    if (!account) {
                        const error = new Error('Could not find any account');
                        error.statusCode = 404;
                        throw error;
                    }
                    account.balance += detail.product.price * detail.quantity;
                    account.movements.push({
                        transactionRef: 'CreditNote',
                        transaction: creditNote._id,
                        date: creditNote.createdAt,
                        description: `Credit Note # ${creditNote.number}`,
                        amount: detail.product.price * detail.quantity
                    });
                    await account.save();
                }
            }
        }
        await contact.save();
        await creditNote.save();
        res.status(200).json({
            message: 'Credit Note created.',
            creditNote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.applyCredit = async (req, res, next) => {
    const totalCreditToApply = req.body.creditToApply;
    const creditNotes = req.body.creditNotes;
    let result;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        //contact
        const contact = await Contact.findById(req.body.invoice.customer);
        contact.totalDebt -= Math.round((totalCreditToApply + Number.EPSILON) * 100) / 100;
        if (contact.totalDebt > 0) {
            contact.owes = contact.totalDebt;
        } else if (contact.totalDebt < 0) {
            contact.credit = contact.totalDebt * -1;
        } else {
            contact.owes = 0;
            contact.credit = 0;
        }

        const invoice = await Invoice.findById(req.body.invoice);
        if (invoice.due > 0 && totalCreditToApply <= invoice.due) {
            if (invoice.due > totalCreditToApply) {
                invoice.status = 'Partially Paid';
                invoice.paid += totalCreditToApply;
                invoice.due = Math.round((invoice.total - invoice.paid + Number.EPSILON) * 100) / 100;
            } else {
                invoice.status = 'Paid';
                invoice.paid = invoice.total;
                invoice.due = 0;
            }
        } else {
            const error = new Error('Amount is greater than due.');
            error.statusCode = 601;
            next(error);
        }
        for (let index = 0; index < creditNotes.length; index++) {
            const creditNote2 = creditNotes[index];
            if (creditNote2.creditToApply > 0) {
                const creditNote = await CreditNote.findById(creditNote2);
                if (creditNote.due > 0 && creditNote2.creditToApply <= creditNote.due) {
                    if (creditNote.due > creditNote2.creditToApply) {
                        creditNote.status = 'Partially Paid';
                        creditNote.paid += creditNote2.creditToApply;
                        creditNote.due = Math.round((creditNote.total - creditNote.paid + Number.EPSILON) * 100) / 100;
                    } else {
                        creditNote.status = 'Paid';
                        creditNote.paid = creditNote.total;
                        creditNote.due = 0;
                    }
                    await creditNote.save();
                } else {
                    const error = new Error('Amount is greater than due.');
                    error.statusCode = 601;
                    next(error);
                }
                // accounts receivable
                let account = await Account.findOne({ code: 1100 });
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= creditNote2.creditToApply;
                account.movements.push({
                    transactionRef: 'CreditNote',
                    transaction: creditNote._id,
                    date: Date.now(),
                    description: `CN-${creditNote.number} applied to INV-${invoice.number}`,
                    amount: creditNote2.creditToApply
                });
                await account.save();
            }
        }

        await contact.save();
        await invoice.save();
        res.status(200).json({
            message: 'Credit Note created.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteCreditNote = async (req, res, next) => {
    const creditNoteId = req.params.creditNoteId;
    let index1;
    try {
        const creditNote = await CreditNote.findById(creditNoteId);
        if (!creditNote) {
            const error = new Error('Could not find any creditNote');
            error.statusCode = 404;
            throw error;
        }
        if (creditNote.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }

        if (creditNote.paid > 0) {
            const error = new Error('This creditNote cannot be deleted');
            error.statusCode = 101;
            throw error;
        }

        //contact
        const contact = await Contact.findById(creditNote.contact);
        contact.totalDebt += Math.round((creditNote.total + Number.EPSILON) * 100) / 100;
        if (contact.totalDebt > 0) {
            contact.owes = contact.totalDebt;
        } else if (contact.totalDebt < 0) {
            contact.credit = contact.totalDebt * -1;
        } else {
            contact.owes = 0;
            contact.credit = 0;
        }

        // accounts receivable
        let account = await Account.findOne({ code: 1100 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= creditNote.total;
        let index = account.movements.findIndex(movement => movement.transaction == creditNote._id.toString());
        account.movements.splice(index, 1);
        await account.save();

        // sales tax account
        account = await Account.findOne({ code: 1400 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= creditNote.taxes;
        index = account.movements.findIndex(movement => movement.transaction == creditNote._id.toString());
        account.movements.splice(index, 1);
        await account.save();

        if (creditNote.details.length > 0) {
            for (let i = 0; i < creditNote.details.length; i++) {
                const detail = creditNote.details[i];
                if (detail.product.trackItem) {
                    await decreaseStock(detail.product, Number(detail.quantity), detail.location);
                }

                // product sales account
                account = await Account.findById(detail.product.salesAccount);
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= detail.price;
                index = account.movements.findIndex(movement => movement.transaction == creditNote._id.toString());
                account.movements.splice(index, 1);
                await account.save();

                if (detail.product.trackItem) {
                    // product cost of goods account
                    account = await Account.findById(detail.product.costOfGoodsAccount);
                    if (!account) {
                        const error = new Error('Could not find any account');
                        error.statusCode = 404;
                        throw error;
                    }
                    account.balance -= detail.product.price * detail.quantity;
                    index = account.movements.findIndex(movement => movement.transaction == creditNote._id.toString());
                    account.movements.splice(index, 1);
                    await account.save();
                }
            }
        }

        await contact.save();
        await creditNote.remove();
        const totalCreditNotes = await CreditNote.find().countDocuments();
        res.status(200).json({
            message: 'Credit Note deleted',
            totalCreditNotes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const decreaseStock = async (product, quantity, location) => {
    let productId = product._id;
    let notification;
    if (product.isVariant) {
        productId = product.productId;
    };
    try {
        let product2 = await Product.findById(productId);
        if (!product) {
            const error = new Error('Could not find any product');
            error.statusCode = 404;
        }
        if (product.isVariant) {
            for (let i = 0; i < product2.variants.length; i++) {
                const variant = product2.variants[i];
                if (product.sku == variant.sku) {
                    for (let y = 0; y < variant.locations.length; y++) {
                        const location2 = variant.locations[y];
                        if (location == location2.location.toString()) {
                            location2.quantity -= quantity;
                            variant.stock -= quantity;
                            if (location2.quantity === 0) {
                                notification = location2.name;
                            }
                        }
                    }
                }
            }
        } else {
            for (let i = 0; i < product2.locations.length; i++) {
                const location2 = product2.locations[i];
                if (location == location2.location.toString()) {
                    location2.quantity -= quantity;
                    product2.stock -= quantity;
                    if (location2.quantity === 0) {
                        notification = location2.name;
                    }
                }
            }
        }
        await product2.save();
        return notification;
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
    }
};

const increaseStock = async (product, quantity, location) => {
    let productId = product._id;
    if (product.isVariant) {
        productId = product.productId;
    };
    try {
        let product2 = await Product.findById(productId);
        if (!product) {
            const error = new Error('Could not find any product');
            error.statusCode = 404;
        }
        if (product.isVariant) {
            for (let i = 0; i < product2.variants.length; i++) {
                const variant = product2.variants[i];
                if (product.sku == variant.sku) {
                    for (let y = 0; y < variant.locations.length; y++) {
                        const location2 = variant.locations[y];
                        if (location == location2.location.toString()) {
                            location2.quantity += quantity;
                            variant.stock += quantity;
                        }
                    }
                }
            }
        } else {
            for (let i = 0; i < product2.locations.length; i++) {
                const location2 = product2.locations[i];
                if (location == location2.location.toString()) {
                    location2.quantity += quantity;
                    product2.stock += quantity;
                }
            }
        }
        await product2.save();
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
    }
};

exports.createPDF = async (req, res, next) => {
    const creditNote = req.body.creditNote;
    const groupId = req.groupId;
    const subject = req.body.subject;
    const sender = 'nicolasantoniw@gmail.com';
    const receiver = req.body.receiver;
    const html = req.body.html;
    const sendPdf = req.body.sendPdf;
    const deletePdf = req.query.delete;
    const creditNoteName = `CREDIT-NOTE-${creditNote.number}.pdf`;
    if (Number.isInteger(creditNote.taxes)) {
        creditNote.taxes = creditNote.taxes.toFixed(2);
    }
    if (Number.isInteger(creditNote.subtotal)) {
        creditNote.subtotal = creditNote.subtotal.toFixed(2);
    }
    if (Number.isInteger(creditNote.total)) {
        creditNote.total = creditNote.total.toFixed(2);
    }
    if (creditNote.total[0] === "$") {
        creditNote.total = req.body.creditNote.total.substring(1);
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
        sendCreditNote(subject, sender, receiver, creditNoteName, html);
        if (creditNote.sent == 'No') {
            const creditNote2 = await CreditNote.findById(creditNote._id);
            creditNote2.sent = 'Yes';
            await creditNote2.save();
        }
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
                                        text: 'Credit Note',
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
                                                        text: 'Credit Note No.',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${creditNote.number}`,
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
                                                        text: `${creditNote.createdAt}`,
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
                                                        text: `${creditNote.dueDate}`,
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
                        table(creditNote.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                            text: `$${creditNote.subtotal}`,
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
                                            text: `$${creditNote.taxes}`,
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
                                            text: `$${creditNote.total}`,
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
                res.setHeader(`Content-Disposition`, `inline; filename= ${creditNoteName}`);
                if (!deletePdf) {
                    pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'creditNote.pdf')));
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
                                    text: 'Credit Note',
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
                                                    text: 'Credit Note No.',
                                                    color: '#aaaaab',
                                                    bold: true,
                                                    width: '*',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    margin: [0, 0, 0, 5],
                                                },
                                                {
                                                    text: `${creditNote.number}`,
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
                                                    text: `${creditNote.createdAt}`,
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
                                                    text: `${creditNote.dueDate}`,
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
                    table(creditNote.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                        text: `$${creditNote.subtotal}`,
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
                                        text: `$${creditNote.taxes}`,
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
                                        text: `$${creditNote.total}`,
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
            res.setHeader(`Content-Disposition`, `inline; filename= ${creditNoteName}`);
            if (!deletePdf) {
                pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'creditNote.pdf')));
            }
            pdfDoc.pipe(res);
            pdfDoc.end();
        }
    }
};

const sendCreditNote = (subject, sender, receiver, filename, html) => {
    const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/creditNote.pdf`);
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
            fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/creditNote.pdf`);
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
            detail.discount = `${detail.discount}%`;
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


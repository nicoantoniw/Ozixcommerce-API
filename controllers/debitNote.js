const fs = require('fs');
const path = require('path');

const { validationResult, body } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const DebitNote = require('../models/debitNote');
const Bill = require('../models/bill');
const Product = require('../models/product');
const Contact = require('../models/contact');
const Group = require('../models/group');
const Account = require('../models/account');
const Notification = require('../models/notification');

AWS.config.loadFromPath('/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/config.json');

exports.getDebitNotes = async (req, res, next) => {
    try {
        const totalDebitNotes = await DebitNote.find({
            creator: req.groupId
        }).countDocuments();
        const debitNotes = await DebitNote.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('contact', { name: 1, email: 1, _id: 1 })
            .sort({ number: -1 });

        if (totalDebitNotes === 0) {
            const error = new Error('No debitNotes found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            debitNotes,
            totalDebitNotes,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getDebitNotesByContact = async (req, res, next) => {
    try {
        const totalDebitNotes = await DebitNote.find({
            creator: req.groupId,
            contact: req.params.contactId,
            $or: [{ status: 'Partially Paid' }, { status: 'Unpaid' }]
        }).countDocuments();
        const debitNotes = await DebitNote.find({
            creator: req.groupId,
            contact: req.params.contactId,
            $or: [{ status: 'Partially Paid' }, { status: 'Unpaid' }]
        })
            .populate('creator', { name: 1, _id: 1 })
            .populate('contact', { name: 1, email: 1, _id: 1 })
            .sort({ number: -1 });

        if (totalDebitNotes === 0) {
            const error = new Error('No debitNotes found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            debitNotes,
            totalDebitNotes,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getDebitNote = async (req, res, next) => {
    const debitNoteId = req.params.debitNoteId;
    try {
        const debitNote = await DebitNote.findById(debitNoteId)
            .populate('creator', { name: 1, _id: 1 })
            .populate('contact', { name: 1, _id: 1, email: 1 });
        if (!debitNote) {
            const error = new Error('No debitNote found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            debitNote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addDebitNote = async (req, res, next) => {
    let result;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        if (req.body.expired) {
            const error = new Error('Transaction is overdue');
            error.statusCode = 104;
            throw error;
        }
        const debitNote = new DebitNote({
            number: req.body.debitNote.number,
            details: req.body.debitNote.details,
            total: Number(req.body.debitNote.total),
            due: Number(req.body.debitNote.total),
            subtotal: req.body.debitNote.subtotal,
            discounts: Number(req.body.debitNote.discounts),
            creator: req.groupId,
            contact: req.body.debitNote.contact,
            createdAt: moment.utc(req.body.debitNote.createdAt)
        });

        if (req.body.fromBill) {
            if (debitNote.paid != 0) {
                const error = new Error('Credit or Debit notes cant be created in transactions that received a payment');
                error.statusCode = 105;
                throw error;
            }
            const debitNotes = await DebitNote.find({ creator: req.groupId })
                .populate('creator', { name: 1, _id: 1 })
                .populate('contact', { name: 1, _id: 1, email: 1 })
                .sort({ number: -1 });
            const debitNote2 = debitNotes[0];
            debitNote.number = Number(debitNote2.number) + 1;

            const bill = await Bill.findById(req.body.bill);
            bill.status = 'Paid';
            bill.paid = debitNote.total;
            bill.due = 0;
            await bill.save();
            debitNote.status = 'Paid';
            debitNote.paid = debitNote.total;
            debitNote.due = 0;
            debitNote.fromBill = true;
            debitNote.bill = bill._id;
        }
        //contact
        const contact = await Contact.findById(debitNote.contact);
        contact.totalDebt += debitNote.total;
        contact.totalDebt = Math.round((contact.totalDebt + Number.EPSILON) * 100) / 100;
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

        // accounts payable
        let account = await Account.findOne({ code: 2100 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= debitNote.total;
        account.movements.push({
            transactionRef: 'DebitNote',
            transaction: debitNote._id,
            date: debitNote.createdAt,
            description: `Debit Note # ${debitNote.number}`,
            amount: debitNote.total
        });
        await account.save();

        if (debitNote.details.length > 0) {
            for (let i = 0; i < debitNote.details.length; i++) {
                const detail = debitNote.details[i];
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

                // inventory asset account
                account = await Account.findOne({ code: 2500 });
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= detail.product.price * detail.quantity;
                account.movements.push({
                    transactionRef: 'DebitNote',
                    transaction: debitNote._id,
                    date: debitNote.createdAt,
                    description: `Debit Note # ${debitNote.number}`,
                    amount: debitNote.total
                });
                await account.save();
            }
        }
        await contact.save();
        await debitNote.save();
        res.status(200).json({
            message: 'Debit Note created.',
            debitNote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.applyDebit = async (req, res, next) => {
    const totalCreditToApply = req.body.debitToApply;
    const debitNotes = req.body.debitNotes;
    let result;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        //contact
        const contact = await Contact.findById(req.body.bill.supplier);
        contact.totalDebt += Math.round((totalCreditToApply + Number.EPSILON) * 100) / 100;
        if (contact.totalDebt > 0) {
            contact.owes = contact.totalDebt;
        } else if (contact.totalDebt < 0) {
            contact.credit = contact.totalDebt * -1;
        } else {
            contact.owes = 0;
            contact.credit = 0;
        }

        const bill = await Bill.findById(req.body.bill);
        if (bill.due > 0 && totalCreditToApply <= bill.due) {
            if (bill.due > totalCreditToApply) {
                bill.status = 'Partially Paid';
                bill.paid += totalCreditToApply;
                bill.due = Math.round((bill.total - bill.paid + Number.EPSILON) * 100) / 100;
            } else {
                bill.status = 'Paid';
                bill.paid = bill.total;
                bill.due = 0;
            }
        } else {
            const error = new Error('Amount is greater than due.');
            error.statusCode = 601;
            next(error);
        }
        for (let index = 0; index < debitNotes.length; index++) {
            const debitNote2 = debitNotes[index];
            if (debitNote2.creditToApply > 0) {
                const debitNote = await DebitNote.findById(debitNote2);
                if (debitNote.due > 0 && debitNote2.creditToApply <= debitNote.due) {
                    if (debitNote.due > debitNote2.creditToApply) {
                        debitNote.status = 'Partially Paid';
                        debitNote.paid += debitNote2.creditToApply;
                        debitNote.due = Math.round((debitNote.total - debitNote.paid + Number.EPSILON) * 100) / 100;
                    } else {
                        debitNote.status = 'Paid';
                        debitNote.paid = debitNote.total;
                        debitNote.due = 0;
                    }
                    await debitNote.save();
                } else {
                    const error = new Error('Amount is greater than due.');
                    error.statusCode = 601;
                    next(error);
                }
                // accounts payable
                let account = await Account.findOne({ code: 2100 });
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= debitNote2.creditToApply;
                account.movements.push({
                    transactionRef: 'DebitNote',
                    transaction: debitNote._id,
                    date: Date.now(),
                    description: `CN-${debitNote.number} applied to INV-${bill.number}`,
                    amount: debitNote2.creditToApply
                });
                await account.save();
            }
        }

        await contact.save();
        await bill.save();
        res.status(200).json({
            message: 'Debit Note created.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteDebitNote = async (req, res, next) => {
    const debitNoteId = req.params.debitNoteId;
    let index1;
    try {
        const debitNote = await DebitNote.findById(debitNoteId);
        if (!debitNote) {
            const error = new Error('Could not find any debitNote');
            error.statusCode = 404;
            throw error;
        }
        if (debitNote.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }

        if (debitNote.paid > 0) {
            const error = new Error('This debitNote cannot be deleted');
            error.statusCode = 101;
            throw error;
        }

        //contact
        const contact = await Contact.findById(debitNote.contact);
        contact.totalDebt += Math.round((debitNote.total + Number.EPSILON) * 100) / 100;
        if (contact.totalDebt > 0) {
            contact.owes = contact.totalDebt;
        } else if (contact.totalDebt < 0) {
            contact.credit = contact.totalDebt * -1;
        } else {
            contact.owes = 0;
            contact.credit = 0;
        }

        // bill
        if (debitNote.fromBill) {
            const bill = await Bill.findById(debitNote.bill);
            bill.status = 'Unpaid';
            bill.paid = 0;
            bill.due = debitNote.total;
            await bill.save();
        }

        // accounts payable
        let account = await Account.findOne({ code: 2100 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance += debitNote.total;
        let index = account.movements.findIndex(movement => movement.transaction == debitNote._id.toString());
        account.movements.splice(index, 1);
        await account.save();


        if (debitNote.details.length > 0) {
            for (let i = 0; i < debitNote.details.length; i++) {
                const detail = debitNote.details[i];
                if (detail.product.trackItem) {
                    await decreaseStock(detail.product, Number(detail.quantity), detail.location);
                }

                // inventory asset account
                account = await Account.findOne({ code: 2500 });
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance += detail.product.price * detail.quantity;
                account.movements.push({
                    transactionRef: 'Bill',
                    transaction: bill._id,
                    date: bill.createdAt,
                    description: `Bill # ${bill.number}`,
                    amount: detail.product.price * detail.quantity
                });
                await account.save();
            }
        }

        await contact.save();
        await debitNote.remove();
        const totalDebitNotes = await DebitNote.find().countDocuments();
        res.status(200).json({
            message: 'Debit Note deleted',
            totalDebitNotes
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
    const debitNote = req.body.debitNote;
    const groupId = req.groupId;
    const subject = req.body.subject;
    const sender = 'nicolasantoniw@gmail.com';
    const receiver = req.body.receiver;
    const html = req.body.html;
    const sendPdf = req.body.sendPdf;
    const deletePdf = req.query.delete;
    const debitNoteName = `CREDIT-NOTE-${debitNote.number}.pdf`;
    if (Number.isInteger(debitNote.subtotal)) {
        debitNote.subtotal = debitNote.subtotal.toFixed(2);
    }
    if (Number.isInteger(debitNote.total)) {
        debitNote.total = debitNote.total.toFixed(2);
    }
    if (debitNote.total[0] === "$") {
        debitNote.total = req.body.debitNote.total.substring(1);
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
        sendDebitNote(subject, sender, receiver, debitNoteName, html);
        if (debitNote.sent == 'No') {
            const debitNote2 = await DebitNote.findById(debitNote._id);
            debitNote2.sent = 'Yes';
            await debitNote2.save();
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
                                        text: 'Debit Note',
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
                                                        text: 'Debit Note No.',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${debitNote.number}`,
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
                                                        text: `${debitNote.createdAt}`,
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
                                                        text: `${debitNote.dueDate}`,
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
                        table(debitNote.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                            text: `$${debitNote.subtotal}`,
                                            alignment: 'right',
                                            fillColor: '#f5f5f5',
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
                                            text: `$${debitNote.total}`,
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
                res.setHeader(`Content-Disposition`, `inline; filename= ${debitNoteName}`);
                if (!deletePdf) {
                    pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'debitNote.pdf')));
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
                                    text: 'Debit Note',
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
                                                    text: 'Debit Note No.',
                                                    color: '#aaaaab',
                                                    bold: true,
                                                    width: '*',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    margin: [0, 0, 0, 5],
                                                },
                                                {
                                                    text: `${debitNote.number}`,
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
                                                    text: `${debitNote.createdAt}`,
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
                                                    text: `${debitNote.dueDate}`,
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
                    table(debitNote.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                        text: `$${debitNote.subtotal}`,
                                        alignment: 'right',
                                        fillColor: '#f5f5f5',
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
                                        text: `$${debitNote.total}`,
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
            res.setHeader(`Content-Disposition`, `inline; filename= ${debitNoteName}`);
            if (!deletePdf) {
                pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'debitNote.pdf')));
            }
            pdfDoc.pipe(res);
            pdfDoc.end();
        }
    }
};

const sendDebitNote = (subject, sender, receiver, filename, html) => {
    const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/debitNote.pdf`);
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
            fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/debitNote.pdf`);
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


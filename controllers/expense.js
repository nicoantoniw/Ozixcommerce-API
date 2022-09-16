const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const Expense = require('../models/expense');
const Bill = require('../models/bill');
const Contact = require('../models/contact');
const Product = require('../models/product');
const Group = require('../models/group');
const Account = require('../models/account');
const Notification = require('../models/notification');

const relativePath = path.join(__dirname, '..', 'config.json');
// AWS.config.loadFromPath(relativePath);

exports.getExpenses = async (req, res, next) => {
    try {
        const totalExpenses = await Expense.find({
            creator: req.groupId
        }).countDocuments();
        let expenses = await Expense.find({ creator: req.groupId })
            .populate('supplier', { name: 1, _id: 1, email: 1 })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ number: -1 });

        if (totalExpenses === 0) {
            expenses = [];
        }
        res.status(200).json({
            expenses: expenses,
            totalExpenses: totalExpenses,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getExpensesAndBills = async (req, res, next) => {
    let transactions;
    try {
        let expenses = await Expense.find({ creator: req.groupId })
            .populate('supplier', { name: 1, _id: 1, email: 1 })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ number: -1 });

        const bills = await Bill.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('supplier', { name: 1, email: 1, _id: 1 })
            .sort({ number: -1 });

        transactions = expenses;
        transactions = transactions.concat(bills);
        transactions.sort((a, b) =>
            a.createdAt > b.createdAt ? -1 : 1
        );

        res.status(200).json({
            transactions
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getExpensesByFilter = async (req, res, next) => {
    let expenses;
    let dateFrom = req.query.dateFrom;
    let dateTo = req.query.dateTo;
    let supplier = req.query.supplier;
    let status = req.query.status;
    if (!supplier) {
        supplier = '';
    } if (!dateFrom | !dateTo) {
        dateTo = null;
        dateFrom = null;
    }
    if (req.query.dateFrom) {
        dateFrom = moment.utc(req.query.dateFrom).toISOString();
    } if (req.query.dateTo) {
        dateTo = moment.utc(req.query.dateTo).toISOString();
    }
    try {
        if (dateFrom === null && dateTo === null && supplier != '') {
            expenses = await Expense.find({ supplier: supplier, creator: req.groupId })
                .populate('supplier', { name: 1, email: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ number: -1 });
        } else if (supplier === '' && dateFrom != null && dateTo != null) {
            expenses = await Expense.find({ paymentDate: { '$gte': dateFrom, '$lte': dateTo }, creator: req.groupId })
                .populate('supplier', { name: 1, email: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ number: -1 });
        } else if (dateFrom != null && dateTo != null && supplier != '') {
            expenses = await Expense.find({ paymentDate: { '$gte': dateFrom, '$lte': dateTo }, supplier: supplier, creator: req.groupId })
                .populate('supplier', { name: 1, email: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ number: -1 });
        } else {
            expenses = await Expense.find({ creator: req.groupId })
                .populate('supplier', { name: 1, email: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ number: -1 });
        }
        res.status(200).json({
            expenses
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getExpense = async (req, res, next) => {
    const expenseId = req.params.expenseId;
    try {
        const expense = await Expense.findById(expenseId)
            .populate('supplier', { name: 1, _id: 1, email: 1 })
            .populate('account', { name: 1, _id: 1 })
            .populate('creator', { name: 1, _id: 1 });
        if (!expense) {
            const error = new Error('No expense found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            expense: expense
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addExpense = async (req, res, next) => {
    const accountId = req.body.expense.account;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        const expense = new Expense({
            number: req.body.expense.number,
            details: req.body.expense.details,
            description: req.body.expense.description,
            account: req.body.expense.account,
            total: Number(req.body.expense.total),
            subtotal: req.body.expense.subtotal,
            discounts: Number(req.body.expense.discounts),
            creator: req.groupId,
            supplier: req.body.expense.supplier,
            paymentMethod: req.body.expense.method,
            paymentDate: req.body.expense.paymentDate,
        });

        const contact = await Contact.findById(req.body.expense.supplier);
        if (contact.type === 'None') {
            contact.type = 'Supplier';
            await contact.save();
        } else if (contact.type === 'Customer') {
            contact.type = 'All';
            await contact.save();
        }

        // bank account
        let account = await Account.findById(accountId);
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= expense.total;
        account.movements.push({
            transactionRef: 'Expense',
            transaction: expense._id,
            date: expense.paymentDate,
            description: `Expense payed to ${req.body.expense.supplier.name}`,
            amount: expense.total
        });
        await account.save();
        await expense.save();
        res.status(200).json({
            message: 'Expense created.',
            expense: expense
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteExpense = async (req, res, next) => {
    const expenseId = req.params.expenseId;
    try {
        const expense = await Expense.findById(expenseId);
        if (!expense) {
            const error = new Error('Could not find any expense');
            error.statusCode = 404;
            throw error;
        }
        if (expense.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        // bank account
        let account = await Account.findById(expense.account);
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance += expense.total;
        let index = account.movements.findIndex(movement => movement.transaction == expense._id.toString());
        account.movements.splice(index, 1);
        await account.save();
        await expense.remove();
        res.status(200).json({
            message: 'Expense deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPDF = async (req, res, next) => {
    const expense = req.body.expense;
    const groupId = req.groupId;

    const subject = req.body.subject;
    const receiver = req.body.receiver;
    const html = req.body.html;
    const sendPdf = req.body.sendPdf;
    const deletePdf = req.query.delete;
    const expenseName = `EXPENSE-${expense.number}.pdf`;
    expense.paymentDate = moment.utc(expense.paymentDate).format("LL");
    if (expense.total[0] === "$") {
        expense.total = req.body.expense.total.substring(1);
    }
    if (Number.isInteger(expense.subtotal)) {
        expense.subtotal = expense.subtotal.toFixed(2);
    }
    if (Number.isInteger(expense.total)) {
        expense.total = expense.total.toFixed(2);
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
        sendExpense(subject, sender, receiver, expenseName, html);
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
                                        text: 'Expense',
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
                                                        text: 'Expense No.',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${expense.number}`,
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
                                                        text: `${expense.paymentDate}`,
                                                        bold: true,
                                                        color: '#333333',
                                                        fontSize: 12,
                                                        alignment: 'right',
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
                        table(expense.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                            text: `$${expense.subtotal}`,
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
                                            text: `$${expense.total}`,
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
                res.setHeader(`Content-Disposition`, `inline; filename= ${expenseName}`);
                if (!deletePdf) {
                    pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'expense.pdf')));
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
                                    text: 'Expense',
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
                                                    text: 'Expense No.',
                                                    color: '#aaaaab',
                                                    bold: true,
                                                    width: '*',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    margin: [0, 0, 0, 5],
                                                },
                                                {
                                                    text: `${expense.number}`,
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
                                                    text: `${expense.paymentDate}`,
                                                    bold: true,
                                                    color: '#333333',
                                                    fontSize: 12,
                                                    alignment: 'right',
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
                    table(expense.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                        text: `$${expense.subtotal}`,
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
                                        text: `$${expense.total}`,
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
            res.setHeader(`Content-Disposition`, `inline; filename= ${expenseName}`);
            if (!deletePdf) {
                pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'expense.pdf')));
            }
            pdfDoc.pipe(res);
            pdfDoc.end();
        }

    }
};

const sendExpense = (subject, sender, receiver, filename, html) => {
    const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/expense.pdf`);
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
            fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/expense.pdf`);
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
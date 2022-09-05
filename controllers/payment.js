const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const Payment = require('../models/payment');
const Invoice = require('../models/invoice');
const Contact = require('../models/contact');
const Bill = require('../models/bill');
const Account = require('../models/account');
const Group = require('../models/group');

const relativePath = path.join(__dirname, '..', 'config.json');
AWS.config.loadFromPath(relativePath);

exports.getPayments = async (req, res, next) => {
    try {
        const totalPayments = await Payment.find({
            creator: req.groupId
        }).countDocuments();
        const payments = await Payment.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ name: 1 });

        if (totalPayments === 0) {
            const error = new Error('No payments found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            payments,
            totalPayments
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getPayment = async (req, res, next) => {
    const paymentId = req.params.paymentId;
    try {
        const payment = await Payment.findOne({
            _id: paymentId
        }).populate('creator', { name: 1, _id: 1 }).populate('contact').populate('account');
        if (!payment) {
            const error = new Error('No payment found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            payment
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.addPayment = async (req, res, next) => {
    try {
        const payment = new Payment({
            reference: req.body.reference,
            method: req.body.method,
            account: req.body.account,
            notes: req.body.notes,
            total: req.body.total,
            createdAt: req.body.createdAt,
            creator: req.groupId
        });
        if (req.body.expired) {
            const error = new Error('Transaction is overdue');
            error.statusCode = 104;
            throw error;
        }
        let receiver;
        if (req.body.receiveMoney) {
            payment.contact = req.body.contact;
            // Bank Account
            account = await Account.findById(req.body.account);
            if (!account) {
                const error = new Error('Could not find any account');
                error.statusCode = 404;
                throw error;
            }
            account.balance += payment.total;
            account.movements.push({
                transactionRef: 'Payment',
                transaction: payment._id,
                date: payment.createdAt,
                description: `Payment from ${req.body.contact.name}`,
                amount: payment.total
            });
            await account.save();

        } else if (req.body.invoice) {
            payment.refTransaction = 'Invoice';
            payment.transaction = req.body.invoice;
            payment.refContact = 'Customer';
            payment.contact = req.body.customer;
            receiver = req.body.customer.name;
            const invoice = await Invoice.findById(req.body.invoice);
            if (invoice.due > 0 && payment.total <= invoice.due) {
                if (invoice.due > payment.total) {
                    invoice.status = 'Partially Paid';
                    invoice.paid += payment.total;
                    invoice.due = Math.round((invoice.total - invoice.paid + Number.EPSILON) * 100) / 100;
                } else {
                    invoice.status = 'Paid';
                    invoice.paid = invoice.total;
                    invoice.due = 0;
                }

                //contact
                const contact = await Contact.findById(invoice.customer);
                contact.totalDebt -= Math.round((invoice.total + Number.EPSILON) * 100) / 100;
                if (contact.totalDebt > 0) {
                    contact.owes = contact.totalDebt;
                } else if (contact.totalDebt < 0) {
                    contact.credit = contact.totalDebt * -1;
                } else {
                    contact.owes = 0;
                    contact.credit = 0;
                }
                await contact.save();

                // accounts receivable
                let account = await Account.findOne({ code: 1100 });
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= payment.total;
                account.movements.push({
                    transactionRef: 'Payment',
                    transaction: payment._id,
                    date: payment.createdAt,
                    description: `Payment from Invoice #${invoice.number}`,
                    amount: payment.total
                });
                await account.save();

                // Bank Account
                account = await Account.findById(req.body.account);
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance += payment.total;
                account.movements.push({
                    transactionRef: 'Payment',
                    transaction: payment._id,
                    date: payment.createdAt,
                    description: `Payment from Invoice #${invoice.number}`,
                    amount: payment.total
                });
                await account.save();
                await invoice.save();
            }
        } else if (req.body.bill) {
            payment.refTransaction = 'Bill';
            payment.transaction = req.body.bill;
            payment.refContact = 'Supplier';
            payment.contact = req.body.supplier;
            receiver = req.body.supplier.name;
            const bill = await Bill.findById(req.body.bill);
            if (bill.due > 0 && payment.total <= bill.due) {
                if (bill.due > payment.total) {
                    bill.status = 'Partially Paid';
                    bill.paid += payment.total;
                    bill.due = Math.round((bill.total - bill.paid + Number.EPSILON) * 100) / 100;
                } else {
                    bill.status = 'Paid';
                    bill.paid = bill.total;
                    bill.due = 0;
                }

                //contact
                const contact = await Contact.findById(bill.supplier);
                contact.totalDebt += Math.round((bill.total + Number.EPSILON) * 100) / 100;
                if (contact.totalDebt > 0) {
                    contact.owes = contact.totalDebt;
                } else if (contact.totalDebt < 0) {
                    contact.credit = contact.totalDebt * -1;
                } else {
                    contact.owes = 0;
                    contact.credit = 0;
                }
                await contact.save();

                // Accounts Payable
                let account = await Account.findOne({ code: 2100 });
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= payment.total;
                account.movements.push({
                    transactionRef: 'Payment',
                    transaction: payment._id,
                    date: payment.createdAt,
                    description: `Payment for Bill #${bill.number}`,
                    amount: payment.total
                });
                await account.save();

                // Bank Account
                account = await Account.findById(req.body.account);
                if (!account) {
                    const error = new Error('Could not find any account');
                    error.statusCode = 404;
                    throw error;
                }
                account.balance -= payment.total;
                account.movements.push({
                    transactionRef: 'Payment',
                    transaction: payment._id,
                    date: payment.createdAt,
                    description: `Payment for Bill #${bill.number}`,
                    amount: payment.total
                });
                await account.save();
                await bill.save();
            }
        }
        await payment.save();
        res.status(200).json({
            message: 'Payment created.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

// exports.updatePayment = async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         const error = new Error('Validation failed, entered data is incorrect');
//         error.statusCode = 422;
//         next(error);
//     }
//     const paymentId = req.params.paymentId;
//     try {
//         const payment = await Payment.findById(paymentId).populate('creator');
//         if (!payment) {
//             const error = new Error('Could not find any payment');
//             error.statusCode = 404;
//             throw error;
//         }
//         if (payment.creator._id.toString() !== req.groupId) {
//             const error = new Error('Not authorized');
//             error.statusCode = 403;
//             throw error;
//         }
//         payment.name = req.body.name;
//         payment.address = req.body.address;
//         payment.city = req.body.city;
//         payment.state = req.body.state;
//         payment.zip = req.body.zip;
//         await payment.save();
//         res.status(200).json({
//             message: 'payment updated.',
//             payment
//         });
//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     }
// };

exports.deletePayment = async (req, res, next) => {
    const paymentId = req.params.paymentId;
    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const error = new Error('Could not find any payment');
            error.statusCode = 404;
            throw error;
        }
        if (payment.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }

        if (payment.refTransaction === 'Invoice') {
            const invoice = await Invoice.findById(payment.transaction);
            if (invoice.due + payment.total < invoice.total) {
                invoice.status = 'Partially Paid';
                invoice.paid -= payment.total;
                invoice.due = Math.round((invoice.due + payment.total + Number.EPSILON) * 100) / 100;
            } else {
                invoice.status = 'Unpaid';
                invoice.paid = 0;
                invoice.due = invoice.total;
            }

            //contact
            const contact = await Contact.findById(invoice.customer);
            contact.totalDebt += Math.round((invoice.total + Number.EPSILON) * 100) / 100;
            if (contact.totalDebt > 0) {
                contact.owes = contact.totalDebt;
            } else if (contact.totalDebt < 0) {
                contact.credit = contact.totalDebt * -1;
            } else {
                contact.owes = 0;
                contact.credit = 0;
            }
            await contact.save();

            // accounts receivable
            let account = await Account.findOne({ code: 1100 });
            if (!account) {
                const error = new Error('Could not find any account');
                error.statusCode = 404;
                throw error;
            }
            account.balance += invoice.total;
            account.movements.push({
                transactionRef: 'Invoice',
                transaction: invoice._id,
                date: invoice.createdAt,
                description: `Invoice # ${invoice.number}`,
                amount: invoice.total
            });
            await account.save();

            // Bank Account
            account = await Account.findById(payment.account);
            if (!account) {
                const error = new Error('Could not find any account');
                error.statusCode = 404;
                throw error;
            }
            account.balance -= payment.total;
            index = account.movements.findIndex(movement => movement.transaction == payment._id.toString());
            account.movements.splice(index, 1);
            await account.save();
            await invoice.save();
        }
        else if (payment.refTransaction === 'Bill') {
            const bill = await Bill.findById(payment.transaction);
            if (bill.due + payment.total < bill.total) {
                bill.status = 'Partially Paid';
                bill.paid -= payment.total;
                bill.due = Math.round((bill.due + payment.total + Number.EPSILON) * 100) / 100;
            } else {
                bill.status = 'Unpaid';
                bill.paid = 0;
                bill.due = bill.total;
            }

            //contact
            const contact = await Contact.findById(bill.supplier);
            contact.totalDebt -= Math.round((bill.total + Number.EPSILON) * 100) / 100;
            if (contact.totalDebt > 0) {
                contact.owes = contact.totalDebt;
            } else if (contact.totalDebt < 0) {
                contact.credit = contact.totalDebt * -1;
            } else {
                contact.owes = 0;
                contact.credit = 0;
            }
            await contact.save();

            // accounts payable
            let account = await Account.findOne({ code: 2100 });
            if (!account) {
                const error = new Error('Could not find any account');
                error.statusCode = 404;
                throw error;
            }
            account.balance += payment.total;
            account.movements.push({
                transactionRef: 'Bill',
                transaction: bill._id,
                date: bill.createdAt,
                description: `Bill # ${bill.number}`,
                amount: bill.total
            });
            await account.save();

            // Bank Account
            account = await Account.findById(payment.account);
            if (!account) {
                const error = new Error('Could not find any account');
                error.statusCode = 404;
                throw error;
            }
            account.balance += payment.total;
            index = account.movements.findIndex(movement => movement.transaction == payment._id.toString());
            account.movements.splice(index, 1);
            await account.save();
            await bill.save();

        }

        await payment.remove();
        res.status(200).json({
            message: 'Payment deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const sendPayment = (subject, sender, receiver, filename, html) => {
    const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/payment.pdf`);
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
            fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/payment.pdf`);
            return;
        }).catch(
            (err) => {
                console.error(err, err.stack);
            });
};

exports.createPDF = async (req, res, next) => {
    const payment = req.body.payment;
    const transaction = req.body.transaction;
    const groupId = req.groupId;
    const subject = req.body.subject;
    const sender = 'nicolasantoniw@gmail.com';
    const receiver = req.body.receiver;
    const html = req.body.html;
    const sendPdf = req.body.sendPdf;
    const deletePdf = req.query.delete;
    const paymentName = `PAYMENT-${payment.number}.pdf`;
    if (Number.isInteger(payment.total)) {
        payment.total = payment.total.toFixed(2);
    }
    if (payment.total[0] === "$") {
        payment.total = req.body.payment.total.substring(1);
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
        sendPayment(subject, sender, receiver, paymentName, html);
        if (payment.sent == 'No') {
            const payment2 = await Payment.findById(payment._id);
            payment2.sent = 'Yes';
            await payment2.save();
        }
        return res.status(200).json({
            message: 'pdf sent'
        });

    } else {
        const printer = new PdfMake(fonts);
        let docDefinition;
        if (transaction.type == undefined) {
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
                                            text: 'Payment',
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
                                                            text: 'Payment No.',
                                                            color: '#aaaaab',
                                                            bold: true,
                                                            width: '*',
                                                            fontSize: 12,
                                                            alignment: 'right',
                                                            margin: [0, 0, 0, 5],
                                                        },
                                                        {
                                                            text: `${payment.reference}`,
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
                                                            text: 'Payment Date',
                                                            color: '#aaaaab',
                                                            bold: true,
                                                            width: '*',
                                                            fontSize: 12,
                                                            alignment: 'right',
                                                            margin: [0, 0, 0, 5],
                                                        },
                                                        {
                                                            text: `${payment.createdAt}`,
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
                            table(payment, transaction, [`Date`, 'Payment Total',]),
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
                                                text: 'Total',
                                                bold: true,
                                                fontSize: 20,
                                                alignment: 'right',
                                                border: [false, false, false, true],
                                                margin: [0, 5, 0, 5],
                                            },
                                            {
                                                text: `$${payment.total}`,
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
                    res.setHeader(`Content-Disposition`, `inline; filename= ${paymentName}`);
                    if (!deletePdf) {
                        pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'payment.pdf')));
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
                                        text: 'Payment',
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
                                                        text: 'Payment No.',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${payment.reference}`,
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
                                                        text: 'Payment Date',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${payment.createdAt}`,
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
                        table(payment, transaction, [`Date`, 'Payment Total',]),
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
                                            text: 'Total',
                                            bold: true,
                                            fontSize: 20,
                                            alignment: 'right',
                                            border: [false, false, false, true],
                                            margin: [0, 5, 0, 5],
                                        },
                                        {
                                            text: `$${payment.total}`,
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
                res.setHeader(`Content-Disposition`, `inline; filename= ${paymentName}`);
                if (!deletePdf) {
                    pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'payment.pdf')));
                }
                pdfDoc.pipe(res);
                pdfDoc.end();
            }
        } else {
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
                                            text: 'Payment',
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
                                                            text: 'Payment No.',
                                                            color: '#aaaaab',
                                                            bold: true,
                                                            width: '*',
                                                            fontSize: 12,
                                                            alignment: 'right',
                                                            margin: [0, 0, 0, 5],
                                                        },
                                                        {
                                                            text: `${payment.reference}`,
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
                                                            text: 'Payment Date',
                                                            color: '#aaaaab',
                                                            bold: true,
                                                            width: '*',
                                                            fontSize: 12,
                                                            alignment: 'right',
                                                            margin: [0, 0, 0, 5],
                                                        },
                                                        {
                                                            text: `${payment.createdAt}`,
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
                            table(payment, transaction, [`${payment.refTransaction} Date`, `${payment.refTransaction} Ref.`, `${payment.refTransaction} Total`, 'Payment Total', 'Still Owing']),
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
                                                text: 'Total',
                                                bold: true,
                                                fontSize: 20,
                                                alignment: 'right',
                                                border: [false, false, false, true],
                                                margin: [0, 5, 0, 5],
                                            },
                                            {
                                                text: `$${payment.total}`,
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
                    res.setHeader(`Content-Disposition`, `inline; filename= ${paymentName}`);
                    if (!deletePdf) {
                        pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'payment.pdf')));
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
                                        text: 'Payment',
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
                                                        text: 'Payment No.',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${payment.reference}`,
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
                                                        text: 'Payment Date',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${payment.createdAt}`,
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
                        table(payment, transaction, [`${payment.refTransaction} Date`, `${payment.refTransaction} Ref.`, `${payment.refTransaction} Total`, 'Payment Total', 'Still Owing']),
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
                                            text: 'Total',
                                            bold: true,
                                            fontSize: 20,
                                            alignment: 'right',
                                            border: [false, false, false, true],
                                            margin: [0, 5, 0, 5],
                                        },
                                        {
                                            text: `$${payment.total}`,
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
                res.setHeader(`Content-Disposition`, `inline; filename= ${paymentName}`);
                if (!deletePdf) {
                    pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'payment.pdf')));
                }
                pdfDoc.pipe(res);
                pdfDoc.end();
            }
        }

    }
};

const buildTableBody = (payment, transaction, columns) => {
    const body = [];
    const dataRow = [];
    if (transaction.type == undefined) {
        body.push([{
            text: `Date`,
            fillColor: '#eaf2f5',
            border: [false, true, false, true],
            margin: [0, 5, 0, 5],

        },
        {
            text: 'Payment Total',
            border: [false, true, false, true],
            alignment: 'right',
            fillColor: '#eaf2f5',
            margin: [0, 5, 0, 5],

        },
        ]);

        for (let o = 0; o < columns.length; o++) {
            const column = columns[o];
            if (column === `Date`) {
                dataRow.push({
                    text: payment['createdAt'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'left',
                });
            } else if (column === 'Payment Total') {
                dataRow.push({
                    text: payment['total'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'right',
                });
            }
        }
    } else {
        body.push([{
            text: `${payment.refTransaction} Date`,
            fillColor: '#eaf2f5',
            border: [false, true, false, true],
            margin: [0, 5, 0, 5],

        },
        {
            text: `${payment.refTransaction} Ref.`,
            border: [false, true, false, true],
            alignment: 'left',
            fillColor: '#eaf2f5',
            margin: [0, 5, 0, 5],

        },
        {
            text: `${payment.refTransaction} Total`,
            border: [false, true, false, true],
            alignment: 'right',
            fillColor: '#eaf2f5',
            margin: [0, 5, 0, 5],

        },
        {
            text: 'Payment Total',
            border: [false, true, false, true],
            alignment: 'right',
            fillColor: '#eaf2f5',
            margin: [0, 5, 0, 5],

        },
        {
            text: 'Still Owing',
            border: [false, true, false, true],
            alignment: 'right',
            fillColor: '#eaf2f5',
            margin: [0, 5, 0, 5],

        }]);

        for (let o = 0; o < columns.length; o++) {
            const column = columns[o];
            if (column === `${payment.refTransaction} Date`) {
                dataRow.push({
                    text: transaction['createdAt'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'left',
                });
            } else if (column === `${payment.refTransaction} Ref.`) {
                dataRow.push({
                    text: `#${transaction['number']}`,
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'left',
                });
            } else if (column === `${payment.refTransaction} Total`) {
                dataRow.push({
                    text: transaction['total'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'right',
                });
            } else if (column === 'Payment Total') {
                dataRow.push({
                    text: payment['total'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'right',
                });
            } else if (column === 'Still Owing') {
                dataRow.push({
                    text: transaction['due'],
                    border: [false, false, false, true],
                    margin: [0, 10, 0, 10],
                    alignment: 'right',
                });
            }
        }
    };

    body.push(dataRow);
    return body;
};

const table = (payment, transaction, columns) => {
    if (transaction.type == undefined) {
        return {
            table: {
                headerRows: 1,
                widths: ['*', 'auto'],
                body: buildTableBody(payment, transaction, columns)
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

    } else {
        return {
            table: {
                headerRows: 1,
                widths: ['*', 80, 'auto', 'auto', 'auto'],
                body: buildTableBody(payment, transaction, columns)
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

    }
};

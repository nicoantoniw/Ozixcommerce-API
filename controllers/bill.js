const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const Bill = require('../models/bill');
const Product = require('../models/product');
const Contact = require('../models/contact');
const Group = require('../models/group');
const Account = require('../models/account');
const Notification = require('../models/notification');

const relativePath = path.join(__dirname, '..', 'config.json');
// AWS.config.loadFromPath(relativePath);

exports.getBills = async (req, res, next) => {
    try {
        const totalBills = await Bill.find({
            creator: req.groupId
        }).countDocuments();
        const bills = await Bill.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('supplier', { name: 1, email: 1, _id: 1, owes: 1 })
            .sort({ number: -1 });

        if (totalBills === 0) {
            const error = new Error('No bills found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            bills,
            totalBills
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getBillsByFilter = async (req, res, next) => {
    let bills;
    let dateFrom = req.query.dateFrom;
    let dateTo = req.query.dateTo;
    if (!dateFrom | !dateTo) {
        dateTo = null;
        dateFrom = null;
    }
    if (req.query.dateFrom) {
        dateFrom = moment.utc(req.query.dateFrom).toISOString();
    } if (req.query.dateTo) {
        dateTo = moment.utc(req.query.dateTo).toISOString();
    }
    try {
        if (dateFrom != null && dateTo != null) {
            bills = await Bill.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, creator: req.groupId })
                .populate('supplier', { name: 1, email: 1, _id: 1, owes: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ number: -1 });
        } else {
            bills = await Bill.find({ creator: req.groupId })
                .populate('supplier', { name: 1, email: 1, _id: 1, owes: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ number: -1 });
        }
        res.status(200).json({
            bills
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getBill = async (req, res, next) => {
    const billId = req.params.billId;
    try {
        const bill = await Bill.findById(billId)
            .populate('supplier', { name: 1, email: 1, _id: 1, owes: 1 })
            .populate('creator', { name: 1, _id: 1 });
        if (!bill) {
            const error = new Error('No bill found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            bill
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addBill = async (req, res, next) => {
    let amount;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        const bill = new Bill({
            number: req.body.bill.number,
            details: req.body.bill.details,
            total: Number(req.body.bill.total),
            due: Number(req.body.bill.total),
            subtotal: req.body.bill.subtotal,
            discounts: Number(req.body.bill.discounts),
            creator: req.groupId,
            supplier: req.body.bill.supplier,
            dueDate: moment.utc(req.body.bill.dueDate),
            createdAt: moment.utc(req.body.bill.createdAt)
        });

        //contact
        const contact = await Contact.findById(bill.supplier);
        if (contact.type === 'None') {
            contact.type = 'Supplier';
        } else if (contact.type === 'Customer') {
            contact.type = 'All';
        }
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

        if (req.body.fromPurchaseOrder) {
            const bills = await Bill.find({ creator: req.groupId })
                .populate('supplier', { name: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ number: -1 });
            const bill2 = bills[0];
            bill.number = Number(bill2.number) + 1;
        }

        // accounts payable
        let account = await Account.findOne({ code: 2100 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance += bill.total;
        account.movements.push({
            transactionRef: 'Bill',
            transaction: bill._id,
            date: bill.createdAt,
            description: `Bill # ${bill.number}`,
            amount: bill.total
        });
        await account.save();

        for (let i = 0; i < bill.details.length; i++) {
            const detail = bill.details[i];
            if (detail.product.trackItem) {
                await increaseStock(detail.product, Number(detail.quantity));
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
        await bill.save();
        res.status(200).json({
            message: 'bill created.',
            bill
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.activateBill = async (req, res, next) => {
    const billId = req.params.billId;
    try {
        const bill = await Bill.findById(billId);
        if (!bill) {
            const error = new Error('Could not find any bill');
            error.statusCode = 404;
            throw error;
        }
        if (bill.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        bill.status = 'activo';
        await bill.save();
        res.status(200).json({
            message: 'bill has been activated',
            bill
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteBill = async (req, res, next) => {
    const billId = req.params.billId;
    let index1;
    try {
        const bill = await Bill.findById(billId);
        if (!bill) {
            const error = new Error('Could not find any bill');
            error.statusCode = 404;
            throw error;
        }
        if (bill.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        if (invoice.paid > 0) {
            const error = new Error('This bill cannot be deleted');
            error.statusCode = 101;
            throw error;
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

        // accounts payable
        let account = await Account.findOne({ code: 2100 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        let index = account.movements.findIndex(movement => movement.transaction == bill._id.toString());
        if (index != -1) {
            account.movements.splice(index, 1);
            account.balance -= bill.total;
        }
        await account.save();

        for (let i = 0; i < bill.details.length; i++) {
            const detail = bill.details[i];
            // Do this if quantity doesnt fall bellow 0



            // let productId = detail.product._id;
            // if (detail.product.isVariant) {
            //     productId = detail.product.productId;
            // }
            // const product = await Product.findById(productId);
            // if (!product) {
            //     const error = new Error('Could not find any product');
            //     error.statusCode = 404;
            // }
            // if (detail.product.isVariant) {
            //     for (let i = 0; i < product.variants.length; i++) {
            //         const variant = product.variants[i];
            //         if (detail.product.sku == variant.sku) {
            //             for (let y = 0; y < variant.locations.length; y++) {
            //                 const location = variant.locations[y];
            //                 if (detail.location == location.location.toString()) {
            //                     location.quantity += detail.quantity;
            //                     variant.stock += detail.quantity;
            //                 }
            //             }
            //         }
            //     }
            // } else {
            //     for (let i = 0; i < product.locations.length; i++) {
            //         const location = product.locations[i];
            //         if (detail.location == location.location.toString()) {
            //             location.quantity += detail.quantity;
            //             product.stock += detail.quantity;
            //         }
            //     }
            // }
            // await product.save();

            // inventory asset account
            account = await Account.findOne({ code: 2500 });
            if (!account) {
                const error = new Error('Could not find any account');
                error.statusCode = 404;
                throw error;
            }
            account.balance -= detail.product.price * detail.quantity;
            let index = account.movements.findIndex(movement => movement.transaction == bill._id.toString());
            account.movements.splice(index, 1);
            await account.save();
        }

        await bill.remove();
        const totalBills = await Bill.find().countDocuments();
        res.status(200).json({
            message: 'bill deleted',
            totalBills
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


const increaseStock = async (product, quantity) => {
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
                    variant.stock += quantity;
                }
            }
        } else {
            product2.stock += quantity;
        }
        await product2.save();
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
    }

};

exports.createPDF = async (req, res, next) => {
    const bill = req.body.bill;
    const groupId = req.groupId;
    const subject = req.body.subject;
    const sender = 'nicolasantoniw@gmail.com';
    const receiver = req.body.receiver;
    const html = req.body.html;
    const sendPdf = req.body.sendPdf;
    const deletePdf = req.query.delete;
    const billName = `BILL-${bill.number}.pdf`;
    if (Number.isInteger(bill.subtotal)) {
        bill.subtotal = bill.subtotal.toFixed(2);
    }
    if (Number.isInteger(bill.total)) {
        bill.total = bill.total.toFixed(2);
    }
    if (bill.total[0] === "$") {
        bill.total = req.body.bill.total.substring(1);
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
        sendBill(subject, sender, receiver, billName, html);
        if (bill.sent == 'No') {
            const bill2 = await Bill.findById(bill._id);
            bill2.sent = 'Yes';
            await bill2.save();
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
                                        text: 'Bill',
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
                                                        text: 'Bill No.',
                                                        color: '#aaaaab',
                                                        bold: true,
                                                        width: '*',
                                                        fontSize: 12,
                                                        alignment: 'right',
                                                        margin: [0, 0, 0, 5],
                                                    },
                                                    {
                                                        text: `${bill.number}`,
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
                                                        text: `${bill.createdAt}`,
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
                                                        text: `${bill.dueDate}`,
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
                        table(bill.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                            text: `$${bill.subtotal}`,
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
                                            text: `$${bill.total}`,
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
                res.setHeader(`Content-Disposition`, `inline; filename= ${billName}`);
                if (!deletePdf) {
                    pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'bill.pdf')));
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
                                    text: 'Bill',
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
                                                    text: 'Bill No.',
                                                    color: '#aaaaab',
                                                    bold: true,
                                                    width: '*',
                                                    fontSize: 12,
                                                    alignment: 'right',
                                                    margin: [0, 0, 0, 5],
                                                },
                                                {
                                                    text: `${bill.number}`,
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
                                                    text: `${bill.createdAt}`,
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
                                                    text: `${bill.dueDate}`,
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
                    table(bill.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                                        text: `$${bill.subtotal}`,
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
                                        text: `$${bill.total}`,
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
            res.setHeader(`Content-Disposition`, `inline; filename= ${billName}`);
            if (!deletePdf) {
                pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'bill.pdf')));
            }
            pdfDoc.pipe(res);
            pdfDoc.end();
        }
    }
};

const sendBill = (subject, sender, receiver, filename, html) => {
    const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/bill.pdf`);
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
            fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/bill.pdf`);
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

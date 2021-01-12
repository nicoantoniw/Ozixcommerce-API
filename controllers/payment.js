const { validationResult } = require('express-validator');

const Payment = require('../models/payment');
const Invoice = require('../models/invoice');
const Account = require('../models/account');

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
        }).populate('creator', { name: 1, _id: 1 });
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
    const payment = new Payment({
        reference: req.body.reference,
        method: req.body.method,
        customer: req.body.customer._id,
        account: req.body.account,
        notes: req.body.notes,
        total: req.body.total,
        createdAt: req.body.createdAt,
        creator: req.groupId
    });
    if (req.body.invoice) {
        payment.invoice = req.body.invoice;
        const invoice = await Invoice.findById(req.body.invoice);
        if (invoice.total > payment.total) {
            invoice.status = 'Partially Paid';
            invoice.paid = payment.total;
            invoice.due = Math.round((invoice.total - invoice.paid + Number.EPSILON) * 100) / 100;
        } else {
            invoice.status = 'Paid';
            invoice.paid = invoice.total;
            invoice.due = 0;
        }
        // accounts receivable
        let account = await Account.findOne({ code: 1100 });
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= invoice.total;
        let index = account.movements.findIndex(movement => movement.transaction == invoice._id.toString());
        account.movements.splice(index, 1);
        await account.save();
        await invoice.save();
    }
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
        description: `Payment from ${req.body.customer.name}`,
        amount: payment.total
    });
    await account.save();

    try {
        await payment.save();
        res.status(200).json({
            message: 'Payment created.',
            payment
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


// exports.deletePayment = async (req, res, next) => {
//     const paymentId = req.params.paymentId;
//     try {
//         const payment = await Payment.findById(paymentId);
//         if (!payment) {
//             const error = new Error('Could not find any payment');
//             error.statusCode = 404;
//             throw error;
//         }
//         if (payment.creator._id.toString() !== req.groupId) {
//             const error = new Error('Not authorized.');
//             error.statusCode = 403;
//             throw error;
//         }
//         await payment.remove();
//         res.status(200).json({
//             message: 'Payment deleted'
//         });
//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     }
// };

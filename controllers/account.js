const { validationResult } = require('express-validator');
const moment = require('moment');

const Account = require('../models/account');
const Group = require('../models/group');
const Payment = require('../models/payment');

exports.getAccounts = async (req, res, next) => {
    try {
        const totalAccounts = await Account.find({
            creator: req.groupId
        }).countDocuments();
        const accounts = await Account.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: 1 });

        if (totalAccounts === 0) {
            const error = new Error('No cash registers found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            accounts,
            totalAccounts
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getAccount = async (req, res, next) => {
    const accountId = req.params.accountId;
    try {
        const account = await Account.findById(accountId).populate('creator', { name: 1, _id: 1 });
        if (!account) {
            const error = new Error('No register found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            account
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

// exports.getAccountTransactions = async (req, res, next) => {
//     const accountId = req.params.accountId;
//     try {

//         let saleReceipts = [];
//         const payments = await Payment.find({ creator: req.groupId, account: accountId })
//             .populate('account', { name: 1, _id: 1 })
//             .populate('creator', { name: 1, _id: 1 })
//             .populate('customer', { name: 1, email: 1, _id: 1 })
//             .sort({ number: -1 });
//         // const saleReceipts = await saleReceipt.find({ creator: req.groupId, account: accountId })
//         //     .populate('creator', { name: 1, _id: 1 })
//         //     .populate('customer', { name: 1, _id: 1 })
//         //     .sort({ number: -1 });
//         if (payments.length < 1 && saleReceipts.length < 1) {
//             const error = new Error('No transactions found');
//             error.statusCode = 404;
//             throw error;
//         }
//         const transactions = payments.concat(saleReceipts);
//         res.status(200).json({
//             transactions
//         });
//     } catch (err) {
//         if (!err.statusCode) {
//             err.statusCode = 500;
//         }
//         next(err);
//     }
// };


exports.addAccount = async (req, res, next) => {
    let account;
    account = new Account({
        name: req.body.name,
        type: req.body.type,
        code: req.body.code,
        description: req.body.description,
        movements: [],
        creator: req.groupId,
        balance: req.body.balance
    });
    try {
        await account.save();
        res.status(200).json({
            message: 'Account created.',
            account
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateAccount = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    const accountId = req.params.accountId;
    try {
        const account = await Account.findById(accountId).populate('creator');
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        if (account.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        account.name = req.body.name;
        account.description = req.body.description;
        await account.save();
        res.status(200).json({
            message: 'Account updated.',
            account
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addMovement = async (req, res, next) => {
    let date = moment.utc().utcOffset(-3);
    if (req.body.date) {
        date = moment.utc(req.body.date).set('hour', 15);
    }
    const accountId = req.params.accountId;
    let type = 'subtract';
    let amount;
    if (req.body.type === 'Ingreso') {
        type = 'add';
    }
    const data = {
        type,
        description: req.body.description,
        amount: Number(req.body.amount),
        date
    };
    try {
        const account = await Account.findById(accountId);
        if (!account) {
            const error = new Error('Could not find any register');
            error.statusCode = 404;
            throw error;
        }
        if (data.type === 'add') {
            amount = parseFloat((data.amount).toFixed(2));
            account.balance += amount;
        } else {
            amount = parseFloat((data.amount).toFixed(2));
            account.balance -= amount;
            if (account.balance < 0) {
                const error = new Error('Account avaiable is lower than the amount required');
                error.statusCode = 602;
                throw error;
            }
        }
        account.movements.push(data);
        await account.save();
        res.status(200).json({
            message: 'Movement created.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};



exports.deleteAccount = async (req, res, next) => {
    const accountId = req.params.accountId;
    try {
        const account = await Account.findById(accountId);
        if (!account) {
            const error = new Error('Could not find any register');
            error.statusCode = 404;
            throw error;
        }
        if (account.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await account.remove();
        res.status(200).json({
            message: 'Register deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteAccounts = async (req, res, next) => {
    const accounts = req.body.accounts;
    try {
        for (let index = 0; index < accounts.length; index++) {
            const element = accounts[index];
            const account = await Account.findById(element._id);
            await account.remove();
        }
        res.status(200).json({
            message: 'Accounts deleted.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
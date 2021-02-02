const { validationResult } = require('express-validator');
const moment = require('moment');

const Account = require('../models/account');
const accountTransfer = require('../models/accountTransfer');
const AccountTransfer = require('../models/accountTransfer');
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
            const error = new Error('No accounts found');
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
        if (req.query.restore) {
            account.balance = 0;
        }
        else {
            account.name = req.body.name;
            account.description = req.body.description;
        }
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

exports.getAccountTransfer = async (req, res, next) => {
    const accountTransferId = req.params.accountTransferId;
    try {
        const accountTransfer = await AccountTransfer.findById(accountTransferId).populate('fromAccount', { name: 1 }).populate('toAccount', { name: 1 });
        if (!accountTransfer) {
            const error = new Error('No transfer found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            accountTransfer
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addAccountTransfer = async (req, res, next) => {
    const accountTransfer = new AccountTransfer({
        reference: req.body.accountTransfer.reference,
        amount: req.body.accountTransfer.amount,
        fromAccount: req.body.accountTransfer.fromAccount,
        toAccount: req.body.accountTransfer.toAccount,
        createdAt: req.body.accountTransfer.createdAt,
        creator: req.groupId
    });
    try {
        // From Account
        let account = await Account.findById(accountTransfer.fromAccount);
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= accountTransfer.amount;
        account.movements.push({
            transactionRef: 'AccountTransfer',
            transaction: accountTransfer._id,
            date: accountTransfer.createdAt,
            description: `Transfer to account '${req.body.accountTransfer.toAccount.name}'`,
            amount: accountTransfer.amount
        });
        await account.save();

        // To Account
        account = await Account.findById(accountTransfer.toAccount);
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance += accountTransfer.amount;
        account.movements.push({
            transactionRef: 'AccountTransfer',
            transaction: accountTransfer._id,
            date: accountTransfer.createdAt,
            description: `Transfer from account '${req.body.accountTransfer.fromAccount.name}'`,
            amount: accountTransfer.amount
        });
        await account.save();

        await accountTransfer.save();
        res.status(200).json({
            message: 'Transfer created.',
            account
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteAccountTransfer = async (req, res, next) => {
    const accountTransferId = req.params.accountTransferId;
    try {
        const accountTransfer = await AccountTransfer.findById(accountTransferId);
        if (!accountTransfer) {
            const error = new Error('Could not find transfer');
            error.statusCode = 404;
            throw error;
        }
        if (accountTransfer.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }

        // From Account
        let account = await Account.findById(accountTransfer.fromAccount);
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance += accountTransfer.amount;
        let index = account.movements.findIndex(movement => movement.transaction == accountTransfer._id.toString());
        account.movements.splice(index, 1);
        await account.save();

        // To Account
        account = await Account.findById(accountTransfer.toAccount);
        if (!account) {
            const error = new Error('Could not find any account');
            error.statusCode = 404;
            throw error;
        }
        account.balance -= accountTransfer.amount;
        index = account.movements.findIndex(movement => movement.transaction == accountTransfer._id.toString());
        account.movements.splice(index, 1);
        await account.save();

        await accountTransfer.remove();
        res.status(200).json({
            message: 'Transfer deleted.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const { validationResult } = require('express-validator');
const moment = require('moment');

const Cash = require('../models/cash');
const Group = require('../models/group');

exports.getCashRegisters = async (req, res, next) => {
    try {
        const totalCashRegisters = await Cash.find({
            creator: req.groupId
        }).countDocuments();
        const cashRegisters = await Cash.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: 1 });

        if (totalCashRegisters === 0) {
            const error = new Error('No cash registers found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            cashRegisters,
            totalCashRegisters
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getCashRegister = async (req, res, next) => {
    const cashRegisterId = req.params.cashRegisterId;
    try {
        const cashRegister = await Cash.findOne({
            _id: cashRegisterId,
            creator: req.groupId
        }).populate('creator', { name: 1, _id: 1 });
        if (!cashRegister) {
            const error = new Error('No register found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            cashRegister
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.addCashRegister = async (req, res, next) => {
    let cashRegister;
    let group = await Group.findById(req.groupId);
    if (req.body.cuit === '') {
        cashRegister = new Cash({
            name: group.name,
            movements: [],
            creator: req.groupId,
            province: group.province,
            city: group.city,
            streetAddress: group.streetAddress,
            zip: group.zip,
            apartment: group.apartment,
            category: group.category,
            personeria: group.personeria,
            cuit: group.cuit,
            activitiesDate: group.activitiesDate,
            socialName: group.socialName,
            brutosNumber: group.brutosNumber,
            salePoint: req.body.salePoint
        });
    } else {
        cashRegister = new Cash({
            name: req.body.name,
            movements: [],
            creator: req.groupId,
            province: req.body.province,
            city: req.body.city,
            streetAddress: req.body.streetAddress,
            zip: req.body.zip,
            apartment: req.body.apartment,
            category: req.body.category,
            personeria: req.body.personeria,
            cuit: req.body.cuit,
            activitiesDate: req.body.activitiesDate,
            socialName: req.body.socialName,
            brutosNumber: req.body.brutosNumber,
            salePoint: req.body.salePoint
        });
    }
    try {
        await cashRegister.save();
        res.status(200).json({
            message: 'Cash register created.',
            cashRegister
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
    const cashRegisterId = req.params.cashRegisterId;
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
        const cashRegister = await Cash.findById(cashRegisterId);
        if (!cashRegister) {
            const error = new Error('Could not find any register');
            error.statusCode = 404;
            throw error;
        }
        if (data.type === 'add') {
            amount = parseFloat((data.amount).toFixed(2));
            cashRegister.balance += amount;
        } else {
            amount = parseFloat((data.amount).toFixed(2));
            cashRegister.balance -= amount;
            if (cashRegister.balance < 0) {
                const error = new Error('Cash avaiable is lower than the amount required');
                error.statusCode = 602;
                throw error;
            }
        }
        cashRegister.movements.push(data);
        await cashRegister.save();
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

exports.restoreCashRegister = async (req, res, next) => {
    const cashRegisterId = req.params.cashRegisterId;
    try {
        const cashRegister = await Cash.findById(cashRegisterId);
        if (!cashRegister) {
            const error = new Error('Could not find any register');
            error.statusCode = 404;
            throw error;
        }
        if (cashRegister.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        cashRegister.movements = [];
        cashRegister.balance = 0;
        await cashRegister.save();
        res.status(200).json({
            message: 'Register restored'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.deleteCashRegister = async (req, res, next) => {
    const cashRegisterId = req.params.cashRegisterId;
    try {
        const cashRegister = await Cash.findById(cashRegisterId);
        if (!cashRegister) {
            const error = new Error('Could not find any register');
            error.statusCode = 404;
            throw error;
        }
        if (cashRegister.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await cashRegister.remove();
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

const { validationResult } = require('express-validator');

const Option = require('../models/option');

exports.getOptions = async (req, res, next) => {
    try {
        const totalOptions = await Option.find({
            creator: req.groupId
        }).countDocuments();
        const options = await Option.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: -1 });

        if (totalOptions === 0) {
            const error = new Error('No options found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            options,
            totalOptions
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getOption = async (req, res, next) => {
    const optionId = req.params.optionId;
    try {
        const option = await Option.findOne({
            _id: optionId
        }).populate('creator', { name: 1, _id: 1 });
        if (!option) {
            const error = new Error('No option found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            option
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.addOption = async (req, res, next) => {
    const option = new Option({
        name: req.body.name,
        values: req.body.values,
        creator: req.groupId
    });
    try {
        await option.save();
        res.status(200).json({
            message: 'Option created.',
            option
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateOption = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    const optionId = req.params.optionId;
    try {
        const option = await Option.findById(optionId).populate('creator');
        if (!option) {
            const error = new Error('Could not find any option');
            error.statusCode = 404;
            throw error;
        }
        if (option.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        option.name = req.body.name;
        option.values = req.body.values;
        await option.save();
        res.status(200).json({
            message: 'Option updated.',
            option
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.deleteOption = async (req, res, next) => {
    const optionId = req.params.optionId;
    try {
        const option = await Option.findById(optionId);
        if (!option) {
            const error = new Error('Could not find any option');
            error.statusCode = 404;
            throw error;
        }
        if (option.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await option.remove();
        res.status(200).json({
            message: 'Option deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteOptions = async (req, res, next) => {
    const options = req.body.options;
    try {
        for (let index = 0; index < options.length; index++) {
            const element = options[index];
            const option = await Option.findById(element._id);
            await option.remove();
        }
        res.status(200).json({
            message: 'Options deleted.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
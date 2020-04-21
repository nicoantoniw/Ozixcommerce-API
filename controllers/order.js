const { validationResult } = require('express-validator');
const moment = require('moment');

const Order = require('../models/order');
const Group = require('../models/group');

exports.getOrders = async (req, res, next) => {
    try {
        const totalOrders = await Order.find({
            creator: req.groupId
        }).countDocuments();
        const orders = await Order.find({ creator: req.groupId })
            .populate('customer', { name: 1, _id: 1 })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: -1 });

        if (totalOrders === 0) {
            const error = new Error('No orders found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            totalOrders,
            orders
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.getOrder = async (req, res, next) => {
    const orderId = req.params.orderId;
    try {
        const order = await Order.findById(orderId)
            .populate('customer', { name: 1, _id: 1 })
            .populate('creator', { name: 1, _id: 1 });
        if (!order) {
            const error = new Error('No order found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            order
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addOrder = async (req, res, next) => {
    let createdAt = moment.utc().utcOffset(-3);

    let deliveryDate = moment.utc(req.body.deliveryDate).set('hour', 15);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    try {
        const order = new Order({
            number: req.body.number,
            description: req.body.description,
            customer: req.body.customer,
            deliveryDate,
            createdAt,
            total: req.body.total,
            details: req.body.details,
            deposit: req.body.deposit,
            status: req.body.status,
            creator: req.groupId
        });
        await order.save();
        res.status(200).json({
            message: 'Order created.',
            order
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateOrder = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    const orderId = req.params.orderId;
    try {
        const order = await Order.findById(orderId).populate('creator', {
            name: 1,
            _id: 1
        });
        if (!order) {
            const error = new Error('Could not find any order');
            error.statusCode = 404;
            throw error;
        }
        if (order.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        order.description = req.body.description;
        order.customer = req.body.customer;
        order.deliveryDate = req.body.deliveryDate;
        order.total = req.body.total;
        order.deposit = req.body.deposit;
        order.status = req.body.status;
        order.details = req.body.details;
        await order.save();
        res.status(200).json({
            message: 'Order updated.',
            order
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.changeOrderStatus = async (req, res, next) => {
    const orderId = req.params.orderId;
    const status = req.body.status;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            const error = new Error('Could not find any order');
            error.statusCode = 404;
            throw error;
        }
        if (order.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        order.status = status;
        await order.save();
        res.status(200).json({
            message: 'Order has been updated',
            order
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteOrder = async (req, res, next) => {
    const orderId = req.params.orderId;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            const error = new Error('Could not find any order');
            error.statusCode = 404;
            throw error;
        }
        if (order.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await order.remove();
        res.status(200).json({
            message: 'Order deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

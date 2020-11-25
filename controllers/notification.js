const { validationResult } = require('express-validator');

const Notification = require('../models/notification');

exports.getNotifications = async (req, res, next) => {
    try {
        const totalNotifications = await Notification.find({
            creator: req.groupId
        }).countDocuments();
        const notifications = await Notification.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: -1 });

        if (totalNotifications === 0) {
            const error = new Error('No notifications found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            notifications,
            totalNotifications
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getFirst5Notifications = async (req, res, next) => {
    try {
        const totalNotifications = await Notification.find({
            creator: req.groupId
        }).limit(5).countDocuments();
        const notifications = await Notification.find({ creator: req.groupId, read: false }).limit(5)
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: -1 });

        if (totalNotifications === 0) {
            const error = new Error('No notifications found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            notifications,
            totalNotifications
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getNotification = async (req, res, next) => {
    const notificationId = req.params.notificationId;
    try {
        const notification = await Notification.findOne({
            _id: notificationId
        }).populate('creator', { name: 1, _id: 1 });
        if (!notification) {
            const error = new Error('No notification found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            notification
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.addNotification = async (req, res, next) => {
    const notification = new Notification({
        description: req.body.description,
        importance: req.body.importance,
        creator: req.groupId
    });
    try {
        await notification.save();
        res.status(200).json({
            message: 'Notification created.',
            notification
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.markAsRead = async (req, res, next) => {
    const notificationId = req.params.notificationId;
    try {
        const notification = await Notification.findOne({
            _id: notificationId
        });
        if (!notification) {
            const error = new Error('No notification found');
            error.statusCode = 404;
            throw error;
        }
        notification.read = true;
        await notification.save();
        res.status(200).json({
            message: 'Notification updated'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteNotification = async (req, res, next) => {
    const notificationId = req.params.notificationId;
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            const error = new Error('Could not find any notification');
            error.statusCode = 404;
            throw error;
        }
        if (notification.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await notification.remove();
        res.status(200).json({
            message: 'Notification deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const { validationResult } = require('express-validator');
const moment = require('moment');

const Transfer = require('../models/transfer');
const Product = require('../models/product');
const Group = require('../models/group');

exports.getTransfers = async (req, res, next) => {
    try {
        const totalTransfers = await Transfer.find({
            creator: req.groupId
        }).countDocuments();
        const transfers = await Transfer.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('products.product', { name: 1, _id: 1 })
            .sort({ createdAt: 1 });

        if (totalTransfers === 0) {
            const error = new Error('No transfers found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            transfers,
            totalTransfers
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getTransfer = async (req, res, next) => {
    const transferId = req.params.transferId;
    try {
        const transfer = await Transfer.findById(transferId).populate('creator', { name: 1, _id: 1 });
        if (!transfer) {
            const error = new Error('No transfer found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            transfer
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.addTransfer = async (req, res, next) => {
    const transfer = new Transfer({
        description: req.body.description,
        origin: req.body.origin,
        destination: req.body.destination,
        items: req.body.items,
        dateSent: req.body.dateSent,
        dateRecieved: req.body.dateRecieved,
        creator: req.groupId
    });
    try {
        if (req.body.status === 'transit') {
            transferStock(transfer.items, transfer.origin, false, req.groupId);
        } else if (req.body.status === 'completed') {
            transferStock(transfer.items, false, transfer.destination, req.groupId);
        }
        await transfer.save();
        res.status(200).json({
            message: 'Transfer created.',
            transfer
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.transferUnassignedStock = async (req, res, next) => {
    const productId = req.params.productId;
    const stock = req.body.stock;
    const locationId = req.body.locationId;
    const variantSku = req.params.variantSku;
    try {
        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error('Could not find any product');
            error.statusCode = 404;
            throw error;
        }
        if (product.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        if (variantSku) {
            product.variants.forEach((variant) => {
                if (variant.sku == variantSku) {
                    variant.locations.forEach(location => {
                        if (location._id == locationId) {
                            location.quantity += Number(stock);
                        }
                    });
                }
            });
        } else {
            product.locations.forEach(location => {
                if (location._id == locationId) {
                    location.quantity += Number(stock);
                }
            });
        }
        await product.save();
        res.status(200).json({
            message: 'Transfer completed'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateTransfer = async (req, res, next) => {
    const transferId = req.params.transferId;
    const status = req.body.status;
    try {
        const transfer = await Transfer.findById(transferId);
        if (!transferId) {
            const error = new Error('Could not find any transfer');
            error.statusCode = 404;
            throw error;
        }
        if (transfer.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        transfer.description = req.body.description;
        transfer.origin = req.body.origin;
        transfer.destination = req.body.destination;
        transfer.items = req.body.items;
        transfer.dateSent = req.body.dateSent;
        transfer.dateRecieved = req.body.dateRecieved;
        transfer.items.forEach(item => {
            if (!item.isVariant) {
                item.sku = false;
            }
            if (status === 'transit') {
                transferStock(transfer.items, transfer.origin, false, item.quantity, false, req.groupId);
            } else if (status === 'completed') {
                transferStock(transfer.items, false, transfer.destination, false, item.quantity, req.groupId);
            }
        });

        await transfer.save();
        res.status(200).json({
            message: 'Transfer updated'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteTransfer = async (req, res, next) => {
    const transferId = req.params.transferId;
    try {
        const transfer = await Transfer.findById(transferId);
        if (!transfer) {
            const error = new Error('Could not find any transfer');
            error.statusCode = 404;
            throw error;
        }
        if (transfer.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await transfer.remove();
        res.status(200).json({
            message: 'Transfer deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const transferStock = async (items, fromLocation, toLocation, groupId) => {
    let productId;
    try {
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            if (item.isVariant) {
                productId = item.productId;
            } else {
                productId = item._id;
            }
            const product = await Product.findById(productId);
            if (!product) {
                const error = new Error('Could not find any product');
                error.statusCode = 404;
                throw error;
            }
            if (product.creator._id.toString() !== groupId) {
                const error = new Error('Not authorized.');
                error.statusCode = 403;
                throw error;
            }
            if (item.isVariant) {
                product.variants.forEach((variant) => {
                    if (variant.sku == item.sku) {
                        variant.locations.forEach(location => {
                            if (fromLocation == location._id) {
                                location.quantity = Number(fromLocationStock);
                            } else if (toLocation == location._id) {
                                location.quantity += Number(toLocationStock);
                            }
                        });
                    }
                });
            } else {
                product.locations.forEach(location => {
                    if (fromLocation == location._id) {
                        location.quantity = Number(fromLocationStock);
                    } else if (toLocation == location._id) {
                        location.quantity += Number(toLocationStock);
                    }
                });
            }
        }
        await product.save();
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
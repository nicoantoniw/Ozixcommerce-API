const { validationResult } = require('express-validator');
const moment = require('moment');

const Transfer = require('../models/transfer');
const Product = require('../models/product');
const Location = require('../models/location');
const Group = require('../models/group');

exports.getTransfers = async (req, res, next) => {
    try {
        const totalTransfers = await Transfer.find({
            creator: req.groupId
        }).countDocuments();
        const transfers = await Transfer.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .populate('items.product', { name: 1, _id: 1 })
            .populate('origin', { name: 1, _id: 1 })
            .populate('destination', { name: 1, _id: 1 })
            .sort({ createdAt: -1 });

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
        const transfer = await Transfer.findById(transferId)
            .populate('creator', { name: 1, _id: 1 })
            .populate('creator', { name: 1, _id: 1 })
            .populate('items.product', { name: 1, _id: 1, variants: 1 })
            .populate('origin', { name: 1, _id: 1 })
            .populate('destination', { name: 1, _id: 1 });
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
        creator: req.groupId
    });
    try {
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
    const variantSku = req.body.variantSku;
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
        if (req.body.status) {
            transfer.status = req.body.status;
            if (req.body.dateDispatched) {
                transfer.dateDispatched = moment.utc(req.body.dateDispatched);
            }
            transfer.dateReceived = moment.utc(req.body.dateReceived);
            if (req.body.status === 'In Transit') {
                transferStock(transfer.items, transfer.origin, false, req.groupId);
            } else if (req.body.status === 'Completed') {
                transferStock(transfer.items, false, transfer.destination, req.groupId);
            }
        } else {
            transfer.description = req.body.description;
            transfer.origin = req.body.origin;
            transfer.destination = req.body.destination;
            transfer.items = req.body.items;
        }
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
        for (let i = 0; i < transfer.items.length; i++) {
            const item = transfer.items[i];
            const product = await Product.findById(item.product).populate('locations.location');
            if (!product) {
                const error = new Error('Could not find any product');
                error.statusCode = 404;
                throw error;
            }
            if (item.variantSku) {
                for (let q = 0; q < product.variants.length; q++) {
                    const variant = product.variants[q];
                    if (variant.sku == item.variantSku) {
                        for (let w = 0; w < variant.locations.length; w++) {
                            const location = variant.locations[w];
                            if (transfer.status === 'In Transit') {
                                if (transfer.origin.toString() === location.location._id.toString()) {
                                    location.quantity += Number(item.quantity);
                                }
                            }
                            if (transfer.status === 'Completed') {
                                if (transfer.origin.toString() === location.location._id.toString()) {
                                    location.quantity += Number(item.quantity);
                                }
                                if (transfer.destination.toString() === location.location._id.toString()) {
                                    location.quantity -= Number(item.quantity);
                                }
                            }
                        }

                    }
                };
            } else {
                for (let y = 0; y < product.locations.length; y++) {
                    const location = product.locations[y];
                    if (transfer.status === 'In Transit') {
                        if (transfer.origin.toString() === location.location._id.toString()) {
                            location.quantity += Number(item.quantity);
                        }
                    }
                    if (transfer.status === 'Completed') {
                        if (transfer.origin.toString() === location.location._id.toString()) {
                            location.quantity += Number(item.quantity);
                        }
                        if (transfer.destination.toString() === location.location._id.toString()) {
                            location.quantity -= Number(item.quantity);
                        }
                    }
                }
            }
            await product.save();
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

exports.deleteTransfers = async (req, res, next) => {
    const transfers = req.body.transfers;
    try {
        for (let index = 0; index < transfers.length; index++) {
            const element = transfers[index];
            const transfer = await Transfer.findById(element._id);
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
            for (let i = 0; i < transfer.items.length; i++) {
                const item = transfer.items[i];
                const product = await Product.findById(item.product).populate('locations.location');
                if (!product) {
                    const error = new Error('Could not find any product');
                    error.statusCode = 404;
                    throw error;
                }
                if (item.variantSku) {
                    for (let q = 0; q < product.variants.length; q++) {
                        const variant = product.variants[q];
                        if (variant.sku == item.variantSku) {
                            for (let w = 0; w < variant.locations.length; w++) {
                                const location = variant.locations[w];
                                if (transfer.status === 'In Transit') {
                                    if (transfer.origin.toString() === location.location._id.toString()) {
                                        location.quantity += Number(item.quantity);
                                    }
                                }
                                if (transfer.status === 'Completed') {
                                    if (transfer.origin.toString() === location.location._id.toString()) {
                                        location.quantity += Number(item.quantity);
                                    }
                                    if (transfer.destination.toString() === location.location._id.toString()) {
                                        location.quantity -= Number(item.quantity);
                                    }
                                }
                            }

                        }
                    };
                } else {
                    for (let y = 0; y < product.locations.length; y++) {
                        const location = product.locations[y];
                        if (transfer.status === 'In Transit') {
                            if (transfer.origin.toString() === location.location._id.toString()) {
                                location.quantity += Number(item.quantity);
                            }
                        }
                        if (transfer.status === 'Completed') {
                            if (transfer.origin.toString() === location.location._id.toString()) {
                                location.quantity += Number(item.quantity);
                            }
                            if (transfer.destination.toString() === location.location._id.toString()) {
                                location.quantity -= Number(item.quantity);
                            }
                        }
                    }
                }
                await product.save();
            }
            await transfer.remove();
        }
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

const transferStock = async (items, origin, destination, groupId) => {
    let productId;
    let notthere;
    try {
        for (let index = 0; index < items.length; index++) {
            notthere = true;
            const item = items[index];
            console.log(item);
            productId = item.product;
            const product = await Product.findById(productId).populate('locations.location');
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
            if (item.variantSku) {
                for (let q = 0; q < product.variants.length; q++) {
                    const variant = product.variants[q];
                    if (variant.sku == item.variantSku) {
                        variant.locations.forEach(location => {
                            if (origin.toString() === location.location._id.toString()) {
                                location.quantity -= Number(item.quantity);
                            } else if (destination.toString() === location.location._id.toString()) {
                                location.quantity += Number(item.quantity);
                                notthere = false;
                            }
                        });
                        if (notthere && destination) {
                            const location = await Location.findById(destination);
                            variant.locations.push({
                                location: location._id,
                                name: location.name,
                                quantity: item.quantity
                            });
                        }
                    }
                };
            } else {
                product.locations.forEach(location => {
                    if (origin.toString() === location.location._id.toString()) {
                        location.quantity -= Number(item.quantity);
                    } else if (destination.toString() === location.location._id.toString()) {
                        location.quantity += Number(item.quantity);
                        notthere = false;
                    }
                });
                if (notthere && destination) {
                    const location = await Location.findById(destination);
                    product.locations.push({
                        location: location._id,
                        name: location.name,
                        quantity: item.quantity
                    });
                }
            }
            await product.save();
        }
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        throw (err);
    }
};
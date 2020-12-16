const { validationResult } = require('express-validator');

const Location = require('../models/location');
const Product = require('../models/product');

exports.getLocations = async (req, res, next) => {
    try {
        const totalLocations = await Location.find({
            creator: req.groupId
        }).countDocuments();
        const locations = await Location.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ name: 1 });

        if (totalLocations === 0) {
            const error = new Error('No locations found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            locations,
            totalLocations
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getLocation = async (req, res, next) => {
    const locationId = req.params.locationId;
    try {
        const location = await Location.findOne({
            _id: locationId
        }).populate('creator', { name: 1, _id: 1 });
        if (!location) {
            const error = new Error('No location found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            location
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.addLocation = async (req, res, next) => {
    const location = new Location({
        name: req.body.name,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip,
        creator: req.groupId
    });
    try {
        await location.save();
        res.status(200).json({
            message: 'Location created.',
            location
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateLocation = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect');
        error.statusCode = 422;
        next(error);
    }
    const locationId = req.params.locationId;
    try {
        const location = await Location.findById(locationId).populate('creator');
        if (!location) {
            const error = new Error('Could not find any location');
            error.statusCode = 404;
            throw error;
        }
        if (location.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        location.name = req.body.name;
        location.address = req.body.address;
        location.city = req.body.city;
        location.state = req.body.state;
        location.zip = req.body.zip;
        await location.save();
        res.status(200).json({
            message: 'location updated.',
            location
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.deleteLocation = async (req, res, next) => {
    const locationId = req.params.locationId;
    try {
        const location = await Location.findById(locationId);
        if (!location) {
            const error = new Error('Could not find any location');
            error.statusCode = 404;
            throw error;
        }
        if (location.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        const products = await Product.find();
        for (let index = 0; index < products.length; index++) {
            const product = products[index];
            for (let index = 0; index < product.locations.length; index++) {
                const productLocation = product.locations[index];
                const index2 = product.locations.indexOf(productLocation);
                if (productLocation.location.toString() == location._id.toString()) {
                    product.unassignedStock += productLocation.quantity;
                    product.locations.splice(index2, 1);
                }
            }
            await product.save();
        }
        await location.remove();
        res.status(200).json({
            message: 'Location deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteLocations = async (req, res, next) => {
    const locations = req.body.locations;
    const products = await Product.find();
    try {
        for (let index = 0; index < locations.length; index++) {
            const element = locations[index];
            const location = await Location.findById(element._id);
            for (let index = 0; index < products.length; index++) {
                const product = products[index];
                for (let index = 0; index < product.locations.length; index++) {
                    const productLocation = product.locations[index];
                    const index2 = product.locations.indexOf(productLocation);
                    if (productLocation.location.toString() == location._id.toString()) {
                        product.unassignedStock += productLocation.quantity;
                        product.locations.splice(index2, 1);
                    }
                }
                await product.save();
            }
            await location.remove();
        }
        res.status(200).json({
            message: 'Locations deleted.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
const macaddress = require('macaddress');

const Group = require('../models/group');
const Mac = require('../models/mac');


exports.getAddress = async (req, res, next) => {
    try {
        const macAddress = macaddress.one(function (err, mac) {
            return mac;
        });
        const address = await Mac.findOne({ address: macAddress });
        if (!address) {
            return res.status(200).json({
                address: true
            });
        }
        res.status(200).json({
            address: false
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addAddress = async (req, res, next) => {
    try {
        const macAddress = macaddress.one(function (err, mac) {
            return mac;
        });
        const address = new Mac({
            address: macAddress,
            creator: req.groupId
        });
        await address.save();
        res.status(200).json({
            address,
            message: 'Device added'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.removeAddress = async (req, res, next) => {
    try {
        const macAddress = macaddress.one(function (err, mac) {
            return mac;
        });
        await Mac.findOneAndRemove({ address: macAddress });
        res.status(200).json({
            message: 'Device removed'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
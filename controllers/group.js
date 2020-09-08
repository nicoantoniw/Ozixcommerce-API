const Group = require('../models/group');

exports.getGroups = async (req, res, next) => {
    try {
        const groups = await Group.find();
        if (!groups) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            groups
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getGroup = async (req, res, next) => {
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            name: group.name
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addGroup = async (req, res, next) => {
    const name = req.body.name;
    const plan = req.body.plan;

    try {
        const group = new Group({
            name,
            plan
        });
        await group.save();
        res.status(200).json({ message: 'Group created' });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};

exports.getSalePoints = async (req, res, next) => {
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        let salePoints = group.salePoint;
        const defaultSalePoint = group.defaultSalePoint;
        res.status(200).json({
            salePoints,
            defaultSalePoint
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePersonalData = async (req, res, next) => {
    const data = {
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
        phone: req.body.phone
    };
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        group.province = data.province;
        group.city = data.city;
        group.streetAddress = data.streetAddress;
        group.zip = data.zip;
        group.apartment = data.apartment;
        group.category = data.category;
        group.personeria = data.personeria;
        group.cuit = data.cuit;
        group.activitiesDate = data.activitiesDate;
        group.socialName = data.socialName;
        group.brutosNumber = data.brutosNumber;
        group.phone = data.phone;
        await group.save();
        res.status(200).json({
            group,
            message: 'Data updated'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addSalePoint = async (req, res, next) => {
    const data = {
        salePoint: req.body.salePoint,
        defaultSalePoint: req.body.defaultSalePoint,
    };
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        group.salePoint.push(data.salePoint);
        group.defaultSalePoint = data.defaultSalePoint;
        await group.save();
        res.status(200).json({
            group,
            message: 'Data updated'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateDefaultSalePoint = async (req, res, next) => {
    const salePoint = req.body.salePoint;
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        group.defaultSalePoint = salePoint;
        await group.save();
        res.status(200).json({
            group,
            message: 'Data updated'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteSalePoint = async (req, res, next) => {
    const salePoint = req.query.salePoint;
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        let salePoints = group.salePoint;
        const position = (salePoints.indexOf(salePoint));
        salePoints.splice(position, 1);
        group.salePoint = salePoints;
        if (group.defaultSalePoint === salePoint && salePoints.length > 0) {
            group.defaultSalePoint = salePoints[0];
        } else if (group.defaultSalePoint === salePoint && salePoints.length === 0) {
            group.defaultSalePoint = '';
        }
        await group.save();
        res.status(200).json({
            salePoints
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
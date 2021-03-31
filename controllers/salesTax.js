const Taxjar = require('taxjar');

const Contact = require('../models/contact');
const Group = require('../models/group');
const TaxRate = require('../models/taxRate');

const taxjarClient = new Taxjar({
    apiKey: 'b07c9e97df11ecdb1cc4787186cf912a'
});

exports.getSalesTax = async (req, res, next) => {
    const amount = req.query.amount;
    const contact = await Contact.findById(req.query.customer);
    const group = await Group.findById(req.groupId);

    taxjarClient.taxForOrder({
        from_country: 'US',
        from_zip: group.companyAddress.zip,
        from_state: group.companyAddress.state,
        from_city: group.companyAddress.city,
        from_street: group.companyAddress.street,
        to_country: 'US',
        to_zip: contact.shippingAddress.zip,
        to_state: contact.shippingAddress.state,
        to_city: contact.shippingAddress.city,
        to_street: contact.shippingAddress.street,
        amount: amount,
        shipping: 0,
        line_items: []
    }).then(
        response => {
            res.status(200).json({
                response
            });
        }
    ).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    });
};

exports.getCategories = async (req, res, next) => {
    taxjarClient.categories().then(
        response => {
            res.status(200).json({
                categories: response.categories
            });
        }
    ).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    });
};

exports.getTaxRates = async (req, res, next) => {
    try {
        const totalTaxRates = await TaxRate.find({
            creator: req.groupId
        }).countDocuments();
        const taxRates = await TaxRate.find({ creator: req.groupId })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: -1 });
        if (totalTaxRates === 0) {
            const error = new Error('No taxRates found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            taxRates: taxRates,
            totalTaxRates: totalTaxRates
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};

exports.validateAddress = async (req, res, next) => {
    taxjarClient.validateAddress({
        country: 'US',
        state: 'FL',
        zip: '32824',
        city: 'Orlando',
        street: '9610 S Orange Ave',
    }).then(
        response => {
            res.status(200).json({
                response
            });
        }
    ).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    });
};

exports.addTaxRate = async (req, res, next) => {
    try {
        let taxRate;
        if (req.body.rates.length > 0) {
            taxRate = new TaxRate({
                name: req.body.name,
                rate: 0,
                rates: req.body.rates,
                creator: req.groupId
            });
            for (let index = 0; index < taxRate.rates.length; index++) {
                const rate = taxRate.rates[index];
                taxRate.rate += rate.rateNumber;
            }
            await taxRate.save();
        } else {
            taxRate = new TaxRate({
                name: req.body.name,
                rate: req.body.rate,
                creator: req.groupId
            });
            await taxRate.save();
        }
        res.status(200).json({
            message: 'TaxRate created.',
            taxRate
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteTaxRate = async (req, res, next) => {
    const taxRateId = req.params.taxRateId;
    try {
        const taxRate = await TaxRate.findById(taxRateId);
        if (!taxRate) {
            const error = new Error('Could not find any taxRate');
            error.statusCode = 404;
            throw error;
        }
        if (taxRate.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized.');
            error.statusCode = 403;
            throw error;
        }
        await taxRate.remove();
        res.status(200).json({
            message: 'TaxRate deleted'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
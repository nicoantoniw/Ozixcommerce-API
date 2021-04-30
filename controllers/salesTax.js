const Taxjar = require('taxjar');

const Contact = require('../models/contact');
const Group = require('../models/group');
const invoice = require('../models/invoice');
const TaxRate = require('../models/taxRate');

const taxjarClient = new Taxjar({
    apiKey: 'b07c9e97df11ecdb1cc4787186cf912a'
});

exports.getSalesTax = async (req, res, next) => {
    try {
        const amount = req.query.amount;
        const group = await Group.findById(req.groupId);
        const contact = await Contact.findById(req.query.contactId);
        if (contact.shippingAddress.street === '' && req.query.shipToAddressCheckbox === 'true' || contact.shippingAddress.state === '' && req.query.shipToAddressCheckbox === 'true' || contact.shippingAddress.zip === '' && req.query.shipToAddressCheckbox === 'true' || contact.shippingAddress.city === '' && req.query.shipToAddressCheckbox === 'true') {
            contact.shippingAddress.street = req.query.street;
            contact.shippingAddress.city = req.query.city;
            contact.shippingAddress.state = req.query.state;
            contact.shippingAddress.zip = req.query.zip;
            await contact.save();
        }
        if (!group.validatedAddress) {
            const error = new Error('Business address not validated');
            error.statusCode = 102;
            throw error;
        }
        if (req.query.shipToAddressCheckbox === 'false' || req.query.customerAddressCheckbox === 'false') {
            return console.log('1');
            taxjarClient.taxForOrder({
                from_country: 'US',
                from_zip: group.companyAddress.zip,
                from_state: group.companyAddress.state,
                from_city: group.companyAddress.city,
                from_street: group.companyAddress.street,
                to_country: 'US',
                to_zip: group.companyAddress.zip,
                to_state: group.companyAddress.state,
                to_city: group.companyAddress.city,
                to_street: group.companyAddress.street,
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
                err.statusCode = err.status;
                if (!err.statusCode) {
                    err.statusCode = 500;
                }
                next(err);
            });
        } else {
            return console.log('2');

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
                err.statusCode = err.status;
                if (!err.statusCode) {
                    err.statusCode = 500;
                }
                next(err);
            });
        }
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }


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
    const country = req.body.country;
    const state = req.body.state;
    const zip = req.body.zip;
    const city = req.body.city;
    const street = req.body.street;
    let contact = null;
    if (req.body.contact) {
        contact = await Contact.findById(contact._id);
    }
    taxjarClient.validateAddress({
        country: country,
        state: state,
        zip: zip,
        city: city,
        street: street,
    }).then(
        response => {
            if (contact) {
                contact.validatedAddress = true;
                contact.save();
            }
            res.status(200).json({
                response
            });
        }
    ).catch(err => {
        err.statusCode = err.status;
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
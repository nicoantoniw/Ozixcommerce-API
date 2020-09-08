const { validationResult } = require('express-validator');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const WebsiteUser = require('../models/websiteUser');
const Product = require('../models/product');
const Quote = require('../models/quote');

AWS.config.update({
    region: 'us-east-1',
    accessKeyId: 'AKIAIO7VWTQE6SOGBPCA',
    secretAccessKey: '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'
});

exports.getWebsiteUser = async (req, res, next) => {
    try {
        const user = await WebsiteUser.findById(req.userId);
        if (!user) {
            const error = new Error('No user found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            user
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateWebsiteUser = async (req, res, next) => {
    const name = req.body.name;
    const surname = req.body.surname;
    const idNumber = req.body.idNumber;
    const phone = req.body.phone;
    const address = req.body.address;
    const province = req.body.province;
    const city = req.body.city;
    const zip = req.body.zip;
    try {
        const user = await WebsiteUser.findById(req.userId);
        if (!user) {
            const error = new Error('No user found');
            error.statusCode = 404;
            throw error;
        }
        user.name = name;
        user.surname = surname;
        user.idNumber = idNumber;
        user.phone = phone;
        user.address = address;
        user.province = province;
        user.city = city;
        user.zip = zip;
        res.status(200).json({
            message: 'User updated'
        });
        await user.save();
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getProductsPerfumeriaLiliana = async (req, res, next) => {
    try {
        const totalItems = await Product.find({
            creator: '5ea9c4a058eb5371b70d4dc6'
        }).countDocuments();
        const products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6' })
            .populate('category', { name: 1, _id: 1 })
            .populate('creator', { name: 1, _id: 1 })
            .sort({ createdAt: -1 });

        if (totalItems === 0) {
            const error = new Error('No products found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            products: products,
            totalItems: totalItems
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getProductPerfumeriaLiliana = async (req, res, next) => {
    const productId = req.params.productId;
    const sku = req.params.sku;
    try {
        const product = await Product.findOne({
            _id: productId, creator: '5ea9c4a058eb5371b70d4dc6'
        })
            .populate('category', { name: 1, _id: 1 })
            .populate('creator', { name: 1, _id: 1 });
        if (!product) {
            const error = new Error('No products found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            product
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getCart = async (req, res, next) => {
    const websiteUserId = req.params.websiteUserId;
    try {
        const websiteUser = await WebsiteUser.findById(websiteUserId);
        if (!websiteUser) {
            const error = new Error('No user found');
            error.statusCode = 404;
            throw error;
        }
        const cart = websiteUser.cart;
        res.status(200).json({
            cart
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.addItem = async (req, res, next) => {
    const websiteUserId = req.userId;
    const data = {
        product: req.body.product,
        quantity: req.body.quantity,
        price: req.body.price,
        image: req.body.image,
        name: req.body.name
    };
    if (req.body.hasVariants) {
        data.variant = req.body.variant;
    }
    const sellingPrice = data.quantity * data.price;
    data.price = sellingPrice;
    let cartProduct;
    let exists;
    try {
        const websiteUser = await WebsiteUser.findById(websiteUserId);
        if (!websiteUser) {
            const error = new Error('No user found');
            error.statusCode = 404;
            throw error;
        }
        const cart = websiteUser.cart;
        for (let index = 0; index < cart.items.length; index++) {
            cartProduct = cart.items[index].product;
            if (cartProduct.toString() === data.product) {
                cart.items[index].quantity += data.quantity;
                cart.items[index].price += data.price;
                exists = true;
                break;
            } else {
                exists = false;
            }

        }
        cart.total += data.price;
        if (!exists) {
            cart.items.push(data);
        }
        await websiteUser.save();
        res.status(200).json({
            message: 'Item added to the cart',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.deleteItem = async (req, res, next) => {
    const websiteUserId = req.userId;
    const productId = req.params.productId;
    let indexe;
    try {
        const websiteUser = await WebsiteUser.findById(websiteUserId);
        if (!websiteUser) {
            const error = new Error('No user found');
            error.statusCode = 404;
            throw error;
        }
        const cart = websiteUser.cart;
        for (let index = 0; index < cart.items.length; index++) {
            const product = cart.items[index].product;
            const price = cart.items[index].price;
            if (product.toString() === productId) {
                indexe = index;
                break;
            }
        }
        cart.total -= cart.items[indexe].price;
        cart.items.splice(indexe, 1);
        await websiteUser.save();
        res.status(200).json({
            message: 'Item deleted from the cart',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.restoreCart = async (req, res, next) => {
    const websiteUserId = req.userId;
    try {
        const websiteUser = await WebsiteUser.findById(websiteUserId);
        if (!websiteUser) {
            const error = new Error('No user found');
            error.statusCode = 404;
            throw error;
        }
        const cart = websiteUser.cart;
        cart.items = [];
        cart.total = 0;
        await websiteUser.save();
        res.status(200).json({
            message: 'Cart restored',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addMercadopagoSale = (req, res, next) => {
    let access_token;
    if (req.groupId === '5eb9d8dcdb624f0a8b7822cb') {
        access_token = 'TEST-6177529630631696-051916-62c717ce320ff9217ef70ee38cb779da-243893987';
    }
    mercadopago.configure({
        access_token
    });
    let preference = {
        items: [],
        'back_urls': {
            'success': 'http://localhost:8080/payment/success',
            'failure': 'http://localhost:8080/payment/error',
            'pending': 'http://localhost:8080/compras',
        },
        "auto_return": 'approved'
    };
    const cartItems = req.body.items;
    cartItems.forEach(item => {
        const data = {
            title: item.name,
            unit_price: item.price / item.quantity,
            quantity: item.quantity,
            id: item._id,
            currency_id: 'ARS'
        };
        preference.items.push(data);
    });
    mercadopago.preferences.create(preference).then((response) => {
        global.init_point = response.body.init_point;
        const url = global.init_point;
        res.status(200).json({
            message: 'ok',
            url
        });
    }).catch((err) => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    });;
};

exports.getQuotes = async (req, res, next) => {
    let creator;
    if (req.groupId === '5eb9d8dcdb624f0a8b7822cb') {
        creator = '5ea9c4a058eb5371b70d4dc6';
    }
    try {
        const totalQuotes = await Quote.find({
            creator: creator, customer: req.clientId
        }).countDocuments();
        const quotes = await Quote.find({ creator: creator, customer: req.clientId });

        if (totalQuotes === 0) {
            const error = new Error('No quotes found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            totalQuotes,
            quotes
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getQuote = async (req, res, next) => {
    const quoteId = req.params.quoteId;
    try {
        const quote = await Quote.findById(quoteId);
        if (!quote) {
            const error = new Error('No quote found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            quote
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addLastQuote = async (req, res, next) => {
    const userId = req.userId;
    const lastQuote = req.body.quoteId;
    try {
        const user = await WebsiteUser.findById(userId);
        user.lastQuote = lastQuote;
        await user.save();
        res.status(200).json({
            message: 'Quote saved',
            user
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.changePassword = async (req, res, next) => {
    const password = req.body.password;
    const oldPassword = req.body.oldPassword;
    try {
        const user = await WebsiteUser.findById(req.userId);
        const isEqual = await bcrypt.compare(oldPassword, user.password);
        if (!isEqual) {
            const error = new Error('Password incorrect');
            error.statusCode = 401;
            throw error;
        }
        const newPassword = await bcrypt.hash(password, 12);
        user.password = newPassword;
        await user.save();
        res.status(200).json({
            message: 'Password changed'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
exports.restorePassword = async (req, res, next) => {
    const email = req.body.email;
    const password = crypto.randomBytes(6).toString('hex');
    try {
        const user = await WebsiteUser.findOne({ email: email });
        if (!user) {
            const error = new Error('No user found');
            error.statusCode = 404;
            throw error;
        }
        const newPassword = await bcrypt.hash(password, 12);
        user.password = newPassword;
        await user.save();
        res.status(200).json({
            message: 'Password changed',
            password
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.sendEmail = (req, res, next) => {
    const subject = (req.body.subject).toString();
    const html = req.body.html;
    const sender = req.body.sender;
    const receiver = req.body.receiver;
    const message = {
        to: receiver,
        from: sender,
        subject: subject,
        html: html
    };
    const params = {
        Destination: { /* required */
            CcAddresses: [
                receiver
            ],
            ToAddresses: [
                receiver
            ]
        },
        Message: { /* required */
            Body: { /* required */
                Html: {
                    Charset: "UTF-8",
                    Data: html
                },
                Text: {
                    Charset: "UTF-8",
                    Data: "TEXT_FORMAT_BODY"
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject
            }
        },
        Source: sender,
        ReplyToAddresses: [
            sender
        ],
    };

    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    sendPromise.then(
        function (data) {
            res.status(200).json({
                message: data.MessageId
            });
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });
};



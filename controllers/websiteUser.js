const { validationResult } = require('express-validator');
const mercadopago = require('mercadopago');

const WebsiteUser = require('../models/websiteUser');
const Product = require('../models/product');

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
    const code = req.params.code;
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
    const finalPrice = data.quantity * data.price;
    data.price = finalPrice;
    let cartProduct;
    let cartQuantity;
    let cartPrice;
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
            cartQuantity = cart.items[index].quantity;
            cartPrice = cart.items[index].price;
            if (cartProduct.toString() === data.product) {
                cart.items[index].quantity += data.quantity;
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
        cart.total -= cart.items[indexe].price * cart.items[indexe].quantity;
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
            'success': 'http://localhost:8080',
            'failure': 'http://localhost:8080',
            'pending': 'http://localhost:8080',
        },
        "auto_return": 'approved',
        'payment_methods': {
            "binary_mode": true
        }
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
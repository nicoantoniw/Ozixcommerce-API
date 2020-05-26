const { validationResult } = require('express-validator');

const WebsiteAdmin = require('../models/websiteUser');
const Product = require('../models/product');

exports.getWebsiteProducts = async (req, res, next) => {
    try {
        const totalItems = await Product.find({
            creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1
        }).countDocuments();
        const products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1 })
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

exports.getFeaturedProducts = async (req, res, next) => {
    try {
        const totalItems = await Product.find({
            creator: '5ea9c4a058eb5371b70d4dc6', websiteFeaturedStatus: 1
        }).countDocuments();
        const products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6', websiteFeaturedStatus: 1 })
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

exports.getPromotionProducts = async (req, res, next) => {
    try {
        const totalItems = await Product.find({
            creator: '5ea9c4a058eb5371b70d4dc6', websitePromotionsStatus: 1
        }).countDocuments();
        const products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6', websitePromotionsStatus: 1 })
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

exports.editProductWebsiteStatus = async (req, res, next) => {
    const productId = req.body.productId;
    const status = req.body.status;
    const websiteFeaturedStatus = req.body.websiteFeaturedStatus;
    const websitePromotionsStatus = req.body.websitePromotionsStatus;
    let discount = 0;
    try {
        const product = await Product.findById(productId).populate('creator', {
            name: 1,
            _id: 1
        });
        if (!product) {
            const error = new Error('Could not find any product');
            error.statusCode = 404;
            throw error;
        }
        if (product.creator._id.toString() !== req.groupId) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        product.websiteStatus = status;
        product.websiteFeaturedStatus = websiteFeaturedStatus;
        product.websitePromotionsStatus = websitePromotionsStatus;
        await product.save();
        res.status(200).json({
            message: 'Product updated.',
            product
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};
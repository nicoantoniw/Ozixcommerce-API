const { validationResult } = require('express-validator');

const WebsiteAdmin = require('../models/websiteUser');
const Product = require('../models/product');
const Category = require('../models/category');

exports.getWebsiteProducts = async (req, res, next) => {
    try {
        const totalItems = await Product.find({
            creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1
        }).countDocuments();
        const products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1 })
            .populate('category', { name: 1, _id: 1 })
            .populate('creator', { name: 1, _id: 1 });
        // .sort({ sellingPrice: -1 });

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

exports.getCategoryProducts = async (req, res, next) => {
    const skip = (req.query.page - 1) * 6;
    const sort = (req.query.sort);
    const pagination = req.query.pagination;
    let products;
    try {
        const category = await Category.findOne({ name: req.params.category });
        const totalItems = await Product.find({
            creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1, category: category._id
        }).countDocuments();
        if (pagination) {
            products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1, category: category._id })
                .populate('category', { name: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .sort({ createdAt: 1 });
        }
        else if (sort == 0) {
            products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1, category: category._id })
                .populate('category', { name: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .limit(6).skip(skip)
                .sort({ createdAt: 1 });
        } else {
            products = await Product.find({ creator: '5ea9c4a058eb5371b70d4dc6', websiteStatus: 1, category: category._id })
                .populate('category', { name: 1, _id: 1 })
                .populate('creator', { name: 1, _id: 1 })
                .limit(6).skip(skip)
                .sort({ sellingPrice: sort });
        }
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

exports.changeCategories = async (req, res, next) => {
    const products = req.body.products;
    const category = req.body.category;
    try {
        products.forEach(async (element) => {
            const product = await Product.findById(element._id);
            product.category = category;
            await product.save();
        });
        res.status(200).json({
            message: 'Products updated.',
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};
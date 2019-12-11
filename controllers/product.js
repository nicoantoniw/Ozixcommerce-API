const { validationResult } = require('express-validator');

const Product = require('../models/product');
const Category = require('../models/category');

exports.getProducts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Product.find({
      creator: req.groupId
    }).countDocuments();
    const products = await Product.find({ creator: req.groupId })
      .populate('category', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

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

exports.getProductsByCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId;
  try {
    const totalProducts = await Product.find({
      creator: req.groupId,
      category: categoryId
    }).countDocuments();
    const products = await Product.find({
      category: categoryId,
      creator: req.groupId
    })
      .populate('creator', { name: 1, _id: 1 })
      .populate('category', { name: 1, _id: 1 });
    if (totalProducts === 0) {
      const error = new Error('No products found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      products: products,
      totalProducts: totalProducts
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findOne({
      _id: productId,
      creator: req.groupId
    })
      .populate('category', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 });
    if (!product) {
      const error = new Error('No products found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.listProduct = async (req, res, next) => {
  let value = req.query.value;
  try {
    const product = await Product.find({
      $or: [

        { 'name': { $regex: value, $options: 'i' } },
        { 'description': { $regex: value, $options: 'i' } },
        { 'code': { $regex: value, $options: 'i' } }
      ]
    }, { createdAt: 0 })
      .populate('category', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 });
    res.status(200).json({
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  try {
    const calculatedPercentage = (Number(req.body.price) * Number(req.body.percentage)) / 100;
    const calculatedPrice = Number(req.body.price) + calculatedPercentage;
    const product = new Product({
      name: req.body.name,
      code: req.body.code,
      description: req.body.description,
      category: req.body.category,
      price: Number(req.body.price),
      percentage: Number(req.body.percentage),
      finalPrice: Number(calculatedPrice).toFixed(3),
      stock: req.body.stock,
      creator: req.groupId
    });
    await product.save();
    res.status(200).json({
      message: 'Product created.',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const productId = req.params.productId;
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
    const calculatedPercentage = (req.body.price * req.body.percentage) / 100;
    const calculatedPrice =
      Number(req.body.price) + Number(calculatedPercentage);
    product.name = req.body.name;
    product.code = req.body.code;
    product.description = req.body.description;
    product.price = req.body.price;
    product.percentage = req.body.percentage;
    product.finalPrice = calculatedPrice;
    product.stock = req.body.stock;
    product.category = req.body.category;
    await product.save();
    res.status(200).json({
      message: 'Product updated.',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activateProduct = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);
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
    product.status = 'activo';
    await product.save();
    res.status(200).json({
      message: 'Product has been activated',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivateProduct = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);
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
    product.status = 'inactivo';
    await product.save();
    res.status(200).json({
      message: 'Product has been deactivated',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  const productId = req.params.productId;
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
    await Product.findByIdAndRemove(productId);
    res.status(200).json({
      message: 'Product deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

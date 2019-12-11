const { validationResult } = require('express-validator');

const Purchase = require('../models/purchase');
const Product = require('../models/product');
const Group = require('../models/group');

exports.getPurchases = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalPurchases = await Purchase.find({
      creator: req.groupId
    }).countDocuments();
    const purchases = await Purchase.find({ creator: req.groupId })
      .populate('supplier', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

    if (totalPurchases === 0) {
      const error = new Error('No purchases found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      purchases: purchases,
      totalPurchases: totalPurchases
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPurchasesBySupplier = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  const supplierId = req.params.supplierId;
  try {
    const totalPurchases = await Purchase.find({
      creator: req.groupId,
      supplier: supplierId
    }).countDocuments();
    const purchases = await Purchase.find({
      creator: req.groupId,
      supplier: supplierId
    })
      .populate('supplier', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

    if (totalPurchases === 0) {
      const error = new Error('No purchases found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      purchases: purchases,
      totalPurchases: totalPurchases
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPurchase = async (req, res, next) => {
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId)
      .populate('supplier', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 });
    if (!purchase) {
      const error = new Error('No purchase found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.listPurchase = async (req, res, next) => {
  try {
    let value = req.query.value;
    const purchase = await Purchase.find(
      {
        $or: [
          { 'title': new RegExp(value, 'i') },
          { 'ticketNumber': new RegExp(value, 'i') }
        ]
      },
      { createdAt: 0 }
    )
      .populate('supplier', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 });
    res.status(200).json({
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addPurchase = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  try {
    const purchase = new Purchase({
      title: req.body.title,
      description: req.body.description,
      ticketType: req.body.ticketType,
      ticketSerie: req.body.ticketSerie,
      ticketNumber: req.body.ticketNumber,
      total: req.body.total,
      details: req.body.details,
      creator: req.groupId,
      supplier: req.body.supplier
    });
    let details = req.body.details;
    await details.map(detail => {
      increaseStock(detail.product, detail.quantity, Number(detail.price));
    });
    await purchase.save();
    res.status(200).json({
      message: 'Purchase created.',
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePurchase = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId)
      .populate('supplier', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 });
    if (!purchase) {
      const error = new Error('Could not find any purchase');
      error.statusCode = 404;
      throw error;
    }
    if (purchase.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    purchase.title = req.body.title;
    purchase.description = req.body.description;
    purchase.ticketType = req.body.ticketType;
    purchase.ticketSerie = req.body.ticketSerie;
    purchase.ticketNumber = req.body.ticketNumber;
    purchase.total = req.body.total;
    purchase.details = req.body.details;
    let details = req.body.details;
    await details.map(detail => {
      increaseStock(detail.product, 0, Number(detail.price));
    });
    await purchase.save();
    res.status(200).json({
      message: 'Purchase updated.',
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activatePurchase = async (req, res, next) => {
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      const error = new Error('Could not find any purchase');
      error.statusCode = 404;
      throw error;
    }
    if (purchase.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    purchase.status = 'active';
    await purchase.save();
    res.status(200).json({
      message: 'Purchase has been activated',
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivatePurchase = async (req, res, next) => {
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      const error = new Error('Could not find any purchase');
      error.statusCode = 404;
      throw error;
    }
    if (purchase.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    purchase.status = 'inactive';
    await purchase.save();
    res.status(200).json({
      message: 'Purchase has been deactivated',
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePurchase = async (req, res, next) => {
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      const error = new Error('Could not find any purchase');
      error.statusCode = 404;
      throw error;
    }
    if (purchase.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await Purchase.findByIdAndRemove(purchaseId);
    res.status(200).json({
      message: 'Purchase deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const increaseStock = async (productId, quantity, price) => {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Could not find any product');
    error.statusCode = 404;
    throw error;
  }
  newStock = Number(product.stock) + Number(quantity);
  product.stock = newStock;
  product.price = price;
  product.finalPrice =
    price + (Number(product.percentage) * Number(product.price)) / 100;
  await product.save();
};

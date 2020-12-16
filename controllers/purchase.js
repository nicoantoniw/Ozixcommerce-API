const { validationResult } = require('express-validator');
const moment = require('moment');

const Purchase = require('../models/purchase');
const Product = require('../models/product');
const Account = require('../models/account');

exports.getPurchases = async (req, res, next) => {
  try {
    const totalPurchases = await Purchase.find({
      creator: req.groupId
    }).countDocuments();
    const purchases = await Purchase.find({ creator: req.groupId })
      .populate('supplier', { company: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

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
      .populate('supplier', { company: 1, _id: 1 })
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

exports.getPurchasesByDate = async (req, res, next) => {
  let day = req.query.day;
  let month = req.query.month;
  let year = req.query.year;
  const supplier = req.query.supplier;
  let start = 0;
  let end = 0;
  let leap = leapYear(year);
  if (day === '0' && month === '0') {
    start = `${year}-01-01T00:00:00`;
    end = `${year}-12-31T23:59:59`;
  } else if (day === '0' && leap) {
    switch (month) {
      case '01':
        day = 31;
        break;
      case '02':
        day = 29;
        break;
      case '03':
        day = 31;
        break;
      case '04':
        day = 30;
        break;
      case '05':
        day = 31;
        break;
      case '06':
        day = 30;
        break;
      case '07':
        day = 31;
        break;
      case '08':
        day = 31;
        break;
      case '09':
        day = 30;
        break;
      case '10':
        day = 31;
        break;
      case '11':
        day = 30;
        break;
      case '12':
        day = 31;
        break;
    }
    start = `${year}-${month}-01T00:00:00`;
    end = `${year}-${month}-${day}T23:59:59`;
  } else if (day === '0') {
    switch (month) {
      case '01':
        day = 31;
        break;
      case '02':
        day = 28;
        break;
      case '03':
        day = 31;
        break;
      case '04':
        day = 30;
        break;
      case '05':
        day = 31;
        break;
      case '06':
        day = 30;
        break;
      case '07':
        day = 31;
        break;
      case '08':
        day = 31;
        break;
      case '09':
        day = 30;
        break;
      case '10':
        day = 31;
        break;
      case '11':
        day = 30;
        break;
      case '12':
        day = 31;
        break;
    }
    start = `${year}-${month}-01T00:00:00`;
    end = `${year}-${month}-${day}T23:59:59`;
  } else if (day !== '0' && month === '0') {
    const error = new Error('Entered data is incorrect');
    error.statusCode = 422;
    next(error);
  } else {
    start = `${year}-${month}-${day}T00:00:00`;
    end = `${year}-${month}-${day}T23:59:59`;
  }
  try {
    const totalPurchases = await Purchase.find({
      creator: req.groupId,
      createdAt: { '$gte': start, '$lt': end }
    }).countDocuments();
    if (supplier !== '') {
      const purchases = await Purchase.find({ createdAt: { '$gte': start, '$lt': end }, supplier: supplier, creator: req.groupId })
        .populate('supplier', { company: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ createdAt: -1 });

      if (totalPurchases === 0) {
        const error = new Error('No purchases found');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        purchases,
        totalPurchases
      });
    } else {
      const purchases = await Purchase.find({ createdAt: { '$gte': start, '$lt': end }, creator: req.groupId })
        .populate('supplier', { company: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ createdAt: -1 });

      if (totalPurchases === 0) {
        const error = new Error('No purchases found');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        purchases,
        totalPurchases
      });
    }

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
      .populate('supplier', { company: 1, _id: 1 })
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

exports.addPurchase = async (req, res, next) => {
  const accountId = req.body.account;
  let amount;
  const data2 = {
    type: 'subtract',
    description: 'Compra',
    amount: req.body.total,
  };
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    const purchase = new Purchase({
      number: req.body.purchase.number,
      details: req.body.purchase.details,
      description: 'req.body.purchase.description',
      total: Number(req.body.purchase.total),
      subtotal: req.body.purchase.subtotal,
      taxes: req.body.purchase.taxes,
      discounts: Number(req.body.purchase.discounts),
      creator: req.groupId,
      supplier: req.body.purchase.supplier,
      createdAt: moment.utc(req.body.purchase.createdAt)
    });
    for (let index = 0; index < purchase.details.length; index++) {
      const detail = purchase.details[index];
      await increaseStock(detail.product, Number(detail.quantity));
    }
    // const account = await Account.findById(accountId);
    // if (!account) {
    //   const error = new Error('Could not find any register');
    //   error.statusCode = 404;
    //   throw error;
    // }
    // console.log(data2.amount);
    // amount = parseFloat((Number(data2.amount)).toFixed(2));
    // account.balance -= amount;
    // if (account.balance < 0) {
    //   const error = new Error('Account avaiable is lower than the amount required');
    //   error.statusCode = 602;
    //   throw error;
    // }
    // account.movements.push(data2);
    await purchase.save();
    // await account.save();
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
    await purchase.remove();
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

const increaseStock = async (product, quantity) => {
  let productId = product._id;
  if (product.isVariant) {
    productId = product.productId;
  };
  try {
    let product2 = await Product.findById(productId);
    if (!product) {
      const error = new Error('Could not find any product');
      error.statusCode = 404;
    }
    if (product.isVariant) {
      for (let i = 0; i < product2.variants.length; i++) {
        const variant = product2.variants[i];
        if (product.sku == variant.sku) {
          variant.stock += quantity;
        }
      }
    } else {
      product2.stock += quantity;
    }
    await product2.save();
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }

};

const leapYear = (year) => {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
};
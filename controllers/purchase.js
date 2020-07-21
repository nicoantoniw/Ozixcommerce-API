const { validationResult } = require('express-validator');
const moment = require('moment');

const Purchase = require('../models/purchase');
const Product = require('../models/product');
const Cash = require('../models/cash');

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


exports.getPurchasesByTicketType = async (req, res, next) => {
  const ticketType = req.params.ticketType;
  try {
    const totalPurchases = await Purchase.find({
      creator: req.groupId,
      ticketType: ticketType
    }).countDocuments();
    const purchases = await Purchase.find({ creator: req.groupId, ticketType: ticketType })
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
  const cashRegisterId = req.body.cashRegister;
  let amount;
  let date = moment.utc().utcOffset(-3);
  if (req.body.createdAt) {
    date = moment.utc(req.body.createdAt).set('hour', 15);
  }
  const data2 = {
    type: 'subtract',
    description: 'Compra',
    amount: req.body.total,
    date
  };
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    const purchase = new Purchase({
      description: req.body.description,
      ticketType: req.body.ticketType,
      ticketNumber: req.body.ticketNumber,
      total: req.body.total,
      subTotal: req.body.subTotal,
      ivaTotal: req.body.ivaTotal,
      details: req.body.details,
      creator: req.groupId,
      supplier: req.body.supplier,
      createdAt: date
    });
    let details = req.body.details;
    await details.map(async detail => {
      await increaseStock(detail.product, Number(detail.quantity), Number(detail.percentage), Number(detail.newPrice), Number(detail.iva), req.groupId);
    });
    const cashRegister = await Cash.findById(cashRegisterId);
    if (!cashRegister) {
      const error = new Error('Could not find any register');
      error.statusCode = 404;
      throw error;
    }
    console.log(data2.amount);
    amount = parseFloat((Number(data2.amount)).toFixed(2));
    cashRegister.balance -= amount;
    if (cashRegister.balance < 0) {
      const error = new Error('Cash avaiable is lower than the amount required');
      error.statusCode = 602;
      throw error;
    }
    cashRegister.movements.push(data2);
    await purchase.save();
    await cashRegister.save();
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

// exports.updatePurchase = async (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     const error = new Error('Validation failed, entered data is incorrect');
//     error.statusCode = 422;
//     throw error;
//   }
//   const purchaseId = req.params.purchaseId;
//   try {
//     const purchase = await Purchase.findById(purchaseId)
//       .populate('supplier', { name: 1, _id: 1 })
//       .populate('creator', { name: 1, _id: 1 });
//     if (!purchase) {
//       const error = new Error('Could not find any purchase');
//       error.statusCode = 404;
//       throw error;
//     }
//     if (purchase.creator._id.toString() !== req.groupId) {
//       const error = new Error('Not authorized');
//       error.statusCode = 403;
//       throw error;
//     }
//     purchase.description = req.body.description;
//     purchase.ticketType = req.body.ticketType;
//     purchase.ticketNumber = req.body.ticketNumber;
//     purchase.total = req.body.total;
//     purchase.details = req.body.details;
//     let details = req.body.details;
//     await details.map(async detail => {
//       await increaseStock(detail.product, Number(detail.quantity), Number(detail.newPrice), req.groupId);
//     });
//     await purchase.save();
//     res.status(200).json({
//       message: 'Purchase updated.',
//       purchase: purchase
//     });
//   } catch (err) {
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };

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
    purchase.status = 'activo';
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
    purchase.status = 'inactivo';
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

const increaseStock = async (productId, quantity, percentage, price, iva, creator) => {
  try {
    const product = await Product.findOne({ name: productId, creator: creator });
    if (!product) {
      const error = new Error('Could not find any product');
      error.statusCode = 404;
      throw error;
    }
    const newStock = parseInt(product.stock) + Number(quantity);
    product.stock = newStock;
    if (price !== 0) {
      product.price = price;
    }
    if (percentage !== 0) {
      product.percentage = percentage;
    }
    product.iva = iva;

    const difference = Number(req.body.sellingPrice) - Number(req.body.price);
    const calculatedPercentage = parseFloat((difference / Number(req.body.price)) * 100);
    product.sellingPrice = Number(calculatedPriceIva).toFixed(2);
    await product.save();
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }

};

const leapYear = (year) => {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
};
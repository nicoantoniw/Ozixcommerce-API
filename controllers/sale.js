const { validationResult } = require('express-validator');

const Sale = require('../models/sale');
const Product = require('../models/product');

exports.getSales = async (req, res, next) => {
  try {
    const totalSales = await Sale.find({
      creator: req.groupId
    }).countDocuments();
    const sales = await Sale.find({ creator: req.groupId })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

    if (totalSales === 0) {
      const error = new Error('No sales found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      sales: sales,
      totalSales: totalSales
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSalesByDate = async (req, res, next) => {
  let day = req.query.day;
  let month = req.query.month;
  let year = req.query.year;
  const seller = req.query.seller;
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
    const totalSales = await Sale.find({
      creator: req.groupId,
      createdAt: { '$gte': start, '$lt': end }
    }).countDocuments();
    if (seller !== '') {
      const sales = await Sale.find({ createdAt: { '$gte': start, '$lt': end }, seller: seller })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ createdAt: -1 });

      if (totalSales === 0) {
        const error = new Error('No sales found');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        sales: sales,
        totalSales: totalSales
      });
    } else {
      const sales = await Sale.find({ createdAt: { '$gte': start, '$lt': end } })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ createdAt: -1 });

      if (totalSales === 0) {
        const error = new Error('No sales found');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        sales: sales,
        totalSales: totalSales
      });
    }

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};


exports.getSale = async (req, res, next) => {
  const saleId = req.params.saleId;
  try {
    const sale = await Sale.findOne({
      _id: saleId,
      creator: req.groupId
    })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 });
    if (!sale) {
      const error = new Error('No sale found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      sale: sale
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.getSalesBySeller = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  try {
    const totalSales = await Sale.find({
      creator: req.groupId,
      seller: sellerId
    }).countDocuments();
    const sales = await Sale.find({ creator: req.groupId, seller: sellerId })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

    if (totalSales === 0) {
      const error = new Error('No sales found');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      sales: sales,
      totalSales: totalSales
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// exports.getSalesByCustomer = async (req, res, next) => {
//   const customerId = req.params.customerId;
//   try {
//     const totalSales = await Sale.find({
//       creator: req.groupId,
//       customer: customerId
//     }).countDocuments();
//     const sales = await Sale.find({ creator: req.groupId, customer: customerId })
//       .populate('seller', { name: 1, _id: 1 })
//       .populate('creator', { name: 1, _id: 1 })
//       .populate('customer', { name: 1, _id: 1 })
//       .sort({ createdAt: -1 });

//     if (totalSales === 0) {
//       const error = new Error('No sales found');
//       error.statusCode = 404;
//       throw error;
//     }

//     res.status(200).json({
//       sales: sales,
//       totalSales: totalSales
//     });
//   } catch (err) {
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };


exports.addSale = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    if (req.body.customer) {
      const sale = new Sale({
        ticketType: req.body.ticketType,
        ticketNumber: req.body.ticketNumber,
        details: req.body.details,
        total: req.body.total,
        creator: req.groupId,
        seller: req.body.seller,
        customer: req.body.customer
      });
      let details = req.body.details;
      await details.map(async detail => {
        await decreaseStock(detail.product, Number(detail.quantity), req.groupId);
      });
      await sale.save();
      res.status(200).json({
        message: 'Sale created.',
        sale: sale
      });
    } else if (!req.body.customer) {
      const sale = new Sale({
        ticketType: req.body.ticketType,
        ticketNumber: req.body.ticketNumber,
        details: req.body.details,
        total: req.body.total,
        creator: req.groupId,
        seller: req.body.seller
      });
      let details = req.body.details;
      await details.map(detail => {
        decreaseStock(detail.product, detail.quantity);
      });
      await sale.save();
      res.status(200).json({
        message: 'Sale created.',
        sale: sale
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateSale = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const saleId = req.params.saleId;
  try {
    const sale = await Sale.findById(saleId)
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 });
    if (!sale) {
      const error = new Error('Could not find any sale');
      error.statusCode = 404;
      throw error;
    }
    if (sale.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    const details = {
      product: req.body.product,
      quantity: req.body.quantity,
      price: req.body.price
    };
    sale.ticketType = req.body.ticketType;
    sale.ticketNumber = req.body.ticketNumber;
    sale.total = req.body.total;
    sale.aggregateDiscount = req.body.aggregateDiscount;
    sale.details = details;

    await sale.save();
    res.status(200).json({
      message: 'Sale updated.',
      sale: sale
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activateSale = async (req, res, next) => {
  const saleId = req.params.saleId;
  try {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      const error = new Error('Could not find any sale');
      error.statusCode = 404;
      throw error;
    }
    if (sale.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    sale.status = 'activo';
    await sale.save();
    res.status(200).json({
      message: 'Sale has been activated',
      sale: sale
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivateSale = async (req, res, next) => {
  const saleId = req.params.saleId;
  try {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      const error = new Error('Could not find any sale');
      error.statusCode = 404;
      throw error;
    }
    if (sale.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    sale.status = 'inactivo';
    await sale.save();
    res.status(200).json({
      message: 'Sale has been deactivated',
      sale: sale
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteSale = async (req, res, next) => {
  const saleId = req.params.saleId;
  try {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      const error = new Error('Could not find any sale');
      error.statusCode = 404;
      throw error;
    }
    if (sale.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await Sale.findByIdAndRemove(saleId);
    res.status(200).json({
      message: 'Sale deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const decreaseStock = async (productId, quantity, creator) => {
  const product = await Product.findOne({ name: productId, creator: creator });
  if (!product) {
    const error = new Error('Could not find any product');
    error.statusCode = 404;
    throw error;
  }
  const newStock = parseInt(product.stock) - Number(quantity);
  product.stock = newStock;
  await product.save();
};

const leapYear = (year) => {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
};

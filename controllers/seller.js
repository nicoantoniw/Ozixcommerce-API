const { validationResult } = require('express-validator');

const Seller = require('../models/seller');
const Invoice = require('../models/invoice');
const Quote = require('../models/quote');

exports.getSellers = async (req, res, next) => {
  try {
    const totalSellers = await Seller.find({
      creator: req.groupId
    }).countDocuments();
    const sellers = await Seller.find({
      creator: req.groupId
    })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

    if (totalSellers === 0) {
      const error = new Error('No sellers found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      sellers: sellers,
      totalSellers: totalSellers
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSeller = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  try {
    const seller = await Seller.findOne({
      _id: sellerId,
      creator: req.groupId
    }).populate('creator', { name: 1, _id: 1 });
    if (!seller) {
      const error = new Error('No seller found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      seller: seller
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addSeller = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const seller = new Seller({
    name: req.body.name,
    notes: req.body.notes,
    phone: req.body.phone,
    mobile: req.body.mobile,
    email: req.body.email,
    businessID: req.body.businessID,
    gender: req.body.gender,
    birth: req.body.birth,
    hireDate: req.body.hireDate,
    releaseDate: req.body.releaseDate,
    salary: req.body.salary,
    address: req.body.address,
    creator: req.groupId
  });
  try {
    await seller.save();
    res.status(200).json({
      message: 'Seller created.',
      seller: seller
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateSeller = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const sellerId = req.params.sellerId;
  try {
    const seller = await Seller.findById(sellerId).populate('creator', {
      name: 1,
      _id: 1
    });
    if (!seller) {
      const error = new Error('Could not find any seller');
      error.statusCode = 404;
      throw error;
    }
    if (seller.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    seller.name = req.body.name;
    seller.notes = req.body.notes;
    seller.phone = req.body.phone;
    seller.mobile = req.body.mobile;
    seller.email = req.body.email;
    seller.businessID = req.body.businessID;
    seller.gender = req.body.gender;
    seller.birth = req.body.birth;
    seller.hireDate = req.body.hireDate;
    seller.releaseDate = req.body.releaseDate;
    seller.salary = req.body.salary;
    seller.address = req.body.address;

    await seller.save();
    res.status(200).json({
      message: 'Seller updated.',
      seller: seller
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activateSeller = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  try {
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      const error = new Error('Could not find any seller');
      error.statusCode = 404;
      throw error;
    }
    if (seller.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    seller.status = 'activo';
    await seller.save();
    res.status(200).json({
      message: 'Seller has been activated',
      seller: seller
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivateSeller = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  try {
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      const error = new Error('Could not find any seller');
      error.statusCode = 404;
      throw error;
    }
    if (seller.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    seller.status = 'inactivo';
    await seller.save();
    res.status(200).json({
      message: 'Seller has been deactivated',
      seller: seller
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteSeller = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  try {
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      const error = new Error('Could not find any seller');
      error.statusCode = 404;
      throw error;
    }
    if (seller.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await seller.remove();
    res.status(200).json({
      message: 'Seller deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteSellers = async (req, res, next) => {
  const sellers = req.body.sellers;
  try {
    for (let index = 0; index < sellers.length; index++) {
      const element = sellers[index];
      const seller = await Seller.findById(element._id);
      await seller.remove();
    }
    res.status(200).json({
      message: 'Sellers deleted.',
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSellerTransactions = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  try {
    const invoices = await Invoice.find({ creator: req.groupId, seller: sellerId })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, email: 1, _id: 1 })
      .sort({ number: -1 });
    const quotes = await Quote.find({ creator: req.groupId, seller: sellerId })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 })
      .sort({ number: -1 });
    if (invoices.length < 1 && quotes.length < 1) {
      const error = new Error('No transactions found');
      error.statusCode = 404;
      throw error;
    }
    const transactions = invoices.concat(quotes);
    res.status(200).json({
      transactions
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addDebt = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const sellerId = req.params.sellerId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const type = req.body.type;
  const data = {
    debt: debt,
    description: description,
    typeDebt: type
  };
  try {
    const seller = await Seller.findById(sellerId);
    if (seller.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    seller.account.push(data);
    seller.totalDebt += data.debt;
    await seller.save();
    res.status(200).json({
      message: 'Debt created.',
      data: data
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.subtractDebt = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const sellerId = req.params.sellerId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const type = req.body.type;
  const data = {
    debt: debt,
    description: description,
    typeDebt: type
  };
  try {
    const seller = await Seller.findById(sellerId);
    if (seller.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    seller.account.push(data);
    seller.totalDebt -= data.debt;
    await seller.save();
    res.status(200).json({
      message: 'Debt created.',
      data: data
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const getAge = date => {
  const today = new Date();
  const birth = new Date(date);
  const age = today.getFullYear() - birth.getFullYear();
  return age;
};

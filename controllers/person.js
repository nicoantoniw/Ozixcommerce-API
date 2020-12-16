const { validationResult } = require('express-validator');
const moment = require('moment');

const Person = require('../models/person');
const Invoice = require('../models/invoice');
const Purchase = require('../models/purchase');
const Quote = require('../models/quote');

exports.getCustomers = async (req, res, next) => {
  try {
    const totalCustomers = await Person.find({ creator: req.groupId, type: 'customer' }).countDocuments();
    const customers = await Person.find({
      creator: req.groupId,
      type: 'customer'
    })
      .populate('creator', {
        name: 1,
        _id: 1
      })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

    if (totalCustomers === 0) {
      const error = new Error('No customers found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      customers: customers,
      totalCustomers: totalCustomers
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSuppliers = async (req, res, next) => {
  try {
    const totalSuppliers = await Person.find({
      creator: req.groupId,
      type: 'supplier'
    }).countDocuments();
    const suppliers = await Person.find({ creator: req.groupId, type: 'supplier' })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

    if (totalSuppliers === 0) {
      const error = new Error('No suppliers found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      suppliers: suppliers,
      totalSuppliers: totalSuppliers
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPerson = async (req, res, next) => {
  const personId = req.params.personId;
  try {
    const person = await Person.findById(personId).populate('creator', {
      name: 1,
      _id: 1
    });
    if (!person) {
      const error = new Error('No person found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getCustomerTransactions = async (req, res, next) => {
  const customerId = req.params.personId;
  try {
    const invoices = await Invoice.find({ creator: req.groupId, customer: customerId })
      .populate('person', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, email: 1, _id: 1 })
      .sort({ number: -1 });
    const quotes = await Quote.find({ creator: req.groupId, customer: customerId })
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

exports.getSupplierTransactions = async (req, res, next) => {
  const supplierId = req.params.personId;
  try {
    const purchases = await Purchase.find({ creator: req.groupId, supplier: supplierId })
      .populate('person', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('supplier', { name: 1, email: 1, _id: 1 })
      .sort({ number: -1 });
    if (purchases.length < 1) {
      const error = new Error('No transactions found');
      error.statusCode = 404;
      throw error;
    }
    const transactions = purchases;
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

exports.addPerson = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const person = new Person({
    name: req.body.name,
    notes: req.body.notes,
    type: req.body.type,
    company: req.body.company,
    phone: req.body.phone,
    mobile: req.body.mobile,
    fax: req.body.fax,
    email: req.body.email,
    website: req.body.website,
    other: req.body.other,
    billingAddress: req.body.billingAddress,
    shippingAddress: req.body.shippingAddress,
    creator: req.groupId
  });
  try {
    await person.save();
    res.status(200).json({
      message: 'Person created.',
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePerson = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const personId = req.params.personId;
  try {
    const person = await Person.findById(personId).populate('creator');
    if (!person) {
      const error = new Error('Could not find any person');
      error.statusCode = 404;
      throw error;
    }
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }

    person.name = req.body.name;
    person.notes = req.body.notes;
    person.type = req.body.type;
    person.company = req.body.company;
    person.phone = req.body.phone;
    person.mobile = req.body.mobile;
    person.fax = req.body.fax;
    person.email = req.body.email;
    person.website = req.body.website;
    person.other = req.body.other;
    person.billingAddress = req.body.billingAddress;
    person.shippingAddress = req.body.shippingAddress;
    person.account = req.body.account;
    person.totalDebt = req.body.totalDebt;
    if (person.totalDebt > 0) {
      person.owes = person.totalDebt;
    } else if (person.totalDebt < 0) {
      person.youOwe = person.totalDebt * -1;
    }
    person.creator = req.groupId;
    await person.save();
    res.status(200).json({
      message: 'Person updated.',
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePerson = async (req, res, next) => {
  const personId = req.params.personId;
  try {
    const person = await Person.findById(personId);
    if (!person) {
      const error = new Error('Could not find any person');
      error.statusCode = 404;
      throw error;
    }
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await person.remove();
    res.status(200).json({
      message: 'Person deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePersons = async (req, res, next) => {
  const persons = req.body.persons;
  try {
    for (let index = 0; index < persons.length; index++) {
      const element = persons[index];
      const person = await Person.findById(element._id);
      await person.remove();
    }
    res.status(200).json({
      message: 'Persons deleted.',
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
  const personId = req.body.personId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const typeDebt = req.body.type;
  const data = {
    debt,
    description,
    typeDebt
  };
  try {
    const person = await Person.findById(personId);
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    person.account.push(data);
    person.totalDebt += data.debt;
    await person.save();
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

  const personId = req.body.personId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const typeDebt = req.body.type;
  const data = {
    debt,
    description,
    typeDebt
  };
  try {
    const person = await Person.findById(personId);
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    person.account.push(data);
    person.totalDebt -= data.debt;
    await person.save();
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
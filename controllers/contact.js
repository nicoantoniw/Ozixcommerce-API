const { validationResult } = require('express-validator');
const moment = require('moment');

const Contact = require('../models/contact');
const Payment = require('../models/payment');
const Invoice = require('../models/invoice');
const Quote = require('../models/quote');
const Bill = require('../models/bill');
const Expense = require('../models/expense');
const Purchase = require('../models/purchase');

exports.getContacts = async (req, res, next) => {
  try {
    const totalContacts = await Contact.find({ creator: req.groupId, }).countDocuments();
    const contacts = await Contact.find({
      creator: req.groupId,
    })
      .populate('creator', {
        name: 1,
        _id: 1
      })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);
    if (totalContacts === 0) {
      const error = new Error('No contacts found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      contacts,
      totalContacts
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getCustomers = async (req, res, next) => {
  try {
    const totalCustomers = await Contact.find({ creator: req.groupId, $or: [{ type: 'Customer' }, { type: 'All' }] }).countDocuments();
    const customers = await Contact.find({
      creator: req.groupId, $or: [{ type: 'Customer' }, { type: 'All' }]
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
    const totalSuppliers = await Contact.find({
      creator: req.groupId, $or: [{ type: 'Supplier' }, { type: 'All' }]
    }).countDocuments();
    const suppliers = await Contact.find({ creator: req.groupId, $or: [{ type: 'Supplier' }, { type: 'All' }] })
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

exports.getContact = async (req, res, next) => {
  const contactId = req.params.contactId;
  try {
    const contact = await Contact.findById(contactId).populate('creator', {
      name: 1,
      _id: 1
    });
    if (!contact) {
      const error = new Error('No contact found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      contact: contact
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getContactTransactions = async (req, res, next) => {
  const contactId = req.params.contactId;
  let transactions = [];
  try {
    //customer
    if (req.query.type === 'Customer' || req.query.type === 'All') {
      const invoices = await Invoice.find({ creator: req.groupId, customer: contactId })
        .populate('seller', { name: 1, email: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
      const quotes = await Quote.find({ creator: req.groupId, customer: contactId })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
      transactions = invoices.concat(quotes);
    }

    //supplier
    if (req.query.type === 'Supplier' || req.query.type === 'All') {
      const purchases = await Purchase.find({ creator: req.groupId, supplier: contactId })
        .populate('creator', { name: 1, _id: 1 })
        .populate('supplier', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
      const bills = await Bill.find({ creator: req.groupId, supplier: contactId })
        .populate('creator', { name: 1, _id: 1 })
        .populate('supplier', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
      const expenses = await Expense.find({ creator: req.groupId, supplier: contactId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
      transactions = transactions.concat(purchases);
      transactions = transactions.concat(bills);
      transactions = transactions.concat(expenses);
    }

    const payments = await Payment.find({ creator: req.groupId, contact: contactId })
      .populate('contact', { name: 1, email: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ number: -1 });
    if (payments.length > 0) {
      transactions = transactions.concat(payments);
    }

    if (transactions.length < 1) {
      const error = new Error('No transactions found');
      error.statusCode = 404;
      throw error;
    }

    transactions.sort((a, b) =>
      a.createdAt > b.createdAt ? -1 : 1
    );
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

exports.addContact = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const contact = new Contact({
    name: req.body.name,
    personName: req.body.personName,
    personLastName: req.body.personLastName,
    notes: req.body.notes,
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
    await contact.save();
    res.status(200).json({
      message: 'Contact created.',
      contact: contact
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateContact = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const contactId = req.params.contactId;
  try {
    const contact = await Contact.findById(contactId).populate('creator');
    if (!contact) {
      const error = new Error('Could not find any contact');
      error.statusCode = 404;
      throw error;
    }
    if (contact.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }

    contact.name = req.body.name;
    contact.personName = req.body.personName;
    contact.personLastName = req.body.personLastName;
    contact.notes = req.body.notes;
    contact.phone = req.body.phone;
    contact.mobile = req.body.mobile;
    contact.fax = req.body.fax;
    contact.email = req.body.email;
    contact.website = req.body.website;
    contact.other = req.body.other;
    contact.billingAddress = req.body.billingAddress;
    contact.shippingAddress = req.body.shippingAddress;
    contact.account = req.body.account;
    contact.totalDebt = req.body.totalDebt;
    if (contact.totalDebt > 0) {
      contact.owes = contact.totalDebt;
    } else if (contact.totalDebt < 0) {
      contact.youOwe = contact.totalDebt * -1;
    }
    contact.creator = req.groupId;
    await contact.save();
    res.status(200).json({
      message: 'Contact updated.',
      contact: contact
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteContact = async (req, res, next) => {
  const contactId = req.params.contactId;
  try {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      const error = new Error('Could not find any contact');
      error.statusCode = 404;
      throw error;
    }
    if (contact.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await contact.remove();
    res.status(200).json({
      message: 'Contact deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteContacts = async (req, res, next) => {
  const contacts = req.body.contacts;
  try {
    for (let index = 0; index < contacts.length; index++) {
      const element = contacts[index];
      const contact = await Contact.findById(element._id);
      await contact.remove();
    }
    res.status(200).json({
      message: 'Contacts deleted.',
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
  const contactId = req.body.contactId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const typeDebt = req.body.type;
  const data = {
    debt,
    description,
    typeDebt
  };
  try {
    const contact = await Contact.findById(contactId);
    if (contact.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    contact.account.push(data);
    contact.totalDebt += data.debt;
    await contact.save();
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

  const contactId = req.body.contactId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const typeDebt = req.body.type;
  const data = {
    debt,
    description,
    typeDebt
  };
  try {
    const contact = await Contact.findById(contactId);
    if (contact.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    contact.account.push(data);
    contact.totalDebt -= data.debt;
    await contact.save();
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
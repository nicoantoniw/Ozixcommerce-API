const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const { validationResult, body } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const Invoice = require('../models/invoice');
const Product = require('../models/product');
const Contact = require('../models/contact');
const Group = require('../models/group');
const Account = require('../models/account');
const Notification = require('../models/notification');

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'AKIAJFUT6AOGGD44UV7Q',
  secretAccessKey: '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'
});

exports.getInvoices = async (req, res, next) => {
  try {
    const totalInvoices = await Invoice.find({
      creator: req.groupId
    }).countDocuments();
    const invoices = await Invoice.find({ creator: req.groupId })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, email: 1, _id: 1 })
      .sort({ number: -1 });

    if (totalInvoices === 0) {
      const error = new Error('No invoices found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      invoices,
      totalInvoices,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getInvoicesByFilter = async (req, res, next) => {
  let invoices;
  let dateFrom = req.query.dateFrom;
  let dateTo = req.query.dateTo;
  let seller = req.query.seller;
  let customer = req.query.customer;
  let status = req.query.status;
  if (!seller) {
    seller = '';
  } if (!customer) {
    customer = '';
  } if (!status) {
    status = '';
  } if (!dateFrom | !dateTo) {
    dateTo = null;
    dateFrom = null;
  }
  if (req.query.dateFrom) {
    dateFrom = moment.utc(req.query.dateFrom).toISOString();
  } if (req.query.dateTo) {
    dateTo = moment.utc(req.query.dateTo).toISOString();
  }
  try {
    if (dateFrom === null && dateTo === null && customer === '' && status === '' && seller != '') {
      invoices = await Invoice.find({ seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller === '' && status === '' && customer != '') {
      invoices = await Invoice.find({ customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller === '' && customer === '' && status != '') {
      invoices = await Invoice.find({ status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (seller === '' && customer === '' && status === '' && dateFrom != null && dateTo != null) {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (customer === '' && status === '' && dateFrom != null && dateTo != null && seller != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (seller === '' && status === '' && dateFrom != null && dateTo != null && customer != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (seller === '' && customer === '' && dateFrom != null && dateTo != null && status != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && status === '' && seller != '' && customer != '') {
      invoices = await Invoice.find({ seller: seller, customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && customer === '' && seller != '' && status != '') {
      invoices = await Invoice.find({ seller: seller, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller === '' && customer != '' && status != '') {
      invoices = await Invoice.find({ customer: customer, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller != '' && customer != '' && status != '') {
      invoices = await Invoice.find({ customer: customer, status: status, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom !== null && dateTo !== null && seller != '' && customer != '' && status === '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom !== null && dateTo !== null && seller != '' && customer === '' && status != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom !== null && dateTo !== null && seller === '' && customer != '' && status != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom != null && dateTo != null && customer != '' && status != '' && seller != '') {
      invoices = await Invoice.find({ seller: seller, createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    } else {
      invoices = await Invoice.find({ creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, email: 1, _id: 1 })
        .sort({ number: -1 });
    }
    if (invoices.length < 1) {
      const error = new Error('No invoices found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      invoices
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getInvoice = async (req, res, next) => {
  const invoiceId = req.params.invoiceId;
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1, email: 1 });
    if (!invoice) {
      const error = new Error('No invoice found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      invoice
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addInvoice = async (req, res, next) => {
  let amount;
  let result;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    const invoice = new Invoice({
      number: req.body.invoice.number,
      details: req.body.invoice.details,
      total: Number(req.body.invoice.total),
      due: Number(req.body.invoice.total),
      subtotal: req.body.invoice.subtotal,
      taxes: req.body.invoice.taxes,
      discounts: Number(req.body.invoice.discounts),
      creator: req.groupId,
      seller: req.body.invoice.seller,
      customer: req.body.invoice.customer,
      dueDate: moment.utc(req.body.invoice.dueDate),
      createdAt: moment.utc(req.body.invoice.createdAt)
    });

    const contact = await Contact.findById(req.body.invoice.customer);
    if (contact.type === 'None') {
      contact.type = 'Customer';
      await contact.save();
    } else if (contact.type === 'Supplier') {
      contact.type = 'All';
      await contact.save();
    }

    if (req.body.fromQuote) {
      const invoices = await Invoice.find({ creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
      const invoice2 = invoices[0];
      invoice.number = Number(invoice2.number) + 1;
    }

    // accounts receivable
    let account = await Account.findOne({ code: 1100 });
    if (!account) {
      const error = new Error('Could not find any account');
      error.statusCode = 404;
      throw error;
    }
    account.balance += invoice.total;
    account.movements.push({
      transactionRef: 'Invoice',
      transaction: invoice._id,
      date: invoice.createdAt,
      description: `Invoice # ${invoice.number}`,
      amount: invoice.total
    });
    await account.save();

    // sales tax account
    account = await Account.findOne({ code: 1400 });
    if (!account) {
      const error = new Error('Could not find any account');
      error.statusCode = 404;
      throw error;
    }
    account.balance += invoice.taxes;
    account.movements.push({
      transactionRef: 'Invoice',
      transaction: invoice._id,
      date: invoice.createdAt,
      description: `Invoice # ${invoice.number}`,
      amount: invoice.taxes
    });
    await account.save();

    for (let i = 0; i < invoice.details.length; i++) {
      const detail = invoice.details[i];
      if (detail.product.trackItem) {
        result = await decreaseStock(detail.product, Number(detail.quantity), detail.location);
      }
      if (result) {
        const notification = new Notification({
          description: `Product '${detail.product.name}' ran out of stock in location '${result}'`,
          importance: 'moderate',
          creator: req.groupId
        });
        await notification.save();
      }
      // product sales account
      account = await Account.findById(detail.product.salesAccount);
      if (!account) {
        const error = new Error('Could not find any account');
        error.statusCode = 404;
        throw error;
      }
      account.balance += detail.price;
      account.movements.push({
        transactionRef: 'Invoice',
        transaction: invoice._id,
        date: invoice.createdAt,
        description: `Invoice # ${invoice.number}`,
        amount: detail.price
      });
      await account.save();

      // product cost of goods account
      if (detail.product.trackItem) {
        account = await Account.findById(detail.product.costOfGoodsAccount);
        if (!account) {
          const error = new Error('Could not find any account');
          error.statusCode = 404;
          throw error;
        }
        account.balance += detail.product.price * detail.quantity;
        account.movements.push({
          transactionRef: 'Invoice',
          transaction: invoice._id,
          date: invoice.createdAt,
          description: `Invoice # ${invoice.number}`,
          amount: detail.product.price * detail.quantity
        });
        await account.save();
      }
    }
    await invoice.save();
    res.status(200).json({
      message: 'invoice created.',
      invoice
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activateInvoice = async (req, res, next) => {
  const invoiceId = req.params.invoiceId;
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      const error = new Error('Could not find any invoice');
      error.statusCode = 404;
      throw error;
    }
    if (invoice.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    invoice.status = 'activo';
    await invoice.save();
    res.status(200).json({
      message: 'invoice has been activated',
      invoice
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  const invoiceId = req.params.invoiceId;
  let index1;
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      const error = new Error('Could not find any invoice');
      error.statusCode = 404;
      throw error;
    }
    if (invoice.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }

    if (invoice.paid > 0) {
      const error = new Error('This invoice cannot be deleted');
      error.statusCode = 101;
      throw error;
    }

    // accounts receivable
    let account = await Account.findOne({ code: 1100 });
    if (!account) {
      const error = new Error('Could not find any account');
      error.statusCode = 404;
      throw error;
    }
    account.balance -= invoice.total;
    let index = account.movements.findIndex(movement => movement.transaction == invoice._id.toString());
    account.movements.splice(index, 1);
    await account.save();

    for (let i = 0; i < invoice.details.length; i++) {
      const detail = invoice.details[i];
      if (detail.product.trackItem) {
        await increaseStock(detail.product, Number(detail.quantity), detail.location);
      }

      // product sales account
      account = await Account.findById(detail.product.salesAccount);
      if (!account) {
        const error = new Error('Could not find any account');
        error.statusCode = 404;
        throw error;
      }
      account.balance -= detail.price;
      account.movements.push({
        transactionRef: 'Invoice',
        transaction: invoice._id,
        date: invoice.createdAt,
        description: `Invoice # ${invoice.number}`,
        amount: detail.price
      });
      await account.save();

      if (detail.product.trackItem) {
        // product cost of goods account
        account = await Account.findById(detail.product.costOfGoodsAccount);
        if (!account) {
          const error = new Error('Could not find any account');
          error.statusCode = 404;
          throw error;
        }
        account.balance -= detail.product.price * detail.quantity;
        account.movements.push({
          transactionRef: 'Invoice',
          date: invoice.createdAt,
          transaction: invoice._id,
          description: `Invoice # ${invoice.number}`,
          amount: detail.product.price * detail.quantity
        });
        await account.save();
      }
    }

    await invoice.remove();
    const totalInvoices = await Invoice.find().countDocuments();
    res.status(200).json({
      message: 'invoice deleted',
      totalInvoices
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const decreaseStock = async (product, quantity, location) => {
  let productId = product._id;
  let notification;
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
          for (let y = 0; y < variant.locations.length; y++) {
            const location2 = variant.locations[y];
            if (location == location2.location.toString()) {
              location2.quantity -= quantity;
              variant.stock -= quantity;
              if (location2.quantity === 0) {
                notification = location2.name;
              }
            }
          }
        }
      }
    } else {
      for (let i = 0; i < product2.locations.length; i++) {
        const location2 = product2.locations[i];
        if (location == location2.location.toString()) {
          location2.quantity -= quantity;
          product2.stock -= quantity;
          if (location2.quantity === 0) {
            notification = location2.name;
          }
        }
      }
    }
    await product2.save();
    return notification;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
};

const increaseStock = async (product, quantity, location) => {
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
          for (let y = 0; y < variant.locations.length; y++) {
            const location2 = variant.locations[y];
            if (location == location2.location.toString()) {
              location2.quantity += quantity;
              variant.stock += quantity;
            }
          }
        }
      }
    } else {
      for (let i = 0; i < product2.locations.length; i++) {
        const location2 = product2.locations[i];
        if (location == location2.location.toString()) {
          location2.quantity += quantity;
          product2.stock += quantity;
        }
      }
    }
    await product2.save();
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
  }
};

exports.createPDF = async (req, res, next) => {
  const invoice = req.body.invoice;
  const groupId = req.groupId;
  const subject = req.body.subject;
  const sender = 'nicolasantoniw@gmail.com';
  const receiver = req.body.receiver;
  const html = req.body.html;
  const sendPdf = req.body.sendPdf;
  const deletePdf = req.query.delete;
  const invoiceName = `INVOICE-${invoice.number}.pdf`;
  if (Number.isInteger(invoice.taxes)) {
    invoice.taxes = invoice.taxes.toFixed(2);
  }
  if (Number.isInteger(invoice.subtotal)) {
    invoice.subtotal = invoice.subtotal.toFixed(2);
  }
  if (Number.isInteger(invoice.total)) {
    invoice.total = invoice.total.toFixed(2);
  }
  if (invoice.total[0] === "$") {
    invoice.total = req.body.invoice.total.substring(1);
  }
  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    },
  };
  if (sendPdf) {
    sendInvoice(subject, sender, receiver, invoiceName, html);
    if (invoice.sent == 'No') {
      const invoice2 = await Invoice.findById(invoice._id);
      invoice2.sent = 'Yes';
      await invoice2.save();
    }
    return res.status(200).json({
      message: 'pdf sent'
    });

  } else {
    const printer = new PdfMake(fonts);
    let docDefinition;
    const group = await Group.findById(groupId);
    if (group.hasLogo) {
      //here convert image
      let base64Str = '';
      const s3 = new AWS.S3();
      const params = {
        Bucket: 'ozixcommerce.com-images',
        Key: group.logo.key
      };

      s3.getObject(
        params, function (error, data) {
          if (error != null) {
            console.log(error);
          } else {
            base64Str = data.Body.toString('base64');
          }
        }
      );
      setTimeout(() => {
        docDefinition = {
          content: [
            {
              columns: [
                {
                  image:
                    `data:image/png;base64,${base64Str}`,
                  width: 150,
                },
                [
                  {
                    text: 'Invoice',
                    color: '#333333',
                    width: '*',
                    fontSize: 28,
                    bold: true,
                    alignment: 'right',
                    margin: [0, 0, 0, 15],
                  },
                  {
                    stack: [
                      {
                        columns: [
                          {
                            text: 'Invoice No.',
                            color: '#aaaaab',
                            bold: true,
                            width: '*',
                            fontSize: 12,
                            alignment: 'right',
                            margin: [0, 0, 0, 5],
                          },
                          {
                            text: `${invoice.number}`,
                            bold: true,
                            color: '#333333',
                            fontSize: 12,
                            alignment: 'right',
                            width: 120,
                            margin: [0, 0, 0, 5],
                          },
                        ],
                      },
                      {
                        columns: [
                          {
                            text: 'Date Issued',
                            color: '#aaaaab',
                            bold: true,
                            width: '*',
                            fontSize: 12,
                            alignment: 'right',
                            margin: [0, 0, 0, 5],
                          },
                          {
                            text: `${invoice.createdAt}`,
                            bold: true,
                            color: '#333333',
                            fontSize: 12,
                            alignment: 'right',
                            width: 120,
                            margin: [0, 0, 0, 5],
                          },
                        ],
                      },
                      {
                        columns: [
                          {
                            text: 'Due Date',
                            color: '#aaaaab',
                            bold: true,
                            fontSize: 12,
                            alignment: 'right',
                            width: '*',
                            margin: [0, 0, 0, 5],
                          },
                          {
                            text: `${invoice.dueDate}`,
                            bold: true,
                            fontSize: 12,
                            alignment: 'right',
                            color: '#333333',
                            width: 120,
                            margin: [0, 0, 0, 5],
                          },
                        ],
                      },
                    ],
                  },
                ],
              ],
              margin: [0, 0, 0, 50]
            },
            table(invoice.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
            '\n',
            '\n\n',
            {
              layout: {
                defaultBorder: false,
                hLineWidth: function (i, node) {
                  return 1;
                },
                vLineWidth: function (i, node) {
                  return 1;
                },
                hLineColor: function (i, node) {
                  return '#eaeaea';
                },
                vLineColor: function (i, node) {
                  return '#eaeaea';
                },
                hLineStyle: function (i, node) {
                  // if (i === 0 || i === node.table.body.length) {
                  return null;
                  //}
                },
                // vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
                paddingLeft: function (i, node) {
                  return 10;
                },
                paddingRight: function (i, node) {
                  return 10;
                },
                paddingTop: function (i, node) {
                  return 3;
                },
                paddingBottom: function (i, node) {
                  return 3;
                },
                fillColor: function (rowIndex, node, columnIndex) {
                  return '#fff';
                },
              },
              table: {
                headerRows: 1,
                widths: ['*', 'auto'],
                body: [
                  [
                    {
                      text: 'Subtotal',
                      border: [false, true, false, true],
                      alignment: 'right',
                      margin: [0, 5, 0, 5],
                    },
                    {
                      border: [false, true, false, true],
                      text: `$${invoice.subtotal}`,
                      alignment: 'right',
                      fillColor: '#f5f5f5',
                      margin: [0, 5, 0, 5],
                    },
                  ],
                  [
                    {
                      text: 'Taxes',
                      border: [false, false, false, true],
                      alignment: 'right',
                      margin: [0, 5, 0, 5],
                    },
                    {
                      text: `$${invoice.taxes}`,
                      border: [false, false, false, true],
                      fillColor: '#f5f5f5',
                      alignment: 'right',
                      margin: [0, 5, 0, 5],
                    },
                  ],
                  [
                    {
                      text: 'Total',
                      bold: true,
                      fontSize: 20,
                      alignment: 'right',
                      border: [false, false, false, true],
                      margin: [0, 5, 0, 5],
                    },
                    {
                      text: `$${invoice.total}`,
                      bold: true,
                      fontSize: 20,
                      alignment: 'right',
                      border: [false, false, false, true],
                      fillColor: '#f5f5f5',
                      margin: [0, 5, 0, 5],
                    },
                  ],
                ],
              },
            },

          ],
          styles: {
            notesTitle: {
              fontSize: 10,
              bold: true,
              margin: [0, 50, 0, 3],
            },
            notesText: {
              fontSize: 10,
            },
          },
          defaultStyle: {
            columnGap: 20,
            font: 'Helvetica',
          },

        };
        let pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(`Content-Disposition`, `inline; filename= ${invoiceName}`);
        if (!deletePdf) {
          pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'invoice.pdf')));
        }
        pdfDoc.pipe(res);
        pdfDoc.end();
      }, 5000);
    }
    else {

      docDefinition = {
        content: [
          {
            columns: [

              [
                {
                  text: 'Invoice',
                  color: '#333333',
                  width: '*',
                  fontSize: 28,
                  bold: true,
                  alignment: 'right',
                  margin: [0, 0, 0, 15],
                },
                {
                  stack: [
                    {
                      columns: [
                        {
                          text: 'Invoice No.',
                          color: '#aaaaab',
                          bold: true,
                          width: '*',
                          fontSize: 12,
                          alignment: 'right',
                          margin: [0, 0, 0, 5],
                        },
                        {
                          text: `${invoice.number}`,
                          bold: true,
                          color: '#333333',
                          fontSize: 12,
                          alignment: 'right',
                          width: 120,
                          margin: [0, 0, 0, 5],
                        },
                      ],
                    },
                    {
                      columns: [
                        {
                          text: 'Date Issued',
                          color: '#aaaaab',
                          bold: true,
                          width: '*',
                          fontSize: 12,
                          alignment: 'right',
                          margin: [0, 0, 0, 5],
                        },
                        {
                          text: `${invoice.createdAt}`,
                          bold: true,
                          color: '#333333',
                          fontSize: 12,
                          alignment: 'right',
                          width: 120,
                          margin: [0, 0, 0, 5],
                        },
                      ],
                    },
                    {
                      columns: [
                        {
                          text: 'Due Date',
                          color: '#aaaaab',
                          bold: true,
                          fontSize: 12,
                          alignment: 'right',
                          width: '*',
                          margin: [0, 0, 0, 5],
                        },
                        {
                          text: `${invoice.dueDate}`,
                          bold: true,
                          fontSize: 12,
                          alignment: 'right',
                          color: '#333333',
                          width: 120,
                          margin: [0, 0, 0, 5],
                        },
                      ],
                    },
                  ],
                },
              ],
            ],
            margin: [0, 0, 0, 50]
          },
          table(invoice.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
          '\n',
          '\n\n',
          {
            layout: {
              defaultBorder: false,
              hLineWidth: function (i, node) {
                return 1;
              },
              vLineWidth: function (i, node) {
                return 1;
              },
              hLineColor: function (i, node) {
                return '#eaeaea';
              },
              vLineColor: function (i, node) {
                return '#eaeaea';
              },
              hLineStyle: function (i, node) {
                // if (i === 0 || i === node.table.body.length) {
                return null;
                //}
              },
              // vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
              paddingLeft: function (i, node) {
                return 10;
              },
              paddingRight: function (i, node) {
                return 10;
              },
              paddingTop: function (i, node) {
                return 3;
              },
              paddingBottom: function (i, node) {
                return 3;
              },
              fillColor: function (rowIndex, node, columnIndex) {
                return '#fff';
              },
            },
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: [
                [
                  {
                    text: 'Subtotal',
                    border: [false, true, false, true],
                    alignment: 'right',
                    margin: [0, 5, 0, 5],
                  },
                  {
                    border: [false, true, false, true],
                    text: `$${invoice.subtotal}`,
                    alignment: 'right',
                    fillColor: '#f5f5f5',
                    margin: [0, 5, 0, 5],
                  },
                ],
                [
                  {
                    text: 'Taxes',
                    border: [false, false, false, true],
                    alignment: 'right',
                    margin: [0, 5, 0, 5],
                  },
                  {
                    text: `$${invoice.taxes}`,
                    border: [false, false, false, true],
                    fillColor: '#f5f5f5',
                    alignment: 'right',
                    margin: [0, 5, 0, 5],
                  },
                ],
                [
                  {
                    text: 'Total',
                    bold: true,
                    fontSize: 20,
                    alignment: 'right',
                    border: [false, false, false, true],
                    margin: [0, 5, 0, 5],
                  },
                  {
                    text: `$${invoice.total}`,
                    bold: true,
                    fontSize: 20,
                    alignment: 'right',
                    border: [false, false, false, true],
                    fillColor: '#f5f5f5',
                    margin: [0, 5, 0, 5],
                  },
                ],
              ],
            },
          },

        ],
        styles: {
          notesTitle: {
            fontSize: 10,
            bold: true,
            margin: [0, 50, 0, 3],
          },
          notesText: {
            fontSize: 10,
          },
        },
        defaultStyle: {
          columnGap: 20,
          font: 'Helvetica',
        },

      };
      let pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(`Content-Disposition`, `inline; filename= ${invoiceName}`);
      if (!deletePdf) {
        pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'invoice.pdf')));
      }
      pdfDoc.pipe(res);
      pdfDoc.end();
    }
  }
};

const sendInvoice = (subject, sender, receiver, filename, html) => {
  const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/invoice.pdf`);
  let ses_mail = "From: <" + sender + ">\n";
  ses_mail += "To: " + receiver + "\n";
  ses_mail += "Subject: " + subject + "\n";
  ses_mail += "MIME-Version: 1.0\n";
  ses_mail += "Content-Type: multipart/mixed; boundary=\"NextPart\"\n\n";
  ses_mail += "--NextPart\n";
  ses_mail += "Content-Type: text/html\n\n";
  ses_mail += `${html}\n\n`;
  ses_mail += "--NextPart\n";
  ses_mail += `Content-Type: application/octet-stream; name=\"${filename}\"\n`;
  ses_mail += "Content-Transfer-Encoding: base64\n";
  ses_mail += "Content-Disposition: attachment\n\n";
  ses_mail += data.toString("base64").replace(/([^\0]{76})/g, "$1\n") + "\n\n";
  ses_mail += "--NextPart--";

  const params = {
    RawMessage: { Data: ses_mail },
    Destinations: [receiver],
    Source: "'AWS SES Attchament Configuration' <" + sender + ">'"
  };

  const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendRawEmail(params).promise();

  sendPromise.then(
    (data) => {
      fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/invoice.pdf`);
      return;
    }).catch(
      (err) => {
        console.error(err, err.stack);
      });
};

const buildTableBody = (details, columns) => {
  const body = [];
  body.push([{
    text: 'Item',
    fillColor: '#eaf2f5',
    border: [false, true, false, true],
    margin: [0, 5, 0, 5],

  },
  {
    text: 'Quantity',
    border: [false, true, false, true],
    alignment: 'left',
    fillColor: '#eaf2f5',
    margin: [0, 5, 0, 5],

  },
  {
    text: 'Unit Price',
    border: [false, true, false, true],
    alignment: 'right',
    fillColor: '#eaf2f5',
    margin: [0, 5, 0, 5],

  },
  {
    text: 'Discount',
    border: [false, true, false, true],
    alignment: 'right',
    fillColor: '#eaf2f5',
    margin: [0, 5, 0, 5],

  },
  {
    text: 'Amount',
    border: [false, true, false, true],
    alignment: 'right',
    fillColor: '#eaf2f5',
    margin: [0, 5, 0, 5],

  }]);

  for (let i = 0; i < details.length; i++) {
    const detail = details[i];
    const dataRow = [];
    if (Number.isInteger(detail.price)) {
      detail.price = detail.price.toFixed(2);
    }
    if (Number.isInteger(detail.product.sellingPrice)) {
      detail.product.sellingPrice = detail.product.sellingPrice.toFixed(2);
    }
    if (Number.isInteger(detail.discount)) {
      detail.discount = `${detail.discount}%`;
    }
    for (let o = 0; o < columns.length; o++) {
      const column = columns[o];

      if (column === 'Item') {
        dataRow.push({
          text: detail['product']['name'],
          border: [false, false, false, true],
          margin: [0, 10, 0, 10],
          alignment: 'left',
        });
      } else if (column === 'Quantity') {
        dataRow.push({
          text: detail['quantity'],
          border: [false, false, false, true],
          margin: [0, 10, 0, 10],
          alignment: 'left',
        });
      } else if (column === 'Unit Price') {
        dataRow.push({
          text: detail['product']['sellingPrice'],
          border: [false, false, false, true],
          margin: [0, 10, 0, 10],
          alignment: 'right',
        });
      } else if (column === 'Discount') {
        dataRow.push({
          text: detail['discount'],
          border: [false, false, false, true],
          margin: [0, 10, 0, 10],
          alignment: 'right',
        });
      } else if (column === 'Amount') {
        dataRow.push({
          text: detail['price'],
          border: [false, false, false, true],
          margin: [0, 10, 0, 10],
          alignment: 'right',
        });
      }
    }
    body.push(dataRow);
  }
  return body;
};

const table = (details, columns) => {
  return {
    table: {
      headerRows: 1,
      widths: ['*', 80, 'auto', 'auto', 'auto'],
      body: buildTableBody(details, columns)
    },
    layout: {
      defaultBorder: false,
      hLineWidth: function (i, node) {
        return 1;
      },
      vLineWidth: function (i, node) {
        return 1;
      },
      hLineColor: function (i, node) {
        if (i === 1 || i === 0) {
          return '#bfdde8';
        }
        return '#eaeaea';
      },
      vLineColor: function (i, node) {
        return '#eaeaea';
      },
      hLineStyle: function (i, node) {
        // if (i === 0 || i === node.table.body.length) {
        return null;
        //}
      },
      // vLineStyle: function (i, node) { return {dash: { length: 10, space: 4 }}; },
      paddingLeft: function (i, node) {
        return 10;
      },
      paddingRight: function (i, node) {
        return 10;
      },
      paddingTop: function (i, node) {
        return 2;
      },
      paddingBottom: function (i, node) {
        return 2;
      },
      fillColor: function (rowIndex, node, columnIndex) {
        return '#fff';
      },
    }
  };
};


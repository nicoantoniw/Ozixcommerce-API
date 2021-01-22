const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const Invoice = require('../models/invoice');
const Product = require('../models/product');
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
      totalInvoices
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
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller === '' && status === '' && customer != '') {
      invoices = await Invoice.find({ customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller === '' && customer === '' && status != '') {
      invoices = await Invoice.find({ status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (seller === '' && customer === '' && status === '' && dateFrom != null && dateTo != null) {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (customer === '' && status === '' && dateFrom != null && dateTo != null && seller != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (seller === '' && status === '' && dateFrom != null && dateTo != null && customer != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (seller === '' && customer === '' && dateFrom != null && dateTo != null && status != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && status === '' && seller != '' && customer != '') {
      invoices = await Invoice.find({ seller: seller, customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && customer === '' && seller != '' && status != '') {
      invoices = await Invoice.find({ seller: seller, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller === '' && customer != '' && status != '') {
      invoices = await Invoice.find({ customer: customer, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && seller != '' && customer != '' && status != '') {
      invoices = await Invoice.find({ customer: customer, status: status, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom !== null && dateTo !== null && seller != '' && customer != '' && status === '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom !== null && dateTo !== null && seller != '' && customer === '' && status != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom !== null && dateTo !== null && seller === '' && customer != '' && status != '') {
      invoices = await Invoice.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, customer: customer, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom != null && dateTo != null && customer != '' && status != '' && seller != '') {
      invoices = await Invoice.find({ seller: seller, createdAt: { '$gte': dateFrom, '$lte': dateTo }, customer: customer, status: status, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else {
      invoices = await Invoice.find({ creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
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
      const result = await decreaseStock(detail.product, Number(detail.quantity), detail.location);
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
      let productId = detail.product._id;
      if (detail.product.isVariant) {
        productId = detail.product.productId;
      }
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Could not find any product');
        error.statusCode = 404;
      }
      if (detail.product.isVariant) {
        for (let i = 0; i < product.variants.length; i++) {
          const variant = product.variants[i];
          if (detail.product.sku == variant.sku) {
            for (let y = 0; y < variant.locations.length; y++) {
              const location = variant.locations[y];
              if (detail.location == location.location.toString()) {
                location.quantity += detail.quantity;
                variant.stock += detail.quantity;
              }
            }
          }
        }
      } else {
        for (let i = 0; i < product.locations.length; i++) {
          const location = product.locations[i];
          if (detail.location == location.location.toString()) {
            location.quantity += detail.quantity;
            product.stock += detail.quantity;
          }
        }
      }
      await product.save();

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

exports.createPDF = async (req, res, next) => {
  const invoice = req.body.invoice;
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
    if (this.image) {
      docDefinition = {
        content: [
          {
            columns: [
              {
                image:
                  'data:image/png;base64,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',
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
    }
    let pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(`Content-Disposition`, `inline; filename= ${invoiceName}`);
    if (!deletePdf) {
      pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'invoice.pdf')));
    }
    pdfDoc.pipe(res);
    pdfDoc.end();
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


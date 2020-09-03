const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const moment = require('moment');


const Invoice = require('../models/invoice');
const Product = require('../models/product');
const Group = require('../models/group');
const Account = require('../models/account');

exports.getInvoices = async (req, res, next) => {
  try {
    const totalInvoices = await Invoice.find({
      creator: req.groupId
    }).countDocuments();
    const invoices = await Invoice.find({ creator: req.groupId })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 })
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
  let dateFrom;
  let dateTo;

  if (req.query.dateFrom != null) {
    dateFrom = moment.utc(req.query.dateFrom).toISOString();
  } if (req.query.dateTo != null) {
    dateTo = moment.utc(req.query.dateTo).toISOString();
  }
  let seller = req.query.seller;
  let customer = req.query.customer;
  let status = req.query.status;
  if (!seller | !customer | !status) {
    seller = '';
    customer = '';
    status = '';
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
      .populate('customer', { name: 1, _id: 1 });
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
    for (let i = 0; i < invoice.details.length; i++) {
      const detail = invoice.details[i];
      decreaseStock(detail.product, Number(detail.quantity), detail.location);
    }
    await invoice.save();
    // const cashRegister = await Cash.findById(cashRegisterId);
    // if (!cashRegister) {
    //   const error = new Error('Could not find any register');
    //   error.statusCode = 404;
    //   throw error;
    // }
    // data2.invoice = invoice._id;
    // amount = parseFloat((Number(data2.amount)).toFixed(2));
    // cashRegister.balance += amount;
    // cashRegister.movements.push(data2);
    // await cashRegister.save();
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

exports.createPDF = (req, res, next) => {
  const now = moment().format('LLL');
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 25,
      bottom: 20,
      left: 25,
      right: 30
    }
  });

  // header
  doc
    .fontSize(20)
    .text("ACME Inc.", 110, 57)
    .fontSize(10)
    .text("123 Main Street", 200, 65, { align: "right" })
    .text("New York, NY, 10025", 200, 80, { align: "right" })
    .moveDown();

  // footer
  doc
    .fontSize(10)
    .text(
      "Payment is due within 15 days. Thank you for your business.",
      50,
      780,
      { align: "center", width: 500 }
    );

  // content
  let i;
  const invoiceTableTop = 150;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "Item",
    "Quantity",
    "Unit Cost",
    "Discount",
    "Amount"
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");


  for (i = 0; i < req.body.invoice.details.length; i++) {
    const detail = req.body.invoice.details[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      detail.product.name,
      detail.quantity,
      `$${detail.product.sellingPrice}`,
      detail.discount,
      `$${detail.price}`
    );
    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 30 + 10;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal",
    "",
    `$${req.body.invoice.subtotal}`
  );

  const taxesPosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    taxesPosition,
    "",
    "",
    "Taxes",
    "",
    `$${req.body.invoice.taxes}`
  );

  const totalPosition = taxesPosition + 20;
  generateTableRow(
    doc,
    totalPosition,
    "",
    "",
    "Total",
    "",
    `$${req.body.invoice.total}`
  );

  doc.end();
  doc.pipe(res);
  doc.pipe(
    fs.createWriteStream(path.join('assets', `${now}.pdf`))
  );
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
    }
    // const cashRegister = await Account.findById(invoice.account);
    // cashRegister.movements.forEach((movement, index) => {
    //   if (!movement.invoice) {
    //   } else if ((movement.invoice).toString() === (invoice._id).toString()) {
    //     index1 = index;
    //   }
    // });
    // cashRegister.movements.splice(index1, 1);
    // cashRegister.balance -= invoice.total;
    // await cashRegister.save();
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

const generateTableRow = (doc, y, c1, c2, c3, c4, c5) => {
  doc
    .fontSize(10)
    .text(c1, 25, y)
    .text(c2, 250, y)
    .text(c3, 280, y, { width: 90, align: "right" })
    .text(c4, 370, y, { width: 90, align: "right" })
    .text(c5, 0, y, { align: "right" });
};

const generateHr = (doc, y) => {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(20, y)
    .lineTo(580, y)
    .stroke();
};

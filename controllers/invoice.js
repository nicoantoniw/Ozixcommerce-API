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
      total: req.body.invoice.total,
      subtotal: req.body.invoice.subtotal,
      taxes: req.body.invoice.taxes,
      discounts: Number(req.body.invoice.discounts),
      creator: req.groupId,
      seller: req.body.invoice.seller,
      customer: req.body.invoice.customer,
      dueDate: moment.utc(req.body.invoice.dueDate),
      createdAt: moment.utc(req.body.invoice.createdAt)
    });
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
  let date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  if (day < 10) {
    day = `0${day}`;
  }
  if (month === 13) {
    month = 1;
    year = year + 1;
  }
  if (month < 10) {
    month = `0${month}`;
  }
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const pdfDocA4 = new PDFDocument({
    size: 'A4',
    margins: {
      top: 25,
      bottom: 20,
      left: 20,
      right: 30,
    }
  });
  const number = 40001;
  pdfDocA4.pipe(
    fs.createWriteStream(path.join('assets', `${day}-${month}-${year}::${hour}:${minutes}:${seconds}`))
  );
  pdfDocA4.pipe(res);
  pdfDocA4.fontSize(50).text('                               A');
  pdfDocA4.fontSize(12).text('                                                                                          COD. 01');
  pdfDocA4.rect(250, 20, 75, 65).stroke();
  //derecha
  pdfDocA4.fontSize(20).text('FACTURA', { align: 'right' });
  pdfDocA4.fontSize(18).text('ORIGINAL', { align: 'right' });
  pdfDocA4.fontSize(12).text('numero comprobante', { align: 'right' });
  pdfDocA4.fontSize(12).text('fecha emision', { align: 'right' });
  pdfDocA4.fontSize(12).text('categoria tributaria', { align: 'right' });
  pdfDocA4.fontSize(12).text('cuit', { align: 'right' });
  pdfDocA4.fontSize(12).text('ingresos brutos', { align: 'right' });
  pdfDocA4.fontSize(12).text('inicio actividades', { align: 'right' });
  // izquierda
  //logo
  pdfDocA4.fontSize(12).text(' razon social');
  pdfDocA4.fontSize(12).text(' domicilio');
  pdfDocA4.fontSize(12).text(' localidad, provincia');
  pdfDocA4.rect(pdfDocA4.x, 20, 560, pdfDocA4.y).stroke();
  pdfDocA4.fontSize(12).text(' ');
  pdfDocA4.fontSize(12).text(' ');
  pdfDocA4.fontSize(12).text(' ');
  pdfDocA4.fontSize(12).text('  razon social cliente');
  pdfDocA4.fontSize(12).text('  domicilio');
  pdfDocA4.fontSize(12).text('  localidad, provincia', { lineGap: -33 });
  //derecha
  pdfDocA4.fontSize(12).text('resp. iva', { align: 'center' });
  pdfDocA4.fontSize(12).text('cuit', { align: 'center' });
  pdfDocA4.fontSize(12).text('condicion de venta', { align: 'center' });
  pdfDocA4.rect(pdfDocA4.x, 20, 560, pdfDocA4.y).stroke();
  pdfDocA4.fontSize(12).text(' ');
  pdfDocA4.fontSize(12).text(' ');
  pdfDocA4.fontSize(12).text('      Codigo                   Descripcion                Cantidad      Precio Unit.     % Bonif   Alicuota        Total');
  pdfDocA4.fontSize(12).text('                                                                                                                                     IVA ');
  pdfDocA4.fontSize(10).text(`  `);
  pdfDocA4.fontSize(10).text(`                   ${number}00`);
  pdfDocA4.rect(20, 377, 80, 40).stroke();
  pdfDocA4.rect(100, 377, 150, 40).stroke();
  pdfDocA4.rect(250, 377, 65, 40).stroke();
  pdfDocA4.rect(315, 377, 85, 40).stroke();
  pdfDocA4.rect(400, 377, 50, 40).stroke();
  pdfDocA4.rect(450, 377, 50, 40).stroke();
  pdfDocA4.rect(500, 377, 80, 40).stroke();
  details.forEach(detail => {
    pdfDocA4.fontSize(10).text(`${detail.quantity},000 x ${detail.price / detail.quantity}`);
    pdfDocA4.fontSize(10).text(`${detail.product}`, { lineGap: -10, align: 'left' });
    pdfDocA4.fontSize(10).text(`$${detail.price}`, { align: 'right' });
  });
  pdfDocA4.rect(pdfDocA4.x, 20, 560, pdfDocA4.y).stroke();
  pdfDocA4.fontSize(10).text(`  `);
  pdfDocA4.fontSize(10).text(`TOTAL:`, { lineGap: -10, align: 'bottom' });
  pdfDocA4.fontSize(10).text(`$652000`, { align: 'right' });
  pdfDocA4.end();
};

exports.updateInvoice = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  const invoiceId = req.params.invoiceId;
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 });
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
    const details = {
      product: req.body.product,
      quantity: req.body.quantity,
      price: req.body.price
    };
    invoice.ticketType = req.body.ticketType;
    invoice.ticketNumber = req.body.ticketNumber;
    invoice.total = req.body.total;
    invoice.aggregateDiscount = req.body.aggregateDiscount;
    invoice.details = details;

    await invoice.save();
    res.status(200).json({
      message: 'invoice updated.',
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

exports.deactivateInvoice = async (req, res, next) => {
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
    invoice.status = 'inactivo';
    await invoice.save();
    res.status(200).json({
      message: 'invoice has been deactivated',
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
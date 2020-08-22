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
      .sort({ createdAt: -1 });

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

exports.getInvoicesByDate = async (req, res, next) => {
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
    const totalInvoices = await Invoice.find({
      creator: req.groupId,
      createdAt: { '$gte': start, '$lt': end }
    }).countDocuments();
    if (seller !== '') {
      const invoices = await Invoice.find({ createdAt: { '$gte': start, '$lt': end }, seller: seller, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ createdAt: -1 });

      if (totalInvoices === 0) {
        const error = new Error('No invoices found');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        invoices,
        totalInvoices
      });
    } else {
      const invoices = await invoice.find({ createdAt: { '$gte': start, '$lt': end }, creator: req.groupId })
        .populate('seller', { name: 1, _id: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .populate('customer', { name: 1, _id: 1 })
        .sort({ createdAt: -1 });

      if (totalinvoices === 0) {
        const error = new Error('No invoices found');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        invoices: invoices,
        totalinvoices: totalinvoices
      });
    }

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
exports.getInvoicesBySeller = async (req, res, next) => {
  const sellerId = req.params.sellerId;
  try {
    const totalInvoices = await invoice.find({
      creator: req.groupId,
      seller: sellerId
    }).countDocuments();
    const invoices = await Invoice.find({ creator: req.groupId, seller: sellerId })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

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



exports.getInvoicesByCustomer = async (req, res, next) => {
  const customerId = req.params.customerId;
  try {
    const totalInvoices = await Invoice.find({
      creator: req.groupId,
      customer: customerId
    }).countDocuments();
    const invoices = await Invoice.find({ creator: req.groupId, customer: customerId })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

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
      dueDate: req.body.invoice.dueDate,
      createdAt: req.body.invoice.createdAt
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
    res.status(200).json({
      message: 'invoice deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getInvoices30Days = async (req, res, next) => {
  try {
    const start = moment().subtract(30, 'days');
    const end = moment();
    const totalInvoices = await Invoice.find({
      creator: req.groupId, createdAt: { '$gte': start, '$lt': end }
    }).countDocuments();
    const invoices = await Invoice.find({ creator: req.groupId, createdAt: { '$gte': start, '$lt': end } })
      .populate('seller', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .populate('customer', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

    if (totalInvoices === 0) {
      const error = new Error('No invoices found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      totalinvoices,
      invoices
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
    let product2 = await Product.findById(product._id);
    if (!product) {
      const error = new Error('Could not find any product');
      error.statusCode = 404;
    }
    if (product.isVariant) {
      for (let i = 0; i < product2.variants.length; i++) {
        const variant = product.variants[i];
        if (product.sku == variant.sku) {
          for (let y = 0; y < variant.locations.length; y++) {
            const location2 = variant.locations[y];
            if (location == location2._id) {
              location2.quantity -= quantity;
              variant.stock -= quantity;
            }
          }
        }
      }
    } else {
      for (let i = 0; i < product2.locations.length; i++) {
        const location2 = product.locations[i];
        if (location == location2._id) {
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

const leapYear = (year) => {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
};


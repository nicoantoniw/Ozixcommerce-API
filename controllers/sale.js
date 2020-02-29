const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const moment = require('moment');


const Sale = require('../models/sale');
const Product = require('../models/product');
const Group = require('../models/group');

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
      const sales = await Sale.find({ createdAt: { '$gte': start, '$lt': end }, seller: seller, creator: req.groupId })
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

exports.getSalesByTicketType = async (req, res, next) => {
  const ticketType = req.params.ticketType;
  try {
    const totalSales = await Sale.find({
      creator: req.groupId,
      ticketType: ticketType
    }).countDocuments();
    const sales = await Sale.find({ creator: req.groupId, ticketType: ticketType })
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
    if (req.body.customer !== '') {
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
    } else if (req.body.customer === '') {
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
        decreaseStock(detail.product, detail.quantity, req.groupId);
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

exports.createTicket = async (req, res, next) => {
  const cae = req.body.CAE;
  const fchVto = req.body.CAEFchVto;
  const idType = req.body.DocTipo;
  const idNumber = req.body.DocNro;
  const ticketType = req.body.ticketType;
  const ticketNumber = req.body.CbteDesd;
  const ticketDate = req.body.CbteFch;
  const total = req.body.ImpTotal;
  const totalNoTax = req.body.ImpNeto;
  const iva = req.body.ImpIVA;
  const salePoint = req.body.PtoVta;
  const details = req.body.details;
  const pdfDoc = new PDFDocument();
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
  try {
    const group = await Group.findById(req.groupId);
    const category = group.category;
    const cuit = group.cuit;
    const activitiesDate = group.activitiesDate;
    const socialName = group.socialName;
    const city = group.city;
    const streetAddress = group.streetAddress;
    const zip = group.zip;

    if (ticketType === 'Factura B') {
      pdfDoc.pipe(
        fs.createWriteStream(path.join('assets', 'tickets', `${day}-${month}-${year}::${hour}:${minutes}:${seconds}`))
      );
      pdfDoc.pipe(res);
      pdfDoc.fontSize(10).text(`${socialName}`);
      pdfDoc.fontSize(10).text(`CUIT: ${cuit}`);
      pdfDoc.fontSize(10).text(`${streetAddress}`);
      pdfDoc.fontSize(10).text(`CP(${zip}) - ${city}`);
      pdfDoc.fontSize(10).text(`INIC.ACT: ${activitiesDate}`);
      if (idNumber === 0) {
        pdfDoc.fontSize(10).text(`IVA ${category} `);
        pdfDoc.fontSize(10).text(`A CONSUMIDOR FINAL`);
      }
      pdfDoc.text(' ');
      pdfDoc.fontSize(10).text(`P. V. 00${salePoint}`);
      pdfDoc.fontSize(10).text(`No.T. 0000${ticketNumber}`);
      pdfDoc.fontSize(10).text(`${day}/${month}/${year}        ${hour}:${minutes}`);
      pdfDoc.text(' ');
      pdfDoc.fontSize(10).text(`CANT./PRECIO UNIT`, { lineGap: -10, align: 'left' });
      pdfDoc.fontSize(10).text(`IMPORTE`, { align: 'right' });
      pdfDoc.fontSize(10).text(`DESCRIPCION`);
      pdfDoc.fontSize(10).text(` `);
      details.forEach(detail => {
        pdfDoc.fontSize(10).text(`${detail.quantity},000 x ${detail.price / detail.quantity}`);
        pdfDoc.fontSize(10).text(`${detail.product}`, { lineGap: -10, align: 'left' });
        pdfDoc.fontSize(10).text(`$${detail.price}`, { align: 'right' });
      });
      pdfDoc.fontSize(10).text(`  `);
      pdfDoc.fontSize(10).text(`TOTAL:`, { lineGap: -10, align: 'left' });
      pdfDoc.fontSize(10).text(`$${total}`, { align: 'right' });
      pdfDoc.fontSize(10).text(`  `);
      pdfDoc.fontSize(10).text(`CAE: ${cae}`);
      pdfDoc.fontSize(10).text(`Vto. CAE: ${fchVto}`);
      pdfDoc.end();
    }

    else if (ticketType === 'Cotización') {
      pdfDoc.pipe(
        fs.createWriteStream(path.join('assets', 'tickets', `${day}-${month}-${year}::${hour}:${minutes}:${seconds}`))
      );
      pdfDoc.pipe(res);
      pdfDoc.fontSize(10).text(`PRESUPUESTO`, { align: 'center' });
      pdfDoc.fontSize(10).text(`TICKET NO FISCAL`, { align: 'center' });
      pdfDoc.text('-------------------------------------------------', { align: 'center' });
      pdfDoc.fontSize(10).text(`${day}/${month}/${year}        ${hour}:${minutes}:${seconds}`, { align: 'center' });
      pdfDoc.text(' ');
      pdfDoc.fontSize(10).text(`CANT./PRECIO UNIT`, { lineGap: -10, align: 'left' });
      pdfDoc.fontSize(10).text(`IMPORTE`, { align: 'right' });
      pdfDoc.fontSize(10).text(`DESCRIPCION`);
      pdfDoc.fontSize(10).text(` `);
      details.forEach(detail => {
        pdfDoc.fontSize(10).text(`${detail.quantity},000 x ${detail.price / detail.quantity}`);
        pdfDoc.fontSize(10).text(`${detail.product}`, { lineGap: -10, align: 'left' });
        pdfDoc.fontSize(10).text(`$${detail.price}`, { align: 'right' });
      });
      pdfDoc.fontSize(10).text(`  `);
      pdfDoc.fontSize(10).text(`TOTAL:`, { lineGap: -10, align: 'left' });
      pdfDoc.fontSize(10).text(`$${total}`, { align: 'right' });
      pdfDoc.end();
    } else {
      // pdfDocA4.pipe(
      //   fs.createWriteStream(path.join('assets', 'tickets', `${day}-${month}-${year}::${hour}:${minutes}:${seconds}`))
      // );
      // pdfDocA4.pipe(res);

      // pdfDocA4.end();
    }

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.createTicketA4 = (req, res, next) => {
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
    fs.createWriteStream(path.join('assets', 'tickets', `${day}-${month}-${year}::${hour}:${minutes}:${seconds}`))
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

exports.getSales30Days = async (req, res, next) => {
  try {
    const start = moment().subtract(30, 'days');
    const end = moment();
    const totalSales = await Sale.find({
      creator: req.groupId, createdAt: { '$gte': start, '$lt': end }
    }).countDocuments();
    const sales = await Sale.find({ creator: req.groupId, createdAt: { '$gte': start, '$lt': end } })
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
      totalSales,
      sales
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


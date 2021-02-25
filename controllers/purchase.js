const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const PdfMake = require('pdfmake');
const moment = require('moment');
const AWS = require('aws-sdk');

const Purchase = require('../models/purchase');
const Bill = require('../models/bill');
const Contact = require('../models/contact');
const Product = require('../models/product');
const Group = require('../models/group');
const Account = require('../models/account');
const Notification = require('../models/notification');

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'AKIAJFUT6AOGGD44UV7Q',
  secretAccessKey: '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'
});

exports.getPurchases = async (req, res, next) => {
  try {
    const totalPurchases = await Purchase.find({
      creator: req.groupId
    }).countDocuments();
    const purchases = await Purchase.find({ creator: req.groupId })
      .populate('supplier', { name: 1, _id: 1, email: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ number: -1 });

    if (totalPurchases === 0) {
      const error = new Error('No purchases found');
      error.statusCode = 404;
      throw error;
    }
    const bills = await Bill.find({ creator: req.groupId })
      .sort({ createdAt: -1 });
    let lastBillNumber;
    if (bills.length > 0) {
      lastBillNumber = Number(bills[0].number) + 1;
    } else {
      lastBillNumber = 1001;
    }
    res.status(200).json({
      purchases: purchases,
      totalPurchases: totalPurchases,
      lastBillNumber,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPurchasesByFilter = async (req, res, next) => {
  let purchases;
  let dateFrom = req.query.dateFrom;
  let dateTo = req.query.dateTo;
  let supplier = req.query.supplier;
  let status = req.query.status;
  if (!supplier) {
    supplier = '';
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
    if (dateFrom === null && dateTo === null && status === '' && supplier != '') {
      purchases = await Purchase.find({ supplier: supplier, creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && supplier === '' && status != '') {
      purchases = await Purchase.find({ status: status, creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (supplier === '' && status === '' && dateFrom != null && dateTo != null) {
      purchases = await Purchase.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (status === '' && dateFrom != null && dateTo != null && supplier != '') {
      purchases = await Purchase.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, supplier: supplier, creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (supplier === '' && dateFrom != null && dateTo != null && status != '') {
      purchases = await Purchase.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom === null && dateTo === null && supplier != '' && status != '') {
      purchases = await Purchase.find({ supplier: supplier, status: status, creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else if (dateFrom !== null && dateTo !== null && supplier != '' && status != '') {
      purchases = await Purchase.find({ createdAt: { '$gte': dateFrom, '$lte': dateTo }, status: status, supplier: supplier, creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    } else {
      purchases = await Purchase.find({ creator: req.groupId })
        .populate('supplier', { name: 1, _id: 1, email: 1 })
        .populate('creator', { name: 1, _id: 1 })
        .sort({ number: -1 });
    }
    if (purchases.length < 1) {
      const error = new Error('No purchases found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      purchases
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPurchase = async (req, res, next) => {
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId)
      .populate('supplier', { name: 1, _id: 1, email: 1 })
      .populate('creator', { name: 1, _id: 1 });
    if (!purchase) {
      const error = new Error('No purchase found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addPurchase = async (req, res, next) => {
  const accountId = req.body.account;
  let amount;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    const purchase = new Purchase({
      number: req.body.purchase.number,
      details: req.body.purchase.details,
      description: req.body.purchase.description,
      total: Number(req.body.purchase.total),
      subtotal: req.body.purchase.subtotal,
      taxes: req.body.purchase.taxes,
      discounts: Number(req.body.purchase.discounts),
      creator: req.groupId,
      supplier: req.body.purchase.supplier,
      createdAt: moment.utc(req.body.purchase.createdAt)
    });

    const contact = await Contact.findById(req.body.purchase.supplier);
    if (contact.type === 'None') {
      contact.type = 'Supplier';
      await contact.save();
    } else if (contact.type === 'Customer') {
      contact.type = 'All';
      await contact.save();
    }

    await purchase.save();
    res.status(200).json({
      message: 'Purchase created.',
      purchase: purchase
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePurchaseStatus = async (req, res, next) => {
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      const error = new Error('Could not find any purchase');
      error.statusCode = 404;
      throw error;
    }
    if (purchase.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    purchase.status = req.body.status;

    await purchase.save();
    res.status(200).json({
      message: 'Purchase Order updated'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePurchasesStatus = async (req, res, next) => {
  const purchases = req.body.purchases;
  try {
    for (let index = 0; index < purchases.length; index++) {
      const element = purchases[index];
      const purchase = await Purchase.findById(element._id);
      if (!purchase) {
        const error = new Error('Could not find any purchase');
        error.statusCode = 404;
        throw error;
      }
      if (purchase.creator._id.toString() !== req.groupId) {
        const error = new Error('Not authorized.');
        error.statusCode = 403;
        throw error;
      }
      purchase.status = req.body.status;
      await purchase.save();
    }
    res.status(200).json({
      message: 'Purchase Order updated'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePurchase = async (req, res, next) => {
  const purchaseId = req.params.purchaseId;
  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      const error = new Error('Could not find any purchase');
      error.statusCode = 404;
      throw error;
    }
    if (purchase.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await purchase.remove();
    res.status(200).json({
      message: 'Purchase deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPDF = async (req, res, next) => {
  const purchase = req.body.purchase;
  const groupId = req.groupId;
  const subject = req.body.subject;
  const sender = 'nicolasantoniw@gmail.com';
  const receiver = req.body.receiver;
  const html = req.body.html;
  const sendPdf = req.body.sendPdf;
  const deletePdf = req.query.delete;
  const purchaseName = `PURCHASE-ORDER-${purchase.number}.pdf`;
  if (purchase.total[0] === "$") {
    purchase.total = req.body.purchase.total.substring(1);
  }
  if (Number.isInteger(purchase.taxes)) {
    purchase.taxes = purchase.taxes.toFixed(2);
  }
  if (Number.isInteger(purchase.subtotal)) {
    purchase.subtotal = purchase.subtotal.toFixed(2);
  }
  if (Number.isInteger(purchase.total)) {
    purchase.total = purchase.total.toFixed(2);
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
    sendPurchase(subject, sender, receiver, purchaseName, html);
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
                    text: 'Purchase',
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
                            text: 'Purchase No.',
                            color: '#aaaaab',
                            bold: true,
                            width: '*',
                            fontSize: 12,
                            alignment: 'right',
                            margin: [0, 0, 0, 5],
                          },
                          {
                            text: `${purchase.number}`,
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
                            text: `${purchase.createdAt}`,
                            bold: true,
                            color: '#333333',
                            fontSize: 12,
                            alignment: 'right',
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
            table(purchase.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                      text: `$${purchase.subtotal}`,
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
                      text: `$${purchase.taxes}`,
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
                      text: `$${purchase.total}`,
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
        res.setHeader(`Content-Disposition`, `inline; filename= ${purchaseName}`);
        if (!deletePdf) {
          pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'purchase.pdf')));
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
                  text: 'Purchase',
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
                          text: 'Purchase No.',
                          color: '#aaaaab',
                          bold: true,
                          width: '*',
                          fontSize: 12,
                          alignment: 'right',
                          margin: [0, 0, 0, 5],
                        },
                        {
                          text: `${purchase.number}`,
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
                          text: `${purchase.createdAt}`,
                          bold: true,
                          color: '#333333',
                          fontSize: 12,
                          alignment: 'right',
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
          table(purchase.details, ['Item', 'Quantity', 'Unit Price', 'Discount', 'Amount',]),
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
                    text: `$${purchase.subtotal}`,
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
                    text: `$${purchase.taxes}`,
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
                    text: `$${purchase.total}`,
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
      res.setHeader(`Content-Disposition`, `inline; filename= ${purchaseName}`);
      if (!deletePdf) {
        pdfDoc.pipe(fs.createWriteStream(path.join('assets', 'purchase.pdf')));
      }
      pdfDoc.pipe(res);
      pdfDoc.end();
    }

  }
};

const sendPurchase = (subject, sender, receiver, filename, html) => {
  const data = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/purchase.pdf`);
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
      fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/purchase.pdf`);
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
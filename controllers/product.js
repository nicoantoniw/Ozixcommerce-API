const fs = require('fs');

const { validationResult } = require('express-validator');
const xls = require('xls-to-json');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const multer = require('multer');
const path = require('path');
const url = require('url');

const Product = require('../models/product');
const Group = require('../models/group');

exports.getProducts = async (req, res, next) => {
  try {
    const totalItems = await Product.find({
      creator: req.groupId
    }).countDocuments();
    const products = await Product.find({ creator: req.groupId })
      .populate('category', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

    if (totalItems === 0) {
      const error = new Error('No products found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      products: products,
      totalItems: totalItems
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProductsByCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId;
  try {
    const totalProducts = await Product.find({
      creator: req.groupId,
      category: categoryId
    }).countDocuments();
    const products = await Product.find({
      category: categoryId,
      creator: req.groupId
    })
      .populate('creator', { name: 1, _id: 1 })
      .populate('category', { name: 1, _id: 1 });
    if (totalProducts === 0) {
      const error = new Error('No products found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      products: products,
      totalProducts: totalProducts
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  const productId = req.params.productId;
  const code = req.params.code;
  try {
    const product = await Product.findOne({
      $or:
        [
          {
            name: productId,
            creator: req.groupId
          },
          {
            code: code,
            creator: req.groupId
          }

        ]
    })
      .populate('category', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 });
    if (!product) {
      const error = new Error('No products found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addProduct = async (req, res, next) => {
  let discount = req.body.discount;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    const calculatedPercentage = Number(req.body.price) + (Number(req.body.price) * Number(req.body.percentage)) / 100;
    const calculatedPriceIva = Number(calculatedPercentage) + ((Number(req.body.iva) * Number(calculatedPercentage)) / 100);
    const product = new Product({
      name: req.body.name,
      code: req.body.code,
      description: req.body.description,
      category: req.body.category,
      price: Number(req.body.price),
      percentage: Number(req.body.percentage),
      finalPrice: Number(calculatedPriceIva).toFixed(2),
      iva: Number(req.body.iva),
      stock: req.body.stock,
      creator: req.groupId
    });
    if (req.body.calculatedPriceFlag) {

      product.totalDiscounts = 0;
      product.discounts = [];
    }
    if (req.body.finalPriceFlag) {
      product.price = 0;
      product.percentage = 0;
      product.discounts = [];
      product.totalDiscounts = 0;
      product.finalPrice = Number(req.body.finalPrice).toFixed(2);
    }
    if (req.body.discountFlag) {
      discount = Number(product.finalPrice * req.body.discount / 100).toFixed(2);
      product.finalPrice -= discount;
      product.discounts.push(req.body.discount);
      product.totalDiscounts += discount;
    }
    await product.save();
    res.status(200).json({
      message: 'Product created.',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};


exports.addImage = async (req, res, next) => {
  const productId = req.params.productId;
  let data;
  const s3 = new aws.S3({
    accessKeyId: 'AKIAUEN42P7LBOUCJDJF',
    secretAccessKey: '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',
    Bucket: 'perfumeriaslilianaimages'
  });
  const ext = req.file.originalname.split('.').pop();
  const file = fs.readFileSync(`/home/ubuntu/apps/Ozixcommerce-API/assets/file.${ext}`);
  // const file = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/OZIX-Software/Ozixcommerce/app/api/assets/file.${ext}`);
  if (ext === 'jpg') {
    ext2 = 'jpeg';
  } else {
    ext2 = 'png';
  }
  const params = {
    Bucket: 'perfumeriaslilianaimages',
    acl: 'public-read',
    Key: `${Date.now()}-${req.file.originalname}`,
    Body: file,
    ContentType: `image/${ext2}`
  };
  console.log(ext2);
  try {
    const product = await Product.findById(productId);
    s3.upload(params, (err, data) => {
      if (err) {
        throw err;
      }
      product.image = data.Location;
      product.save().then(success => {
        fs.unlinkSync(`/home/ubuntu/apps/Ozixcommerce-API/assets/file.${ext}`);
        // fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/OZIX-Software/Ozixcommerce/app/api/assets/file.${ext}`);
        console.log('asdsadf');
        res.status(200).json({
          message: 'Image uploaded'
        });
      }).catch(err => console.log(err));
    });
  } catch (error) {
    console.log(error);
  }
};

function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

exports.addMassiveProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ creator: req.groupId });
    // const busy = 1;
    // if (busy === 1) {
    //   const error = new Error('Please, Try again later');
    //   error.statusCode = 700;
    //   throw error;
    // }
    let data = [];
    let data2 = [];
    let calculatedFinalPrice = 0;
    xls({
      input: "/home/ubuntu/apps/Ozixcommerce-API/assets/file.xlsx",  // input xls
      // input: "/home/nicolas/Documents/dev/Projects/OZIX-Software/Ozixcommerce/app/api/assets/file.xlsx"
      output: null, // output json
      // sheet: "sheetname",  specific sheetname
      // rowsToSkip: 5  number of rows to skip at the top of the sheet; defaults to 0
    }, function (err, result) {
      if (err) {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      } else {
        data = result;
        for (let i = 0; i < data.length; i++) {
          data[i].price = parseFloat(data[i].price);
          data[i].percentage = parseFloat(data[i].percentage);
          data[i].iva = parseFloat(data[i].iva);
          data[i].stock = parseFloat(data[i].stock);
          if (data[i].finalPrice == 0) {
            const calculatedPercentage = Number(data[i].price) + (Number(data[i].price) * Number(data[i].percentage)) / 100;
            const calculatedPriceIva = Number(calculatedPercentage) + ((Number(data[i].iva) * Number(calculatedPercentage)) / 100);
            calculatedFinalPrice = parseFloat(Number(calculatedPriceIva).toFixed(2));
          }
          if (calculatedFinalPrice !== 0) {
            data[i].finalPrice = calculatedFinalPrice;
          }
          data[i].creator = req.groupId;
          products.forEach(product => {
            if (product.code === data[i].code || product.name === data[i].name) {
              product.finalPrice = data[i].finalPrice;
              product.stock = data[i].stock;
              product.iva = data[i].iva;
              product.price = data[i].price;
              product.percentage = data[i].percentage;
              data2.push(product);
              product.save().then(success => {
              }).catch(err => console.log(err));
            }
          });
        };
        data = data.filter(product => {
          for (let i = 0; i < data2.length; i++) {
            if (data2[i].code == product.code || data2[i].name == product.name) {
              return false;
            }
          }
          return true;
        });
        if (data.length > 0) {
          Product.insertMany(data, (err, docs) => {
            if (err) {
              const error = new Error('Some fields in the file are not correct');
              error.statusCode = 604;
              next(error);
              console.log(err);
            }
          });
        }

        fs.unlinkSync('/home/ubuntu/apps/Ozixcommerce-API/assets/file.xlsx');
        // fs.unlinkSync('/home/nicolas/Documents/dev/Projects/OZIX-Software/Ozixcommerce/app/api/assets/file.xlsx');
      }
    });
    res.status(200).json({
      message: 'Products created.'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  const productId = req.params.productId;
  let discount = 0;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    const product = await Product.findById(productId).populate('creator', {
      name: 1,
      _id: 1
    });
    if (!product) {
      const error = new Error('Could not find any product');
      error.statusCode = 404;
      throw error;
    }
    if (product.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    const calculatedPercentage = Number(req.body.price) + (Number(req.body.price) * Number(req.body.percentage)) / 100;
    const calculatedPriceIva = Number(calculatedPercentage) + ((Number(req.body.iva) * Number(calculatedPercentage)) / 100);
    product.name = req.body.name;
    product.code = req.body.code;
    product.description = req.body.description;
    product.iva = Number(req.body.iva);
    product.stock = req.body.stock;
    product.category = req.body.category;
    if (req.body.calculatedPriceFlag) {
      product.totalDiscounts = 0;
      product.discounts = [];
      product.price = req.body.price;
      product.percentage = req.body.percentage;
      product.finalPrice = Number(calculatedPriceIva).toFixed(2);
    }
    if (req.body.finalPriceFlag) {
      product.price = 0;
      product.percentage = 0;
      product.discounts = [];
      product.totalDiscounts = 0;
      product.finalPrice = Number(req.body.finalPrice).toFixed(2);
    }
    if (req.body.discountFlag) {
      discount = Number(product.finalPrice * req.body.discount / 100).toFixed(2);
      product.finalPrice -= discount;
      product.discounts.push(req.body.discount);
      product.totalDiscounts += discount;
    }
    await product.save();
    res.status(200).json({
      message: 'Product updated.',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activateProduct = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      const error = new Error('Could not find any product');
      error.statusCode = 404;
      throw error;
    }
    if (product.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    product.status = 'activo';
    await product.save();
    res.status(200).json({
      message: 'Product has been activated',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivateProduct = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      const error = new Error('Could not find any product');
      error.statusCode = 404;
      throw error;
    }
    if (product.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    product.status = 'inactivo';
    await product.save();
    res.status(200).json({
      message: 'Product has been deactivated',
      product: product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      const error = new Error('Could not find any product');
      error.statusCode = 404;
      throw error;
    }
    if (product.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await product.remove();
    res.status(200).json({
      message: 'Product deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteProducts = async (req, res, next) => {
  try {
    await Product.deleteMany({ creator: req.groupId });
    res.status(200).json({
      message: 'Products deleted.'
    });
  }
  catch (err) {
    console.log(err);
  }
};
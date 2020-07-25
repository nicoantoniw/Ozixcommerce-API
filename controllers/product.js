const fs = require('fs');

const { validationResult } = require('express-validator');
const xls = require('xls-to-json');
const aws = require('aws-sdk');
const path = require('path');

const Product = require('../models/product');
const Option = require('../models/option');
const Location = require('../models/location');
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

exports.getProduct = async (req, res, next) => {
  const productId = req.params.productId;
  const sku = req.params.sku;
  try {
    const product = await Product.findOne({
      $or:
        [
          {
            name: productId,
            creator: req.groupId
          },
          {
            _id: productId,
            creator: req.groupId
          },
          {
            sku: sku,
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



exports.addProduct = async (req, res, next) => {
  let discount = req.body.discount;
  const locations = req.body.locations;
  let totalStock = 0;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    for (let index = 0; index < locations.length; index++) {
      totalStock += Number(locations[index].quantity);
    }
    const product = new Product({
      name: req.body.name,
      brand: req.body.brand,
      sku: req.body.sku,
      description: req.body.description,
      category: req.body.category,
      locations,
      price: Number(req.body.price),
      percentage: Number(req.body.percentage),
      sellingPrice: 0,
      stock: req.body.stock,
      creator: req.groupId
    });
    if (totalStock > product.stock) {
      product.stock = totalStock;
    }
    if (req.body.calculatedPriceFlag) {
      product.totalDiscounts = 0;
      product.discounts = [];
      product.price = req.body.price;
      product.percentage = req.body.percentage;
      product.sellingPrice = parseFloat((Number(req.body.price) + (Number(req.body.price) * Number(req.body.percentage) / 100)).toFixed(2));
    }
    const difference = Number(req.body.sellingPrice) - Number(req.body.price);
    const calculatedPercentage = parseFloat(((difference / Number(req.body.price)) * 100).toFixed(2));
    if (req.body.sellingPriceFlag) {
      product.price = req.body.price;
      product.percentage = calculatedPercentage;
      product.discounts = [];
      product.totalDiscounts = 0;
      product.sellingPrice = Number(req.body.sellingPrice).toFixed(2);
    }
    if (req.body.discountFlag) {
      discount = Number(product.sellingPrice * req.body.discount / 100).toFixed(2);
      product.sellingPrice -= discount;
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
    let calculatedsellingPrice = 0;
    xls({
      input: "/home/ubuntu/apps/Ozixcommerce-API/assets/file.xlsx",
      // input: "/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/file.xlsx",
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
          data[i].price = parseFloat(data[i].cost);
          data[i].percentage = parseFloat(data[i].percentage);
          data[i].stock = parseFloat(data[i].stock);
          data[i].sellingPrice = parseFloat(data[i].sellingPrice);
          data[i].sku = parseFloat(data[i].sku);
          if (data[i].sellingPrice == 0) {
            data[i].sellingPrice = parseFloat((req.body.price + req.body.price * req.body.percentage / 100).toFixed(2));
          }
          if (data[i].percentage == 0) {
            data[i].percentage = parseFloat(Number(req.body.sellingPrice) * 100 / Number(req.body.price)).toFixed(2);
          }
          data[i].creator = req.groupId;
          products.forEach(product => {
            if (product.sku === data[i].codigo || product.name === data[i].nombre) {
              product.sellingPrice = data[i].sellingPrice;
              product.stock = data[i].stock;
              product.brand = data[i].marca;
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
            if (data2[i].sku == product.sku || data2[i].name == product.name) {
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
        // fs.unlinkSync('/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/file.xlsx');
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
  let totalStock = 0;
  const locations = req.body.locations;
  const errors = validationResult(req);
  if (!req.body.updateLocationsOnly && !req.body.deleteLocationsOnly) {
    for (let index = 0; index < locations.length; index++) {
      totalStock += Number(locations[index].quantity);
    }
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed, entered data is incorrect');
      error.statusCode = 422;
      next(error);
    }
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
    if (req.body.updateLocationsOnly) {
      product.locations.push({
        location: req.body.location,
        name: req.body.name,
        quantity: req.body.quantity
      });
      for (let index = 0; index < product.locations.length; index++) {
        totalStock += Number(product.locations[index].quantity);
      }
      if (product.stock < totalStock) {
        product.stock = totalStock;
      }
    } else if (req.body.deleteLocationsOnly) {
      index = product.locations.indexOf(req.body.item);
      product.locations.splice(index, 1);
    } else {
      product.name = req.body.name;
      product.brand = req.body.brand;
      product.sku = req.body.sku;
      product.description = req.body.description;
      product.stock = Number(req.body.stock);
      if (product.stock < totalStock) {
        product.stock = totalStock;
      }
      product.locations = locations;
      product.category = req.body.category;
      product.price = req.body.price;
      product.sellingPrice = req.body.sellingPrice;

      if (req.body.calculatedPriceFlag) {
        product.totalDiscounts = 0;
        product.discounts = [];
        product.price = req.body.price;
        product.percentage = req.body.percentage;
        product.sellingPrice = parseFloat((req.body.price + req.body.price * req.body.percentage / 100).toFixed(2));
      }
      const difference = Number(req.body.sellingPrice) - Number(req.body.price);
      const calculatedPercentage = parseFloat(((difference / Number(req.body.price)) * 100).toFixed(2));
      if (req.body.sellingPriceFlag) {
        product.price = req.body.price;
        product.percentage = calculatedPercentage;
        product.discounts = [];
        product.totalDiscounts = 0;
        product.sellingPrice = Number(req.body.sellingPrice).toFixed(2);
      }
      if (req.body.discountFlag) {
        discount = Number(product.sellingPrice * req.body.discount / 100).toFixed(2);
        product.sellingPrice -= discount;
        product.discounts.push(req.body.discount);
        product.totalDiscounts += discount;
      }
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

exports.addImage = async (req, res, next) => {
  const productId = req.params.productId;
  const variantSku = req.query.variantSku;
  let data;
  const s3 = new aws.S3({
    accessKeyId: 'AKIAUEN42P7LBOUCJDJF',
    secretAccessKey: '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',
    Bucket: 'ozixcommerce.com-images'
  });
  const ext = req.file.originalname.split('.').pop();
  // const file = fs.readFileSync(`/home/ubuntu/apps/Ozixcommerce-API/assets/file.${ext}`);
  const file = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/file.${ext}`);
  if (ext === 'jpg') {
    ext2 = 'jpeg';
  } else {
    ext2 = 'png';
  }
  const params = {
    Bucket: 'ozixcommerce.com-images',
    acl: 'public-read',
    Key: `${Date.now()}-${req.file.originalname}`,
    Body: file,
    ContentType: `image/${ext2}`
  };
  try {
    const product = await Product.findById(productId);
    s3.upload(params, (err, data) => {
      if (err) {
        throw err;
      }
      if (variantSku) {
        product.variants.forEach(variant => {
          if (variant.sku == variantSku) {
            variant.image = data.Location;
          }
        });
      } else {
        product.image = data.Location;
      }
      product.save().then(success => {
        // fs.unlinkSync(`/home/ubuntu/apps/Ozixcommerce-API/assets/file.${ext}`);
        fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/file.${ext}`);
        res.status(200).json({
          message: 'Image uploaded'
        });
      }).catch(err => console.log(err));
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
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

exports.getProductOptions = async (req, res, next) => {
  const productId = req.params.productId;
  const options = [];
  try {
    const product = await Product.findById(productId)
      .populate('category', { name: 1, _id: 1 })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });
    if (!product) {
      const error = new Error('No product found');
      error.statusCode = 404;
      throw error;
    }
    for (let index = 0; index < product.options.length; index++) {
      const optionId = product.options[index];
      const option = await Option.findById(optionId);
      options.push(option);
    }
    res.status(200).json({
      options
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateOptions = async (req, res, next) => {
  const options = [];
  let option;
  try {
    const product = await Product.findById(req.params.productId);
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
    for (let index = 0; index < req.body.options.length; index++) {
      const x = req.body.options[index];
      option = await Option.findOne({ name: x.option, creator: req.groupId });
      options.push(option._id);
    }
    product.options = options;
    await product.save();
    res.status(200).json({
      message: 'Options updated'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProductVariants = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findById(productId)
      .sort({ createdAt: -1 });
    if (!product) {
      const error = new Error('No product found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      variants: product.variants
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProductVariant = async (req, res, next) => {
  const variantId = req.params.variantId;
  const productId = req.params.productId;
  let variant;
  try {
    const product = await Product.findById(productId)
      .sort({ createdAt: -1 });
    if (!product) {
      const error = new Error('No product found');
      error.statusCode = 404;
      throw error;
    }
    product.variants.forEach(item => {
      if (item._id == variantId) {
        variant = item;
      }
    });
    res.status(200).json({
      variant
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addVariant = async (req, res, next) => {
  let discount;
  let name = '';
  const locations = req.body.locations;
  let totalStock = 0;
  let totalStock2 = Number(req.body.stock);
  for (let index = 0; index < locations.length; index++) {
    totalStock += Number(locations[index].quantity);
  }

  try {
    const product = await Product.findById(req.params.productId);
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
    name = product.name;
    req.body.values.forEach(value => {
      name += ` - ${value.value} `;
    });
    const variant = {
      name: name,
      values: req.body.values,
      stock: req.body.stock,
      sku: req.body.sku,
      price: req.body.price,
      locations,
      percentage: req.body.percentage,
      sellingPrice: 0,
      discounts: [],
      totalDiscounts: 0
    };
    if (totalStock > variant.stock) {
      variant.stock = totalStock;
    }
    const difference = Number(req.body.sellingPrice) - Number(req.body.price);
    const calculatedPercentage = parseFloat(((difference / Number(req.body.price)) * 100).toFixed(2));
    if (req.body.calculatedPriceFlag) {
      variant.price = req.body.price;
      variant.percentage = req.body.percentage;
      variant.sellingPrice = parseFloat((Number(req.body.price) + (Number(req.body.price) * Number(req.body.percentage) / 100)).toFixed(2));
    } else {
      variant.price = Number(req.body.price);
      variant.percentage = calculatedPercentage;
      variant.discounts = [];
      variant.totalDiscounts = 0;
      variant.sellingPrice = Number(req.body.sellingPrice).toFixed(2);
    }
    if (req.body.discountFlag) {
      discount = Number(variant.sellingPrice * req.body.discount / 100).toFixed(2);
      variant.sellingPrice -= discount;
      variant.discounts.push(req.body.discount);
      variant.totalDiscounts += discount;
    }
    product.hasVariants = true;
    product.variants.forEach(variant => {
      totalStock2 += variant.stock;
    });
    if (totalStock2 > product.stock) {
      product.stock = totalStock2;
    }
    product.variants.push(variant);
    await product.save();
    res.status(200).json({
      message: 'Variant created',
      product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateVariant = async (req, res, next) => {
  let discount;
  let name = '';
  let totalStock = 0;
  let totalStock2 = 0;
  let index;
  const locations = req.body.locations;
  if (!req.body.updateLocationsOnly && !req.body.deleteLocationsOnly) {
    for (let index = 0; index < locations.length; index++) {
      totalStock += Number(locations[index].quantity);
    }
  }
  try {
    const product = await Product.findById(req.params.productId);
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
    product.variants.forEach(variant => {
      totalStock2 += variant.stock;
      if (variant.sku == req.body.sku) {
        if (req.body.updateLocationsOnly) {
          variant.locations.push({
            location: req.body.location,
            name: req.body.name,
            quantity: req.body.quantity
          });
          for (let index = 0; index < variant.locations.length; index++) {
            totalStock += Number(variant.locations[index].quantity);
          }
          if (variant.stock < totalStock) {
            variant.stock = totalStock;
          }
        } else if (req.body.deleteLocationsOnly) {
          index = variant.locations.indexOf(req.body.item);
          variant.locations.splice(index, 1);
        } else {
          name = product.name;
          req.body.values.forEach(value => {
            name += ` - ${value.value} `;
          });
          variant.name = name;
          variant.values = req.body.values;
          variant.stock = req.body.stock;
          if (variant.stock < totalStock) {
            variant.stock = totalStock;
          }
          variant.sku = req.body.sku;
          variant.locations = locations;

          if (req.body.calculatedPriceFlag) {
            variant.totalDiscounts = 0;
            variant.discounts = [];
            variant.price = req.body.price;
            variant.percentage = req.body.percentage;
            variant.sellingPrice = parseFloat((Number(req.body.price) + (Number(req.body.price) * Number(req.body.percentage) / 100)).toFixed(2));
          }
          const difference = Number(req.body.sellingPrice) - Number(req.body.price);
          const calculatedPercentage = parseFloat(((difference / Number(req.body.price)) * 100).toFixed(2));
          if (req.body.calculatedPriceFlag) {
            variant.price = req.body.price;
            variant.percentage = req.body.percentage;
            variant.sellingPrice = parseFloat((Number(req.body.price) + (Number(req.body.price) * Number(req.body.percentage) / 100)).toFixed(2));
          } else {
            variant.price = Number(req.body.price);
            variant.percentage = calculatedPercentage;
            variant.discounts = [];
            variant.totalDiscounts = 0;
            variant.sellingPrice = Number(req.body.sellingPrice).toFixed(2);
          }
          if (req.body.discountFlag) {
            discount = Number(variant.sellingPrice * req.body.discount / 100).toFixed(2);
            variant.sellingPrice -= discount;
            variant.discounts.push(req.body.discount);
            variant.totalDiscounts += discount;
          }
        }
      }
    });
    if (totalStock2 > product.stock) {
      product.stock = totalStock2;
    }
    await product.save();
    res.status(200).json({
      message: 'Variant created',
      product
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteVariant = async (req, res, next) => {
  const productId = req.params.productId;
  const variantId = req.params.variant;
  let indexo;
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
    product.variants.forEach((variant, index) => {
      if (variant._id == variantId) {
        indexo = index;
      }
    });
    product.variants.splice(indexo, 1);
    if (product.variants.length < 1) {
      product.hasVariants = false;
    }
    await product.save();
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
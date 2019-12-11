const { validationResult } = require('express-validator');

const Category = require('../models/category');

exports.getCategories = async (req, res, next) => {
  try {
    const totalCategories = await Category.find({
      creator: req.groupId
    }).countDocuments();
    const categories = await Category.find({ creator: req.groupId })
      .populate('creator', { name: 1, _id: 1 })
      .sort({ createdAt: -1 });

    if (totalCategories === 0) {
      const error = new Error('No categories found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      categories: categories,
      totalCategories: totalCategories
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findOne({
      _id: categoryId,
      creator: req.groupId
    }).populate('creator', { name: 1, _id: 1 });
    if (!category) {
      const error = new Error('No category found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      category: category
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// exports.listCategory = async (req, res, next) => {
//   try {
//     let value = req.query.value;
//     const category = await Category.find(
//       {
//         $or: [

//           { 'name': { $regex: value, $options: 'i' } },
//           { 'description': { $regex: value, $options: 'i' } }
//         ]
//       },
//       { createdAt: 0 }
//     ).populate('creator', { name: 1, _id: 1 });
//     res.status(200).json({
//       category: category
//     });
//   } catch (err) {
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };

exports.addCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const category = new Category({
    name: req.body.name,
    description: req.body.description,
    creator: req.groupId
  });
  try {
    await category.save();
    res.status(200).json({
      message: 'Category created.',
      category: category
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId).populate('creator');
    if (!category) {
      const error = new Error('Could not find any category');
      error.statusCode = 404;
      throw error;
    }
    if (category.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    category.name = req.body.name;
    category.description = req.body.description;
    await category.save();
    res.status(200).json({
      message: 'Category updated.',
      category: category
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activateCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      const error = new Error('Could not find any category');
      error.statusCode = 404;
      throw error;
    }
    if (category.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    category.status = 'activo';
    await category.save();
    res.status(200).json({
      message: 'Category has been activated',
      category: category
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivateCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      const error = new Error('Could not find any category');
      error.statusCode = 404;
      throw error;
    }
    if (category.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    category.status = 'inactivo';
    await category.save();
    res.status(200).json({
      message: 'Category has been deactivated',
      category: category
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  const categoryId = req.params.categoryId;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      const error = new Error('Could not find any category');
      error.statusCode = 404;
      throw error;
    }
    if (category.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await Category.findByIdAndRemove(categoryId);
    res.status(200).json({
      message: 'Category deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

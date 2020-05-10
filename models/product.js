const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  code: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  image: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  finalPrice: {
    type: Number,
    required: true
  },
  iva: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: false
  },
  discount: {
    type: Number,
    required: false
  },
  discounts: {
    type: [{
      type: Number
    }],
    default: []
  },
  totalDiscounts: {
    type: Number,
    default: 0,
    required: false
  },
  status: {
    type: String,
    default: 'activo',
    required: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);

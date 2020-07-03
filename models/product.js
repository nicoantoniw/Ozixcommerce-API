const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: false
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
  options: [{
    type: Schema.Types.ObjectId,
    ref: 'Option'
  }],
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: [{
    name: {
      type: String
    },
    values: [{
      value: {
        type: String
      }
    }],
    stock: {
      type: Number,
      required: false
    },
    code: {
      type: String,
    },
    price: {
      type: Number,
      required: false
    },
    percentage: {
      type: Number,
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
    finalPrice: {
      type: Number,
    },
  }
  ],
  websiteStatus: {
    type: Number,
    required: false,
    default: 0
  },
  websiteFeaturedStatus: {
    type: Number,
    required: false,
    default: 0
  },
  websitePromotionsStatus: {
    type: Number,
    required: false,
    default: 0
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

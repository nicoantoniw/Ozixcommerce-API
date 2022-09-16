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
  sku: {
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
  },
  percentage: {
    type: Number,
    required: true
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  salePrice: {
    type: Number,
    default: 0
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
  stock: {
    type: Number,
    required: false
  },
  unassignedStock: {
    type: Number,
    default: 0
  },
  trackItem: {
    type: Boolean,
    default: true
  },
  taxable: {
    type: String,
  },
  locations: [
    {
      location: {
        type: Schema.Types.ObjectId,
        ref: 'Location'
      },
      name: {
        type: String
      },
      quantity: {
        type: Number
      }
    }
  ],
  salesAccount: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    required: false
  },
  costOfGoodsAccount: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
  },
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: [{
    isVariant: {
      type: Boolean,
      default: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String
    },
    brand: {
      type: String,
      required: false
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    },
    values: [{
      value: {
        type: String
      }
    }],
    sku: {
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
    sellingPrice: {
      type: Number,
    },
    salePrice: {
      type: Number,
      default: 0
    },
    stock: {
      type: Number,
      required: false
    },
    unassignedStock: {
      type: Number,
      default: 0
    },
    trackItem: {
      type: Boolean,
      default: true
    },
    hasImage: {
      type: Boolean,
      default: false
    },
    image: {
      type: String,
    },
    locations: [
      {
        location: {
          type: Schema.Types.ObjectId,
          ref: 'Location'
        },
        name: {
          type: String
        },
        quantity: {
          type: Number
        }
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    }
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
    default: 'active',
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

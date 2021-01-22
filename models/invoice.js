const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
    required: false
  },
  account: {
    type: Schema.Types.ObjectId,
    ref: 'Account'
  },
  number: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  taxes: {
    type: Number,
    required: true
  },
  discounts: {
    type: Number,
    required: true
  },
  details: [
    {
      discount: {
        type: Number,
        required: true,
        default: 0
      },
      product: {
        type: Object,
        ref: 'Product',
      },
      location: {
        type: Schema.Types.ObjectId,
        ref: 'Location',
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    }
  ],
  status: {
    type: String,
    required: true,
    default: 'Unpaid',
    enum: ['Unpaid', 'Partially Paid', 'Paid'],

  },
  paid: {
    type: Number,
    required: true,
    default: 0
  },
  due: {
    type: Number,
    required: true,
    default: 0
  },
  sent: {
    type: String,
    default: 'No'
  },
  createdAt: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  type: {
    type: String,
    default: 'Invoice'
  },
});

module.exports = mongoose.model('Invoice', invoiceSchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const purchaseSchema = new Schema({
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  supplier: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
    required: false
  },
  account: {
    type: Schema.Types.ObjectId,
    ref: 'Account'
  },
  description: {
    type: String,
    required: true
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
    default: 'Pending'
  },
  sent: {
    type: String,
    default: 'No'
  },
  type: {
    type: String,
    default: 'Purchase Order'
  },
  createdAt: {
    type: Date
  }
});

module.exports = mongoose.model('Purchase', purchaseSchema);

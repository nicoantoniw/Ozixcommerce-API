const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const saleSchema = new Schema({
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
  ticketType: {
    type: String,
    required: true
  },
  ticketNumber: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  details: [
    {
      aggregateDiscount: {
        type: Number,
        required: true,
        default: 0
      },
      product: {
        type: String,
        required: true
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
    default: 'activo'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Sale', saleSchema);

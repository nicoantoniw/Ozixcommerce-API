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
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  ticketType: {
    type: String,
    required: true
  },
  ticketSerie: {
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
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
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
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Purchase', purchaseSchema);

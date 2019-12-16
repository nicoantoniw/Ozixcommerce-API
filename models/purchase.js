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

module.exports = mongoose.model('Purchase', purchaseSchema);

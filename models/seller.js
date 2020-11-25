const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sellerSchema = new Schema({
  name: {
    type: String,
    required: false
  },
  businessID: {
    type: String,
    required: false
  },
  gender: {
    type: String,
    required: false
  },
  notes: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  mobile: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  birth: {
    type: Date
  },
  hireDate: {
    type: Date
  },
  releaseDate: {
    type: Date
  },
  address: {
    street: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    zip: {
      type: String,
    },
    country: {
      type: String,
    },
  },
  account: [
    {
      debt: Number,
      description: String,
      date: {
        type: Date,
        default: Date.now
      },
      typeDebt: String
    }
  ],
  totalDebt: {
    type: Number,
    required: false,
    default: 0
  },
  owes: {
    type: Number,
    required: false,
    default: 0
  },
  youOwe: {
    type: Number,
    required: false,
    default: 0
  },
  salary: {
    type: Number,
    required: false,
    default: 0
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

module.exports = mongoose.model('Seller', sellerSchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const personSchema = new Schema({
  name: {
    type: String,
    required: false
  },
  notes: {
    type: String,
    required: false
  },
  type: {
    type: String,
    required: false
  },
  company: {
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
  fax: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  website: {
    type: String,
    required: false
  },
  other: {
    type: String,
    required: false
  },
  billingAddress: {
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
  shippingAddress: {
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

module.exports = mongoose.model('Person', personSchema);

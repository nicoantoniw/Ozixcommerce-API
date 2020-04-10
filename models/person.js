const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const personSchema = new Schema({
  name: {
    type: String,
    required: false
  },
  birth: {
    type: Date,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  age: {
    type: Number
  },
  cuit: {
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
  typeId: {
    type: String,
    required: false
  },
  numberId: {
    type: String,
    required: false
  },
  address: {
    type: String,
    required: false
  },
  phoneNumber: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
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
  status: {
    type: String,
    required: true,
    default: 'activo'
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

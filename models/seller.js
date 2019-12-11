const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sellerSchema = new Schema({
  name: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  birth: {
    type: Date
  },
  age: {
    type: Number
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
  salary: Number,
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

module.exports = mongoose.model('Seller', sellerSchema);

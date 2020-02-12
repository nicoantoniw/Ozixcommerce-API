const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  users: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  plan: {
    type: String,
    required: true
  },
  province: {
    type: String
  },
  city: {
    type: String
  },
  streetAddress: {
    type: String
  },
  zip: {
    type: String
  },
  apartment: {
    type: String
  },
  category: {
    type: String
  },
  personeria: {
    type: String
  },
  cuit: {
    type: String
  },
  activitiesDate: {
    type: String
  },
  socialName: {
    type: String
  },
  brutosNumber: {
    type: String
  },
  phone: {
    type: String
  },
  salePoint: [{
    type: String
  }],
  defaultSalePoint: {
    type: String
  },
  status: {
    type: String,
    default: 'active',
    required: true
  }
});

module.exports = mongoose.model('Group', groupSchema);

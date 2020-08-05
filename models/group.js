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
      ref: 'User',
    }
  ],
  websiteUsers: [
    {
      type: Schema.Types.ObjectId,
      ref: 'WebsiteUser',
    }
  ],
  plan: {
    type: String,
    required: false
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
  phone: {
    type: String
  },
  status: {
    type: String,
    default: 'active',
    required: true
  }
});

module.exports = mongoose.model('Group', groupSchema);

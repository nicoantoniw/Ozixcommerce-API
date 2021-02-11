const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  legalName: {
    type: String,
    required: true
  },
  idNumber: {
    type: String,
    required: true
  },
  industry: {
    type: String
  },
  logo: {
    type: String
  },
  hasLogo: {
    type: Boolean,
    default: false
  },
  contactDetails: {
    phone: {
      type: String
    },
    email: {
      type: String
    },
    customerFacingEmail: {
      type: String
    },
    website: {
      type: String
    }
  },
  companyAddress: {
    state: {
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
  },
  customerFacingAddress: {
    state: {
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
  },
  plan: {
    type: String,
    required: false
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
  status: {
    type: String,
    default: 'active',
    required: true
  }
});

module.exports = mongoose.model('Group', groupSchema);

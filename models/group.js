const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: {
    type: String,
    default: '',
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
    url: {
      type: String
    },
    key: {
      type: String
    }
  },
  hasLogo: {
    type: Boolean,
    default: false
  },
  contactDetails: {
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    customerFacingEmail: {
      type: String,
      default: '',
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
    street: {
      type: String
    },
    zip: {
      type: String
    },
  },
  validatedAddress: {
    type: Boolean,
    default: false
  },
  customerFacingAddress: {
    state: {
      type: String
    },
    city: {
      type: String
    },
    street: {
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

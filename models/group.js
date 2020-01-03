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
  status: {
    type: String,
    default: 'active',
    required: true
  }
});

module.exports = mongoose.model('Group', groupSchema);

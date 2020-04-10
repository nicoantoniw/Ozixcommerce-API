const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'active',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);

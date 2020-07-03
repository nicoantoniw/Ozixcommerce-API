const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const optionsSchema = new Schema({
    name: {
        type: String
    },
    values: [{
        value: {
            type: String
        }
    }],
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

module.exports = mongoose.model('Option', optionsSchema);

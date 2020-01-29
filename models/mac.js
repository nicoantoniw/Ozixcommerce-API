const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const macSchema = new Schema({
    address: {
        type: String,
        required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    }
});

module.exports = mongoose.model('Mac', macSchema);

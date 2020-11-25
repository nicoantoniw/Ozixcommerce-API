const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    reference: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Person',
    },
    invoice: {
        type: Schema.Types.ObjectId,
        ref: 'Invoice',
    },
    account: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    notes: {
        type: String
    },
    total: {
        type: Number,
        required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    createdAt: {
        type: Date
    },
});

module.exports = mongoose.model('Payment', paymentSchema);

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
    refContact: {
        type: String,
        enum: ['Customer', 'Supplier'],
    },
    contact: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
    },
    refTransaction: {
        type: String,
        enum: ['Bill', 'Invoice'],
    },
    transaction: {
        type: Schema.Types.ObjectId,
        ref: 'refTransaction',
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
    type: {
        type: String,
        default: 'Payment'
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

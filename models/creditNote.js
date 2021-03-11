const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const creditNoteSchema = new Schema({
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    contact: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    },
    number: {
        type: String,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    taxes: {
        type: Number,
        required: true
    },
    discounts: {
        type: Number,
        required: true
    },
    details: [
        {
            discount: {
                type: Number,
                default: 0
            },
            product: {
                type: Object,
                ref: 'Product',
            },
            location: {
                type: Schema.Types.ObjectId,
                ref: 'Location',
            },
            quantity: {
                type: Number,
            },
            price: {
                type: Number,
            }
        }
    ],
    status: {
        type: String,
        required: true,
        default: 'Unpaid',
        enum: ['Unpaid', 'Partially Paid', 'Paid'],

    },
    paid: {
        type: Number,
        required: true,
        default: 0
    },
    due: {
        type: Number,
        required: true,
        default: 0
    },
    creditToApply: {
        type: Number,
        required: true,
        default: 0
    },
    sent: {
        type: String,
        default: 'No'
    },

    createdAt: {
        type: Date
    },
    type: {
        type: String,
        default: 'Credit Note'
    },
});

module.exports = mongoose.model('CreditNote', creditNoteSchema);

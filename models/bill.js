const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billSchema = new Schema({
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    },
    number: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    total: {
        type: Number,
        required: true
    },
    subtotal: {
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
                required: true,
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
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    status: {
        type: String,
        required: true,
        enum: ['Unpaid', 'Partially Paid', 'Paid'],
        default: 'Unpaid'
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
    sent: {
        type: String,
        default: 'No'
    },
    createdAt: {
        type: Date
    },
    dueDate: {
        type: Date
    },
    type: {
        type: String,
        default: 'Bill'
    },
});

module.exports = mongoose.model('Bill', billSchema);

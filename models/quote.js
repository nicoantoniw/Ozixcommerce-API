const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const quoteSchema = new Schema({
    number: {
        type: Number,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
        required: false
    },
    description: {
        type: String
    },
    shippingAddress: {
        street: {
            type: String,
            default: ''
        },
        city: {
            type: String,
            default: ''
        },
        state: {
            type: String,
            default: ''
        },
        zip: {
            type: String,
            default: ''
        }
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
            taxable: {
                type: String,

            },
            price: {
                type: Number,
                required: true
            },
            taxes: {
                type: Number,
                required: true
            }
        }
    ],
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    createdAt: {
        type: Date
    },
    dueDate: {
        type: Date
    },
    type: {
        type: String,
        default: 'Quote'
    },
});

module.exports = mongoose.model('Quote', quoteSchema);

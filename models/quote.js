const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const quoteSchema = new Schema({
    number: {
        type: Number,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Person',
        required: false
    },
    description: {
        type: String
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
            price: {
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
    }
});

module.exports = mongoose.model('Quote', quoteSchema);

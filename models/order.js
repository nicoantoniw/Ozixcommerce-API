const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    number: {
        type: Number,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Person',
        required: true
    },
    description: {
        type: String
    },
    deliveryDate: {
        type: Date
    },
    total: {
        type: Number,
        required: true
    },
    deposit: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'activo',
        required: true
    },
    details: [
        {
            product: {
                type: String
            },
            quantity: {
                type: Number
            }
        }
    ],
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

module.exports = mongoose.model('Order', orderSchema);

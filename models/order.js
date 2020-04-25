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
            aggregateDiscount: {
                type: Number,
                required: true,
                default: 0
            },
            product: {
                type: String
            },
            quantity: {
                type: Number
            },
            price: {
                type: Number,
                required: true
            },
            totalIva: {
                type: Number,
                required: true
            },
            subtotal: {
                type: Number,
                required: true
            },

        }
    ],
    bi10: { type: Number, required: false },
    iva10: { type: Number, required: false },
    bi21: { type: Number, required: false },
    iva21: { type: Number, required: false },
    bi27: { type: Number, required: false },
    iva27: { type: Number, required: false },
    totalNoIva: { type: Number, required: false },
    totalIva: { type: Number, required: false },
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

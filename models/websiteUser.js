const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const websiteUserSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    idNumber: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: false
    },
    province: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    },
    zip: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    name: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: true
    },
    cart: {
        items: [
            {
                product: {
                    type: Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                variant: { type: String },
                quantity: { type: Number, required: true },
                name: { type: String, required: true },
                image: { type: String, required: false },
                price: {
                    type: Number,
                    required: true
                }
            }
        ],
        total: {
            type: Number,
            required: true
        }
    },
    lastOrder: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    clientId: {
        type: Schema.Types.ObjectId,
        ref: 'Person',
        required: false
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    status: {
        type: String,
        default: 'active',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('WebsiteUser', websiteUserSchema);
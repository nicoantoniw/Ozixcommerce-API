const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountSchema = new Schema({
    name: {
        type: String
    },
    balance: {
        type: Number,
        default: 0
    },
    cuit: {
        type: Number,
        required: true
    },
    province: {
        type: String
    },
    city: {
        type: String
    },
    streetAddress: {
        type: String
    },
    zip: {
        type: String
    },
    apartment: {
        type: String
    },
    category: {
        type: String
    },
    personeria: {
        type: String
    },
    activitiesDate: {
        type: String
    },
    socialName: {
        type: String
    },
    brutosNumber: {
        type: String
    },
    salePoint: {
        type: String
    },
    movements: [
        {
            type: {
                type: String
            },
            date: {
                type: Date
            },
            description: {
                type: String
            },
            amount: {
                type: Number
            },
            sale: {
                type: Schema.Types.ObjectId,
                ref: 'Sale',
                required: false
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

module.exports = mongoose.model('Account', accountSchema);

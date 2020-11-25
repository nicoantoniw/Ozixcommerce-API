const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountSchema = new Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    balance: {
        type: Number,
        default: 0
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
            payment: {
                type: Schema.Types.ObjectId,
                ref: 'Payment',
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

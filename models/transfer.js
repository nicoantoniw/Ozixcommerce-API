const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transferSchema = new Schema({
    description: {
        type: String
    },
    origin: {
        type: Schema.Types.ObjectId,
        ref: 'Location',
    },
    destination: {
        type: Schema.Types.ObjectId,
        ref: 'Location',
    },
    status: {
        type: String,
        default: 'pending'
    },
    items: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product'
            },
            quantity: {
                type: Number
            },
        }
    ],
    dateDispatched: {
        type: Date
    },
    dateReceived: {
        type: Date
    },
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

module.exports = mongoose.model('Transfer', transferSchema);

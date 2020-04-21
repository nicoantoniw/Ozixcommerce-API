const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cashSchema = new Schema({
    name: {
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

module.exports = mongoose.model('Cash', cashSchema);

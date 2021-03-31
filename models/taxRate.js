const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const taxRateSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    rate: {
        type: Number,
        default: 0
    },
    rates: [
        {
            rateName: {
                type: String,
                required: false
            },
            rateNumber: {
                type: Number,
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

module.exports = mongoose.model('TaxRate', taxRateSchema);
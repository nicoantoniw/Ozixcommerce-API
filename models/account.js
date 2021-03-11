const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountSchema = new Schema({
    name: {
        type: String
    },
    type: {
        type: String,
        enum: ['Current Asset', 'Fixed Asset', 'Non-current Asset', 'Accounts receivable (A/R)', 'Inventory', 'Equity', 'Accounts payable (A/P)', 'Expense', 'Current liability', 'Liability', 'Non-current Liability', 'Sales', 'Other Income', 'Cost of Sales']
    },
    code: {
        type: Number
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
            transaction: {
                type: Schema.Types.ObjectId,
                refPath: 'transactionRef',
                required: true
            },
            transactionRef: {
                type: String,
                enum: ['Payment', 'Bill', 'Invoice', 'Expense', 'AccountTransfer', 'CreditNote', 'DebitNote'],
                required: true
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

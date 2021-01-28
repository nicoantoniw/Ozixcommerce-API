const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountAccountTransferSchema = new Schema({
    reference: {
        type: String
    },
    fromAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    toAccount: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    amount: {
        type: Number
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    createdAt: {
        type: Date,
    }
});

module.exports = mongoose.model('AccountTransfer', accountAccountTransferSchema);

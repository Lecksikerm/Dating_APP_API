const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    participantsHash: {
        type: String,
        required: true
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageText: String,
    lastMessageAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});


conversationSchema.pre('validate', function (next) {
    if (!Array.isArray(this.participants) || this.participants.length !== 2) {
        return next();
    }

    const sortedIds = this.participants
        .map((participant) => participant.toString())
        .sort();

    this.participants = sortedIds;
    this.participantsHash = sortedIds.join('_');
    next();
});

conversationSchema.index({ participantsHash: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
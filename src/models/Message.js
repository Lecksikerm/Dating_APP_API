const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        trim: true
    },
    image: {
        type: String
    },
    voice: {
        type: String
    },
    attachmentUrl: {
        type: String,
        default: ''
    },
    attachmentType: {
        type: String,
        enum: ['image', 'video', 'document', ''],
        default: ''
    },
    attachmentName: {
        type: String,
        default: ''
    },
    attachmentSize: {
        type: Number,
        default: 0
    },
    duration: {
        type: String,
        default: ''
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date,
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sticker: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20
        },
        reactedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isDelivered: {
        type: Boolean,
        default: false
    },
    deliveredAt: Date,
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: Date
}, {
    timestamps: true
});


messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  socketId: {
    type: String,
    required: false
  },
  room: {
    type: String,
    default: 'general'
  }
}, {
  timestamps: true
});

// Índices para mejor performance
chatMessageSchema.index({ createdAt: -1 });
chatMessageSchema.index({ userId: 1 });
chatMessageSchema.index({ room: 1 });

// Método para formatear mensaje para el cliente
chatMessageSchema.methods.toClientFormat = function() {
  return {
    id: this._id,
    username: this.username,
    message: this.message,
    timestamp: this.createdAt,
    userRole: this.userRole,
    type: 'user'
  };
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
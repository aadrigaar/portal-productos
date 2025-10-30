const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Hash password antes de guardar - CORREGIDO
userSchema.pre('save', async function(next) {
  // Solo hacer hash si la contraseña fue modificada
  if (!this.isModified('password')) return next();
  
  console.log('🔐 Hasheando contraseña para:', this.username);
  
  // Hacer admin automáticamente al usuario 'admin' - CORREGIDO
  if (this.username.toLowerCase() === 'admin' || this.email.toLowerCase() === 'admin@admin.com') {
    this.role = 'admin';
    console.log('✅ Usuario admin detectado:', this.username);
  }
  
  try {
    // Hash de la contraseña con salt rounds 12
    this.password = await bcrypt.hash(this.password, 12);
    console.log('✅ Contraseña hasheada correctamente');
    next();
  } catch (error) {
    console.error('❌ Error hasheando contraseña:', error);
    next(error);
  }
});

// Método para comparar passwords - CORREGIDO
userSchema.methods.correctPassword = async function(candidatePassword) {
  try {
    console.log('🔐 Comparando contraseñas para:', this.username);
    
    if (!candidatePassword) {
      console.log('❌ No se proporcionó contraseña para comparar');
      return false;
    }
    
    if (!this.password) {
      console.log('❌ No hay contraseña almacenada para comparar');
      return false;
    }
    
    // Verificar que el hash tenga el formato correcto
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      console.log('❌ Formato de hash inválido:', this.password.substring(0, 10) + '...');
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔐 Resultado comparación para', this.username + ':', isMatch);
    
    return isMatch;
  } catch (error) {
    console.error('❌ Error comparando contraseñas:', error);
    return false;
  }
};

// Método para convertir a JSON (eliminar password)
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Índices para mejor performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
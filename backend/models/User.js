const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Por favor, insira um email válido']
  },
  password: {
    type: String,
    minlength: 6, 
    required: function() {
      return !this.googleId && !this.firebaseUid;
    }
  },
  stripeAccountId: { 
    type: String, 
    default: null,
    select: false // Por segurança, não retorna no frontend a menos que solicitado
  },
  stripeOnboardingComplete: {
    type: Boolean,
    default: false
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  firebaseUid: { 
    type: String,
    unique: true,
    sparse: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  coverPicture: {
    type: String,
    default: null
  },
  favoritedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  bio: {
      type: String,
      default: ''
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Campos de recuperação de senha
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
});

// Middleware para criptografar a senha antes de salvar
UserSchema.pre('save', async function(next) {
  // Só criptografa se a senha foi modificada E se ela existe (para evitar erro no Google Login)
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Método auxiliar para comparar senhas
UserSchema.methods.matchPassword = async function(enteredPassword) {
    // Se o usuário não tem senha (login social), retorna falso
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
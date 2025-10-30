const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Buscar usuario en la base de datos para verificar rol actualizado
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role // Usar el rol actualizado de la base de datos
    };
    
    console.log(`🔐 Usuario autenticado: ${user.username} (${user.role})`);
    next();
  } catch (error) {
    console.error('❌ Error de autenticación:', error);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('❌ Socket sin token de autenticación');
      return next(new Error('Token de autenticación requerido'));
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Usuario no encontrado'));
    }

    socket.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    console.log(`🔐 Socket autenticado: ${user.username} (${user.role})`);
    next();
  } catch (error) {
    console.error('❌ Error autenticando socket:', error);
    next(new Error('Token inválido'));
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    console.log(`🚫 Acceso denegado: ${req.user.username} intentó acceder a recurso admin`);
    return res.status(403).json({ 
      error: 'Se requieren permisos de administrador',
      currentRole: req.user.role,
      requiredRole: 'admin'
    });
  }
  console.log(`👑 Acceso admin permitido: ${req.user.username}`);
  next();
};

module.exports = {
  authenticateJWT,
  authenticateSocket,
  requireAdmin
};
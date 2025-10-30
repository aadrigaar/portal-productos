const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('📝 Intentando registrar usuario:', { username, email });

    // Validaciones básicas
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'El formato del email no es válido' 
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'El usuario o email ya están registrados' 
      });
    }

    // Crear nuevo usuario
    const user = new User({ 
      username, 
      email, 
      password 
    });

    await user.save();
    console.log('✅ Usuario registrado:', user.username, 'Rol:', user.role);

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor en el registro' 
    });
  }
});

// Login de usuario - CORREGIDO
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Intentando login:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar password - CORREGIDO
    console.log('🔐 Verificando contraseña para usuario:', user.username);
    
    const isPasswordValid = await user.correctPassword(password);
    console.log('🔐 Resultado verificación:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    console.log('✅ Login exitoso:', user.username, 'Rol:', user.role);

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor en el login' 
    });
  }
});

// Verificar token
router.get('/verify', authenticateJWT, async (req, res) => {
  try {
    // Buscar usuario actualizado en la base de datos
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

// Obtener perfil de usuario
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

// Endpoint para debug - ver todos los usuarios (solo desarrollo)
router.get('/debug-users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    console.log('👥 Usuarios en la base de datos:', users);
    res.json({ users });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

module.exports = router;
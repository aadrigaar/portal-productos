console.log('🚀 Iniciando servidor Portal de Productos (Versión Completa + GraphQL)...');

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors'); // Necesario para GraphQL
require('dotenv').config();

// --- DEPENDENCIAS GRAPHQL (NUEVO) ---
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
// Importamos el plugin para el Sandbox
const { ApolloServerPluginLandingPageLocalDefault } = require('@apollo/server/plugin/landingPage/default');

const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const jwt = require('jsonwebtoken'); // Para contexto GraphQL

const app = express();
const server = http.createServer(app);

// Configuración de Socket.IO con CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Configuración
const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-productos',
  JWT_SECRET: process.env.JWT_SECRET || 'clave-secreta-temporal'
};

// Conectar a MongoDB
console.log('🔗 Conectando a MongoDB...');
mongoose.connect(config.MONGODB_URI)
.then(() => {
  console.log('✅ Conectado a MongoDB');
})
.catch((err) => {
  console.log('⚠️  Error MongoDB:', err.message);
});

// Importar modelos
require('./models/User');
require('./models/Product');
require('./models/ChatMessage');
require('./models/Order'); // --- NUEVO: Modelo de Pedidos

// Importar middleware
const { authenticateJWT, authenticateSocket, requireAdmin } = require('./middleware/authenticateJWT');

// ====================================================================
//  INICIO ASÍNCRONO DEL SERVIDOR (Necesario para GraphQL)
// ====================================================================
async function startServer() {

  // 1. INICIAR APOLLO SERVER (MODIFICADO PARA PRODUCCIÓN)
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // PERMITE VER EL ESQUEMA EN PRODUCCIÓN
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({ embed: true }) // ACTIVA EL SANDBOX
    ]
  });
  await apolloServer.start();

  // 2. MIDDLEWARES GLOBALES
  app.use(cors()); // Habilitar CORS
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  // 3. ENDPOINT GRAPHQL (NUEVO)
  app.use('/graphql', expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      const token = req.headers.authorization || '';
      if (token.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(token.split(' ')[1], config.JWT_SECRET);
          return { user: decoded };
        } catch (e) { return { user: null }; }
      }
      return { user: null };
    },
  }));

  // 4. RUTAS REST (TUS RUTAS ORIGINALES)
  try {
    const authRoutes = require('./routes/authRoutes');
    const productRoutes = require('./routes/productRoutes');
    const chatRoutes = require('./routes/chatRoutes');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/chat', chatRoutes);

    // --- NUEVO: RUTA DE USUARIOS PARA ADMIN ---
    try {
        const userRoutes = require('./routes/userRoutes');
        app.use('/api/users', userRoutes);
        console.log('✅ Ruta de Usuarios (Admin) cargada');
    } catch (e) { console.log('⚠️ Ruta de usuarios no creada aún'); }

    console.log('✅ Rutas de API cargadas correctamente');
  } catch (error) {
    console.log('❌ Error cargando rutas:', error.message);
    
    // Ruta de productos de FALLBACK que siempre funciona
    app.get('/api/products', (req, res) => {
      console.log('📦 Sirviendo productos de fallback...');
      res.json([
        {
          _id: '1',
          name: 'Laptop Gaming Pro',
          description: 'Laptop de alto rendimiento para gaming y trabajo intensivo',
          price: 1499.99,
          category: 'Electrónicos',
          stock: 10,
          createdBy: { username: 'Sistema' }
        },
        // ... (resto de tus productos fallback)
      ]);
    });
  }

  // Ruta adicional para crear productos de ejemplo (solo admin)
  app.post('/api/products/create-examples', authenticateJWT, requireAdmin, async (req, res) => {
    try {
      const Product = require('./models/Product');
      
      const exampleProducts = [
        {
          name: 'Laptop Gaming Pro',
          description: 'Laptop de alto rendimiento para gaming y trabajo intensivo',
          price: 1499.99,
          category: 'Electrónicos',
          stock: 10,
          createdBy: req.user.userId
        },
        {
          name: 'Smartphone Flagship',
          description: 'Teléfono inteligente con cámara profesional y pantalla AMOLED',
          price: 899.99,
          category: 'Electrónicos',
          stock: 25,
          createdBy: req.user.userId
        },
        {
          name: 'Auriculares Bluetooth',
          description: 'Auriculares inalámbricos con cancelación de ruido activa',
          price: 249.99,
          category: 'Audio',
          stock: 15,
          createdBy: req.user.userId
        }
      ];

      await Product.deleteMany({}); // Limpiar productos existentes
      const products = await Product.insertMany(exampleProducts);
      await Product.populate(products, { path: 'createdBy', select: 'username' });
      
      console.log(`✅ ${products.length} productos de ejemplo creados por ${req.user.username}`);
      res.json({ 
        message: `Se crearon ${products.length} productos de ejemplo`,
        products 
      });
    } catch (error) {
      console.error('❌ Error creando productos de ejemplo:', error);
      res.status(500).json({ error: 'Error creando productos de ejemplo' });
    }
  });

  // ==================== SISTEMA DE CHAT MEJORADO CON USUARIOS CONECTADOS ====================
  // (TU CÓDIGO ORIGINAL INTACTO)

  const ChatMessage = require('./models/ChatMessage');
  const connectedUsers = new Map();

  // Middleware de autenticación para sockets
  io.use(authenticateSocket);

  // Función para enviar lista de usuarios conectados a todos
  const broadcastConnectedUsers = () => {
      const usersList = Array.from(connectedUsers.values()).map(user => ({
          username: user.username,
          role: user.role,
          connectedAt: user.connectedAt
      }));
      
      io.emit('usersOnline', {
          count: connectedUsers.size,
          users: usersList
      });
      
      console.log(`👥 Usuarios conectados: ${connectedUsers.size} - ${usersList.map(u => u.username).join(', ')}`);
  };

  // Manejo de conexiones de chat
  io.on('connection', (socket) => {
    console.log('✅ Nueva conexión al chat:', socket.user.username);

    // Agregar usuario a la lista de conectados
    connectedUsers.set(socket.id, {
      username: socket.user.username,
      role: socket.user.role,
      connectedAt: new Date(),
      socketId: socket.id
    });

    // Enviar historial de mensajes al nuevo usuario
    const sendChatHistory = async () => {
      try {
        const messages = await ChatMessage.find()
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        
        // Invertir para mostrar del más antiguo al más nuevo
        messages.reverse();
        
        socket.emit('chatHistory', messages);
        console.log(`📨 Enviado historial de ${messages.length} mensajes a ${socket.user.username}`);
      } catch (error) {
        console.error('❌ Error enviando historial:', error);
      }
    };

    // Mensaje de bienvenida personalizado
    socket.emit('newMessage', {
      id: Date.now(),
      username: 'Sistema',
      message: `¡Bienvenido al chat, ${socket.user.username}! Escribe un mensaje para comenzar.`,
      timestamp: new Date(),
      type: 'system'
    });

    // Notificar a todos que un usuario se conectó
    socket.broadcast.emit('newMessage', {
      id: Date.now(),
      username: 'Sistema',
      message: `${socket.user.username} se ha unido al chat`,
      timestamp: new Date(),
      type: 'system'
    });

    // Enviar lista actualizada de usuarios conectados
    broadcastConnectedUsers();

    // Enviar historial
    sendChatHistory();

    // Manejar nuevo mensaje
    socket.on('sendMessage', async (data) => {
      try {
        console.log('📨 Mensaje recibido:', { 
          from: socket.user.username, 
          message: data.message,
          socket: socket.id 
        });

        // Validar mensaje
        if (!data.message || data.message.trim() === '') {
          socket.emit('error', { message: 'El mensaje no puede estar vacío' });
          return;
        }

        if (data.message.length > 500) {
          socket.emit('error', { message: 'El mensaje es demasiado largo' });
          return;
        }

        // Crear y guardar mensaje
        const chatMessage = new ChatMessage({
          username: socket.user.username,
          message: data.message.trim(),
          userId: socket.user.userId,
          userRole: socket.user.role,
          socketId: socket.id
        });

        const savedMessage = await chatMessage.save();
        console.log('💾 Mensaje guardado en BD:', savedMessage._id);

        // Preparar mensaje para enviar a todos
        const messageToSend = {
          id: savedMessage._id,
          username: savedMessage.username,
          message: savedMessage.message,
          timestamp: savedMessage.createdAt,
          type: 'user',
          userRole: savedMessage.userRole
        };

        // Enviar a todos los clientes conectados
        io.emit('newMessage', messageToSend);
        console.log('📤 Mensaje enviado a todos los clientes');

      } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        socket.emit('error', { message: 'Error al enviar el mensaje' });
      }
    });

    // Manejar "usuario escribiendo"
    socket.on('userTyping', () => {
      socket.broadcast.emit('userTyping', {
        username: socket.user.username,
        isTyping: true
      });
    });

    // Manejar "usuario dejó de escribir"
    socket.on('userStoppedTyping', () => {
      socket.broadcast.emit('userStoppedTyping', {
        username: socket.user.username
      });
    });

    // Manejar desconexión
    socket.on('disconnect', (reason) => {
      console.log('❌ Usuario desconectado del chat:', socket.user.username, 'Razón:', reason);
      
      // Notificar a otros que el usuario se desconectó
      socket.broadcast.emit('newMessage', {
        id: Date.now(),
        username: 'Sistema',
        message: `${socket.user.username} ha abandonado el chat`,
        timestamp: new Date(),
        type: 'system'
      });

      // Remover usuario de la lista de conectados
      connectedUsers.delete(socket.id);
      
      // Actualizar lista de usuarios conectados
      broadcastConnectedUsers();
    });

    // Manejar errores del socket
    socket.on('error', (error) => {
      console.error('❌ Error en socket:', error);
    });
  });

  // ==================== RUTAS DEL SERVIDOR ====================

  // Ruta de salud
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'Portal de Productos - Servidor funcionando',
      graphql: '/graphql', // Info extra
      database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
      chat: {
        connectedUsers: connectedUsers.size,
        active: true
      },
      timestamp: new Date().toISOString()
    });
  });

  // Ruta para información del sistema
  app.get('/api/system-info', authenticateJWT, (req, res) => {
    res.json({
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      chat: {
        connectedUsers: connectedUsers.size,
        users: Array.from(connectedUsers.values())
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        name: mongoose.connection.name
      },
      user: req.user
    });
  });

  // Ruta PRINCIPAL - debe ir al final
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Iniciar servidor (AHORA DENTRO DEL ASYNC)
  server.listen(PORT, () => {
    console.log(`🎉 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`🚀 GraphQL Playground: http://localhost:${PORT}/graphql`);
    console.log(`🔐 Autenticación JWT activa`);
    console.log(`💬 Chat en tiempo real activo (Socket.IO con autenticación)`);
    console.log(`📦 API de productos disponible`);
    console.log(`🔍 Búsqueda de productos implementada`);
    console.log(`👥 Sistema de usuarios conectados activo`);
  });
}

// EJECUTAR ARRANQUE
startServer().catch(err => {
    console.error('❌ Error fatal al iniciar servidor:', err);
});

// Manejo de errores global
process.on('unhandledRejection', (err) => {
  console.error('❌ Promise rejection no manejado:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  process.exit(1);
});

// Exportar para testing
module.exports = { app, server, io };
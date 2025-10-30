const express = require('express');
const { authenticateJWT } = require('../middleware/authenticateJWT');
const ChatMessage = require('../models/ChatMessage');

const router = express.Router();

// Obtener historial de chat (solo usuarios autenticados)
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    console.log('📨 Obteniendo historial de chat:', { limit, offset });
    
    const messages = await ChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Invertir para tener los más antiguos primero
    messages.reverse();

    console.log(`✅ Enviando ${messages.length} mensajes del historial`);
    res.json({
      success: true,
      messages: messages,
      total: messages.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial de chat:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo historial de chat' 
    });
  }
});

// Obtener estadísticas del chat
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas del chat...');
    
    const totalMessages = await ChatMessage.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messagesToday = await ChatMessage.countDocuments({
      createdAt: { $gte: today }
    });

    const topUsers = await ChatMessage.aggregate([
      {
        $group: {
          _id: '$username',
          messageCount: { $sum: 1 },
          lastMessage: { $max: '$createdAt' }
        }
      },
      { $sort: { messageCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      stats: {
        totalMessages,
        messagesToday,
        topUsers
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo estadísticas' 
    });
  }
});

// Eliminar mensajes (solo admin)
router.delete('/messages/:id', authenticateJWT, async (req, res) => {
  try {
    const messageId = req.params.id;
    console.log(`🗑️  Eliminando mensaje: ${messageId}`);

    // Verificar permisos de admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Se requieren permisos de administrador'
      });
    }

    const deletedMessage = await ChatMessage.findByIdAndDelete(messageId);
    
    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        error: 'Mensaje no encontrado'
      });
    }

    console.log('✅ Mensaje eliminado:', deletedMessage._id);
    res.json({
      success: true,
      message: 'Mensaje eliminado exitosamente',
      deletedMessage: {
        id: deletedMessage._id,
        username: deletedMessage.username
      }
    });
  } catch (error) {
    console.error('❌ Error eliminando mensaje:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error eliminando mensaje' 
    });
  }
});

// Limpiar historial de chat (solo admin)
router.delete('/clear-history', authenticateJWT, async (req, res) => {
  try {
    // Verificar permisos de admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Se requieren permisos de administrador'
      });
    }

    console.log('🧹 Limpiando historial de chat...');
    
    const result = await ChatMessage.deleteMany({});
    
    console.log(`✅ Historial limpiado: ${result.deletedCount} mensajes eliminados`);
    res.json({
      success: true,
      message: `Historial de chat limpiado (${result.deletedCount} mensajes eliminados)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Error limpiando historial:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error limpiando historial de chat' 
    });
  }
});

module.exports = router;
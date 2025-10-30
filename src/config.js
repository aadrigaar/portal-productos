require('dotenv').config();

const config = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-productos',
  JWT_SECRET: process.env.JWT_SECRET || 'clave-secreta-por-defecto-cambiar-en-produccion',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

// Validar variables críticas en producción
if (config.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('cambiar-en-produccion')) {
    console.error('❌ ERROR: JWT_SECRET debe estar configurado en producción');
    process.exit(1);
  }
  
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
    console.error('❌ ERROR: MONGODB_URI debe apuntar a MongoDB Atlas en producción');
    process.exit(1);
  }
}

console.log('🔧 Configuración cargada:', {
  PORT: config.PORT,
  MONGODB_URI: config.MONGODB_URI ? '✅ Configurada' : '❌ No configurada',
  JWT_SECRET: config.JWT_SECRET ? '✅ Configurada' : '❌ No configurada',
  NODE_ENV: config.NODE_ENV
});

module.exports = config;
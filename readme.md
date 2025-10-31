# Portal de Productos - Práctica 1

## Descripción
Aplicación web completa con autenticación, gestión de productos y chat en tiempo real.

**Demo:** https://portal-productos.onrender.com

## Características

### Funcionalidades Principales
- ✅ **Registro y login** con JWT
- ✅ **Roles de usuario**: User (ver productos) y Admin (CRUD completo)
- ✅ **CRUD de productos**: Crear, editar, eliminar (solo admin)
- ✅ **Chat en tiempo real** con Socket.IO
- ✅ **Búsqueda y filtros** de productos
- ✅ **Base de datos MongoDB** con persistencia

### Funcionalidades Extra
- 👥 **Usuarios conectados** en el chat
- 💾 **Historial persistente** de mensajes
- 🔍 **Búsqueda avanzada** con múltiples filtros
- ☁️ **Despliegue en la nube** (Render + MongoDB Atlas)

## Tecnologías
- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express
- **Base de datos**: MongoDB, Mongoose
- **Autenticación**: JWT, bcryptjs
- **Tiempo real**: Socket.IO

## Instalación Local

### 1. Clonar y instalar
- git clone <repositorio>
- cd portal-productos
- npm install

### Configurar Variables de Entorno
- MONGODB_URI=mongodb://localhost:27017/portal-productos
- JWT_SECRET=clave-secreta-local

### Ejecutar la Aplicación
- npm run dev

Abrir en el navegador: http://localhost:3000

---

# Usuarios de Prueba

## Administrador
- **Email:** admin123@gmail.com 
- **Contraseña:** admin123  
- **Permisos:** CRUD completo de productos

## Usuario Normal
- **Email:** cualquier email  
- **Contraseña:** cualquier contraseña  
- **Permisos:** Solo ver productos y usar el chat

# Cómo Probar la Aplicación

## 1. Autenticación
- Registrarse con cualquier email → Rol **user**
- Registrarse con **admin123@gmail.com** → Rol **admin** automático

## 2. Gestión de Productos
- Como **admin:** verás los botones *Agregar*, *Editar* y *Eliminar*
- Como **user:** solo podrás visualizar productos (sin botones CRUD)

# Chat en Tiempo Real

1. Inicia sesión para acceder al chat.  
2. Abre varias pestañas del navegador para comprobar la comunicación en tiempo real.  
3. Verás los usuarios conectados en la esquina superior derecha.  
4. Incluye:
   - Historial persistente de mensajes.
   - Indicador de "usuario escribiendo".

# Búsqueda de Productos

## Funcionalidades
- Buscar por **nombre** o **descripción**
- Filtrar por **categoría** y **precio**
- Ordenar por **nombre**, **precio** o **stock**

# Despliegue en Producción

## Hosting
- **Render.com** (despliegue automático con `git push`)

## Base de Datos
- **MongoDB Atlas y MongoDB Compass**

## URL de Producción
[https://portal-productos.onrender.com](https://portal-productos.onrender.com)


# 🎯 Decisiones de Desarrollo

## 1. Arquitectura SPA (Single Page Application)
**Decisión**: Implementar frontend como SPA en un solo archivo HTML con JavaScript vanilla.
**Razón**:

- Mejor experiencia de usuario sin recargas de página

- Mayor velocidad de desarrollo

- Fácil despliegue y mantenimiento

- Cumple con requisitos de aplicación moderna

## 2. Autenticación JWT en HTTP y WebSockets
**Decisión**: Implementar middleware JWT tanto para rutas Express como para conexiones Socket.IO.
**Razón**:

- Seguridad consistente en todas las capas de comunicación

- Prevención de acceso no autorizado al chat en tiempo real

- Validación de identidad uniforme en toda la aplicación

## 3. Detección Automática de Rol Admin
**Decisión**: Asignar rol admin automáticamente basado en email específico.
**Razón**:

- Simplificación del proceso de testing y demostración

- No requiere interfaz compleja de administración de usuarios

- Fácil verificación durante la evaluación

## 4. Persistencia Completa en MongoDB
**Decisión**: Guardar todos los datos (usuarios, productos, mensajes) en MongoDB.
**Razón**:

- Cumplimiento de requisito de persistencia

- Historial disponible permanentemente

- Escalabilidad para crecimiento futuro

## 5. Separación Clara de Responsabilidades
**Decisión**: Estructurar el proyecto en carpetas específicas (routes, models, middleware).
**Razón**:

- Código más mantenible y escalable

- Fácil comprensión de la arquitectura

- Mejores prácticas de desarrollo Node.js

## 6. Despliegue en Infraestructura Cloud
**Decisión**: Utilizar Render.com para hosting y MongoDB Atlas para base de datos.
**Razón**:

- Disponibilidad 24/7 de la aplicación

- Escalabilidad automática

- Backups y seguridad gestionados

- Deployment continuo con Git

# Información del Proyecto

**Autor:** Adrián García Arranz  
**Universidad Europea del Atlántico**  
**Fecha:** Noviembre 2025

## Enlaces
- **Demo:** [https://portal-productos.onrender.com](https://portal-productos.onrender.com)
- **Repositorio:** [https://github.com/aadrigaar/portal-productos](https://github.com/aadrigaar/portal-productos)





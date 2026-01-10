# Portal E-Commerce Full Stack - Práctica 1 y 2

## 📋 Descripción del Proyecto
Aplicación web completa desarrollada como práctica integradora final. Este proyecto evoluciona el **Portal de Productos** (Práctica 1) hacia un **E-commerce funcional** (Práctica 2), implementando una arquitectura híbrida que combina **REST API** para administración de usuarios, **GraphQL** para la gestión transaccional de pedidos y el catálogo, y **WebSockets** para comunicación en tiempo real.

**🌐 Demo en Vivo:** [https://portal-productos.onrender.com](https://portal-productos.onrender.com)

---

## Características

### 🚀 Nuevas Funcionalidades (Práctica 2: E-commerce & GraphQL)
- **🛒 Carrito de Compras Intuitivo**: Gestión de productos en cliente, persistencia local y cálculo de totales en tiempo real.
- **⚡ API GraphQL**: Implementación de Apollo Server para consultas eficientes de productos y gestión de pedidos (Queries y Mutations).
- **📦 Gestión de Pedidos (Admin)**: Panel para visualizar ventas, filtrar por estado (Pendiente/Completado) y ver el detalle de productos vendidos.
- **👥 Gestión de Usuarios (Admin)**: Panel para listar usuarios, modificar roles (ascender/degradar) y eliminar cuentas.
- **📜 Historial de Compras**: Los usuarios pueden ver sus pedidos anteriores con fecha, estado y desglose de items.
- **🔄 Checkout Simulado**: Conversión del carrito en una orden persistente en MongoDB mediante GraphQL.

### ✨ Funcionalidades Base (Práctica 1: Portal & Chat)
- **🔐 Autenticación JWT**: Sistema seguro de registro y login (Tokenizado).
- **💬 Chat en Tiempo Real**: Comunicación instantánea vía Socket.IO con historial persistente en base de datos.
- **📦 CRUD de Productos**: Crear, leer, actualizar y eliminar productos (Solo Admin).
- **👥 Usuarios Conectados**: Visualización en tiempo real de quién está online.
- **🔍 Búsqueda Avanzada**: Filtros dinámicos por categoría, precio y ordenación.

---

## Tecnologías
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla SPA - Single Page Application)
- **Backend**: Node.js, Express
- **API Híbrida**: REST (Express Router) + GraphQL (Apollo Server)
- **Base de datos**: MongoDB, Mongoose
- **Tiempo real**: Socket.IO
- **Seguridad**: JWT, bcryptjs

---

## 📁 Estructura del Proyecto

```bash
portal-productos/
├── src/
│   ├── graphql/           # [P2] Esquemas (TypeDefs) y Resolvers
│   ├── middleware/        # Autenticación JWT y validación de Roles
│   ├── models/            # Modelos Mongoose (User, Product, Order, Chat)
│   ├── public/            # Cliente SPA (HTML, CSS, JS)
│   ├── routes/            # Endpoints REST (Auth, Users, Products)
│   ├── server.js          # Servidor Principal (Express + Apollo + Socket.io)
│   └── config.js          # Configuración de variables
├── .env
├── package.json
└── README.md
```

## Instalación Local

### 1. Clonar e instalar
```bash
git clone <tu-repositorio>
cd portal-productos
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz con el siguiente contenido:
```env
MONGODB_URI=mongodb://localhost:27017/portal-productos
JWT_SECRET=clave-secreta-local
PORT=3000
```

### 3. Ejecutar la Aplicación

Modo desarrollo (con nodemon)
```
npm run dev
```

Modo producción
```
node src/server.js
```

- Web: http://localhost:3000

- Explorador GraphQL (Sandbox): http://localhost:3000/graphql

---

# Usuarios de Prueba

### Administrador
- **Usuario:** `admin`
- **Email:** `admin@admin.com`
- **Contraseña:** `123456`
- **Permisos:** CRUD Productos, Gestión de Usuarios, Gestión de Pedidos (Cambiar estados).

### Usuario Normal
- **Usuario:** `adrian`
- **Email:** `adrian@gmail.com`
- **Contraseña:** `adrian`
- **Permisos:** Comprar, Chat, Ver Historial personal.

---

# Cómo Probar la Aplicación

## 1. Flujo de Compra (Práctica 2)
1. Inicia sesión como **Usuario**.
2. Añade productos al **Carrito**.
3. Ve a la pestaña Carrito y pulsa **"Realizar Pedido"**.
4. Verifica que el carrito se vacía y el pedido aparece abajo en **"Mis Pedidos Anteriores"**.

## 2. Gestión de Admin (Práctica 2)
1. Inicia sesión como **Admin**.
2. Pestaña **"Pedidos"**: Filtra por estado y cambia un pedido de "Pendiente" a "Completado".
3. Pestaña **"Usuarios"**: Prueba a cambiar el rol de un usuario o eliminarlo.

## 3. Chat y Productos (Práctica 1)
1. Abre dos navegadores diferentes.
2. Prueba el **Chat en Tiempo Real** (verás el indicador de "escribiendo").
3. Como Admin, prueba a **Crear o Borrar** un producto del catálogo.

---

# 🎯 Decisiones de Desarrollo

## 1. Arquitectura Híbrida (REST + GraphQL)
**Decisión**: Se mantiene REST para la autenticación y gestión simple de usuarios, pero se integra GraphQL para el núcleo del E-commerce.
**Razón**: GraphQL es ideal para el checkout y el historial de pedidos, ya que permite recuperar datos anidados (Pedido -> Usuario -> Detalles del Producto) en una sola petición ("Query"), optimizando el rendimiento frente a múltiples llamadas REST.

## 2. Persistencia de "Snapshot" en Pedidos
**Decisión**: El modelo `Order` almacena una copia de los datos del producto (precio y nombre) en el momento de la compra.
**Razón**: Garantiza la integridad histórica de los datos. Si un producto cambia de precio o nombre en el futuro, los pedidos antiguos deben reflejar lo que el usuario pagó realmente en su momento.

## 3. Seguridad Unificada
**Decisión**: El middleware de autenticación JWT se reutiliza en las tres capas: Rutas REST, conexión de WebSockets y contexto de GraphQL.
**Razón**: Asegura que no existan brechas de seguridad; un usuario debe estar autenticado independientemente del protocolo que use para comunicarse con el servidor.

## 4. Frontend SPA (Single Page Application)
**Decisión**: Uso de Vanilla JS para manipular el DOM y mostrar/ocultar secciones sin recargar la página.
**Razón**: Ofrece una experiencia de usuario fluida y moderna, similar a una aplicación de escritorio, cumpliendo con los requisitos de interactividad del chat y el carrito.

---

# Información del Proyecto

**Autor:** Adrián García Arranz
**Universidad Europea del Atlántico**
**Asignatura:** Programación Web I
**Fecha:** Enero 2026

## Enlaces
- **Demo:** [https://portal-productos.onrender.com](https://portal-productos.onrender.com)
- **Repositorio:** [https://github.com/aadrigaar/portal-productos](https://github.com/aadrigaar/portal-productos)







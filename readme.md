# 🛍️ Portal de Productos

Una aplicación web completa para la gestión de productos con autenticación JWT, roles de usuario y chat en tiempo real.

## 🚀 Características

### ✅ Funcionalidades Implementadas
- **🔐 Autenticación JWT** - Sistema seguro de login/registro
- **👥 Roles de Usuario** - User (normal) y Admin (privilegiados)
- **📦 CRUD de Productos** - Crear, leer, actualizar y eliminar productos (solo admin)
- **💬 Chat en Tiempo Real** - Comunicación instantánea con Socket.IO
- **💾 Persistencia MongoDB** - Todos los datos se guardan en base de datos
- **🔄 Estado en Tiempo Real** - Indicador "usuario escribiendo..." en el chat
- **📱 Interfaz Responsive** - Diseño moderno y adaptable

### 🛠️ Tecnologías Utilizadas

| Capa | Tecnologías |
|------|-------------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend | Node.js, Express.js |
| Base de Datos | MongoDB con Mongoose |
| Tiempo Real | Socket.IO |
| Autenticación | JWT (JSON Web Tokens) |
| Estilos | CSS Personalizado (Responsive) |

## 📋 Requisitos del Sistema

- Node.js (v14 o superior)
- MongoDB (local o Atlas)
- Navegador web moderno

## 🛠️ Instalación y Configuración

### 1. Clonar o Descargar el Proyecto
```bash
git clone <url-del-repositorio>
cd portal-productos
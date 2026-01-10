const express = require('express');
const router = express.Router();
const User = require('../models/User');

// IMPORTANTE: Esto coincide con tu estructura de carpetas
const { authenticateJWT, requireAdmin } = require('../middleware/authenticateJWT');

// ==========================================
// MIDDLEWARE DE SEGURIDAD
// ==========================================
// Aplicamos seguridad a TODAS las rutas de este archivo.
// Solo los usuarios logueados (authenticateJWT) y con rol 'admin' (requireAdmin) pueden entrar aquí.
router.use(authenticateJWT, requireAdmin);

// 1. LISTAR TODOS LOS USUARIOS
// GET /api/users
router.get('/', async (req, res) => {
    try {
        // Buscamos todos los usuarios pero ocultamos la contraseña
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// 2. CAMBIAR ROL DE USUARIO (Requisito clave de la práctica)
// PUT /api/users/:id
router.put('/:id', async (req, res) => {
    try {
        const { role } = req.body;

        // Validamos que el rol sea uno permitido
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Rol no válido. Debe ser "user" o "admin".' });
        }

        // Actualizamos y devolvemos el usuario nuevo (sin password)
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { role }, 
            { new: true } // Esto hace que nos devuelva el objeto ya modificado
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el rol del usuario' });
    }
});

// 3. ELIMINAR USUARIO
// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        
        if (!deletedUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = router;
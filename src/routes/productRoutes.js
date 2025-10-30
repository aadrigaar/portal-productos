const express = require('express');
const Product = require('../models/Product');
const { authenticateJWT, requireAdmin } = require('../middleware/authenticateJWT');

const router = express.Router();

// Obtener todos los productos (público)
router.get('/', async (req, res) => {
  try {
    console.log('📦 Obteniendo todos los productos...');
    const products = await Product.find().populate('createdBy', 'username');
    console.log(`✅ Encontrados ${products.length} productos`);
    res.json(products);
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

// Buscar productos (público)
router.get('/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice } = req.query;
    
    console.log('🔍 Buscando productos:', { q, category, minPrice, maxPrice });

    // Construir filtro de búsqueda
    const filter = {};

    // Búsqueda por texto en nombre y descripción
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } }, // Búsqueda case insensitive
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Filtro por categoría
    if (category && category !== 'all') {
      filter.category = { $regex: category, $options: 'i' };
    }

    // Filtro por precio
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    console.log('🔍 Filtro aplicado:', filter);

    const products = await Product.find(filter).populate('createdBy', 'username');
    
    console.log(`✅ Encontrados ${products.length} productos`);
    res.json(products);

  } catch (error) {
    console.error('❌ Error buscando productos:', error);
    res.status(500).json({ error: 'Error buscando productos' });
  }
});

// Obtener un producto específico (público)
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`📦 Obteniendo producto: ${productId}`);
    
    const product = await Product.findById(productId).populate('createdBy', 'username');
    if (!product) {
      console.log('❌ Producto no encontrado:', productId);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    console.log('✅ Producto encontrado:', product.name);
    res.json(product);
  } catch (error) {
    console.error('❌ Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

// Crear producto (solo admin)
router.post('/', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;
    console.log('📦 Creando nuevo producto:', { name, category, price });

    // Validaciones
    if (!name || !description || !price || !category) {
      return res.status(400).json({ error: 'Nombre, descripción, precio y categoría son requeridos' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'El precio no puede ser negativo' });
    }

    if (stock && stock < 0) {
      return res.status(400).json({ error: 'El stock no puede ser negativo' });
    }

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      image: image || '',
      stock: stock ? parseInt(stock) : 0,
      createdBy: req.user.userId
    });

    await product.save();
    await product.populate('createdBy', 'username');

    console.log('✅ Producto creado exitosamente:', product.name);
    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Error creando producto:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Error creando producto' });
  }
});

// Actualizar producto (solo admin)
router.put('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;
    
    console.log(`📦 Actualizando producto: ${productId}`, updateData);

    // Validar precio si se proporciona
    if (updateData.price !== undefined && updateData.price < 0) {
      return res.status(400).json({ error: 'El precio no puede ser negativo' });
    }

    // Validar stock si se proporciona
    if (updateData.stock !== undefined && updateData.stock < 0) {
      return res.status(400).json({ error: 'El stock no puede ser negativo' });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('createdBy', 'username');

    if (!product) {
      console.log('❌ Producto no encontrado para actualizar:', productId);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    console.log('✅ Producto actualizado:', product.name);
    res.json(product);
  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

// Eliminar producto (solo admin)
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`📦 Eliminando producto: ${productId}`);

    const product = await Product.findByIdAndDelete(productId);
    
    if (!product) {
      console.log('❌ Producto no encontrado para eliminar:', productId);
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    console.log('✅ Producto eliminado:', product.name);
    res.json({ 
      message: 'Producto eliminado exitosamente',
      deletedProduct: {
        id: product._id,
        name: product.name
      }
    });
  } catch (error) {
    console.error('❌ Error eliminando producto:', error);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

// Endpoint para crear productos de ejemplo (solo desarrollo)
router.post('/seed-examples', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    console.log('🌱 Creando productos de ejemplo...');
    
    const exampleProducts = [
      {
        name: 'Laptop Gaming Pro',
        description: 'Laptop de alto rendimiento para gaming y trabajo intensivo',
        price: 1499.99,
        category: 'Electrónicos',
        stock: 10,
        image: 'https://via.placeholder.com/300x200?text=Laptop+Gaming'
      },
      {
        name: 'Smartphone Flagship',
        description: 'Teléfono inteligente con cámara profesional y pantalla AMOLED',
        price: 899.99,
        category: 'Electrónicos', 
        stock: 25,
        image: 'https://via.placeholder.com/300x200?text=Smartphone'
      },
      {
        name: 'Auriculares Bluetooth',
        description: 'Auriculares inalámbricos con cancelación de ruido activa',
        price: 249.99,
        category: 'Audio',
        stock: 15,
        image: 'https://via.placeholder.com/300x200?text=Auriculares'
      },
      {
        name: 'Tablet Digital',
        description: 'Tablet perfecta para diseño gráfico y productividad',
        price: 599.99,
        category: 'Electrónicos',
        stock: 8,
        image: 'https://via.placeholder.com/300x200?text=Tablet'
      },
      {
        name: 'Smartwatch Deportivo',
        description: 'Reloj inteligente con GPS y monitor de actividad física',
        price: 299.99,
        category: 'Wearables',
        stock: 20,
        image: 'https://via.placeholder.com/300x200?text=Smartwatch'
      }
    ];

    // Agregar createdBy a todos los productos
    const productsWithCreator = exampleProducts.map(product => ({
      ...product,
      createdBy: req.user.userId
    }));

    const createdProducts = await Product.insertMany(productsWithCreator);
    await Product.populate(createdProducts, { path: 'createdBy', select: 'username' });

    console.log(`✅ ${createdProducts.length} productos de ejemplo creados`);
    res.status(201).json({
      message: `Se crearon ${createdProducts.length} productos de ejemplo`,
      products: createdProducts
    });
  } catch (error) {
    console.error('❌ Error creando productos de ejemplo:', error);
    res.status(500).json({ error: 'Error creando productos de ejemplo' });
  }
});

module.exports = router;
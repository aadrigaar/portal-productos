const Product = require('../models/Product');
const Order = require('../models/Order');

const resolvers = {
  Query: {
    getProducts: async () => await Product.find(),
    getOrders: async (_, __, ctx) => {
      if (!ctx.user || ctx.user.role !== 'admin') throw new Error('No autorizado');
      return await Order.find().populate('user').populate('products.product');
    },
    getMyOrders: async (_, __, ctx) => {
      if (!ctx.user) throw new Error('No autenticado');
      return await Order.find({ user: ctx.user.userId }).populate('products.product').sort({createdAt: -1});
    }
  },
  Mutation: {
    createOrder: async (_, { products }, ctx) => {
      if (!ctx.user) throw new Error('Login requerido');
      let total = 0;
      const items = products.map(p => {
        total += p.price * p.quantity;
        return { product: p.productId, quantity: p.quantity, price: p.price };
      });
      const order = new Order({ user: ctx.user.userId, products: items, total, status: 'pending' });
      return await (await order.save()).populate('products.product');
    },
    updateOrderStatus: async (_, { orderId, status }, ctx) => {
      if (ctx.user.role !== 'admin') throw new Error('Solo admin');
      return await Order.findByIdAndUpdate(orderId, { status }, { new: true }).populate('user');
    }
  }
};
module.exports = resolvers;
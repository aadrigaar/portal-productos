const typeDefs = `#graphql
  type Product { id: ID!, name: String!, description: String, price: Float!, category: String, stock: Int, image: String }
  type OrderProduct { product: Product, quantity: Int!, price: Float!, name: String }
  type Order { id: ID!, user: User, products: [OrderProduct]!, total: Float!, status: String!, createdAt: String }
  type User { id: ID!, username: String!, email: String!, role: String! }
  
  input ProductInput { productId: ID!, quantity: Int!, price: Float! }

  type Query {
    getProducts: [Product]
    getOrders: [Order]
    getMyOrders: [Order]
  }

  type Mutation {
    createOrder(products: [ProductInput]!): Order
    updateOrderStatus(orderId: ID!, status: String!): Order
  }
`;
module.exports = typeDefs;
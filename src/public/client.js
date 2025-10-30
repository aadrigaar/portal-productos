class PortalProductos {
    constructor() {
        this.currentUser = null;
        this.socket = null;
        this.typingTimer = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadProducts();
        this.connectToChat();
    }

    setupEventListeners() {
        // Navegación
        document.getElementById('homeBtn').addEventListener('click', () => this.showSection('homeSection'));
        document.getElementById('productsBtn').addEventListener('click', () => this.showSection('productsSection'));
        document.getElementById('chatBtn').addEventListener('click', () => this.showSection('chatSection'));
        
        // Autenticación
        document.getElementById('loginBtn').addEventListener('click', () => this.showSection('loginSection'));
        document.getElementById('registerBtn').addEventListener('click', () => this.showSection('registerSection'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Formularios
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Productos
        document.getElementById('addProductBtn').addEventListener('click', () => this.showProductModal());
        document.getElementById('cancelProductBtn').addEventListener('click', () => this.hideProductModal());
        document.getElementById('productForm').addEventListener('submit', (e) => this.handleProductSubmit(e));
        
        // Chat
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('token');
        
        if (!token) {
            this.updateAuthUI(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateAuthUI(true);
            } else {
                localStorage.removeItem('token');
                this.updateAuthUI(false);
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            localStorage.removeItem('token');
            this.updateAuthUI(false);
        }
    }

    updateAuthUI(isAuthenticated) {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        const addProductBtn = document.getElementById('addProductBtn');
        const chatInput = document.getElementById('chatInput');
        const sendMessageBtn = document.getElementById('sendMessageBtn');

        if (isAuthenticated) {
            loginBtn.classList.add('hidden');
            registerBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            userInfo.textContent = `Hola, ${this.currentUser.username} (${this.currentUser.role})`;
            
            chatInput.disabled = false;
            chatInput.placeholder = 'Escribe tu mensaje...';
            sendMessageBtn.disabled = false;

            // Mostrar botón de agregar producto solo para admin
            if (this.currentUser.role === 'admin') {
                addProductBtn.classList.remove('hidden');
            } else {
                addProductBtn.classList.add('hidden');
            }

            this.loadProducts();
        } else {
            loginBtn.classList.remove('hidden');
            registerBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            userInfo.classList.add('hidden');
            addProductBtn.classList.add('hidden');
            
            chatInput.disabled = true;
            chatInput.placeholder = 'Inicia sesión para escribir...';
            sendMessageBtn.disabled = true;
            
            this.currentUser = null;
        }
    }

    showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Remover active de todos los botones
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        document.getElementById(sectionId).classList.remove('hidden');
        
        // Activar botón correspondiente
        const btnMap = {
            'homeSection': 'homeBtn',
            'productsSection': 'productsBtn',
            'chatSection': 'chatBtn'
        };
        
        if (btnMap[sectionId]) {
            document.getElementById(btnMap[sectionId]).classList.add('active');
        }

        // Cargar productos si es la sección de productos
        if (sectionId === 'productsSection') {
            this.loadProducts();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const messageEl = document.getElementById('loginMessage');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                this.updateAuthUI(true);
                this.showSection('homeSection');
                this.showMessage(messageEl, '✅ Login exitoso', 'success');
                document.getElementById('loginForm').reset();
                
                // Reconectar al chat con el nuevo usuario
                this.connectToChat();
            } else {
                this.showMessage(messageEl, `❌ ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(messageEl, '❌ Error de conexión', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const messageEl = document.getElementById('registerMessage');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(messageEl, '✅ Registro exitoso. Redirigiendo...', 'success');
                document.getElementById('registerForm').reset();
                
                // Auto-login después del registro
                setTimeout(() => {
                    this.handleLogin(e);
                }, 1500);
            } else {
                this.showMessage(messageEl, `❌ ${data.error}`, 'error');
            }
        } catch (error) {
            this.showMessage(messageEl, '❌ Error de conexión', 'error');
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        this.updateAuthUI(false);
        this.showSection('homeSection');
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        // Reconectar al chat como anónimo
        this.connectToChat();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            this.displayProducts(products);
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.displayProducts([]);
        }
    }

    displayProducts(products) {
        const productsList = document.getElementById('productsList');
        
        if (!products || products.length === 0) {
            productsList.innerHTML = '<p class="no-products">No hay productos disponibles.</p>';
            return;
        }

        productsList.innerHTML = products.map(product => `
            <div class="product-card">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">` : ''}
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <p class="price">$${product.price?.toFixed(2) || '0.00'}</p>
                <span class="category">${product.category}</span>
                <p><strong>Stock:</strong> ${product.stock || 0}</p>
                ${this.currentUser && this.currentUser.role === 'admin' ? `
                    <div class="product-actions">
                        <button class="btn-secondary" onclick="app.editProduct('${product._id}')">Editar</button>
                        <button class="btn-danger" onclick="app.deleteProduct('${product._id}')">Eliminar</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    showProductModal(product = null) {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            alert('Solo los administradores pueden gestionar productos');
            return;
        }

        const modal = document.getElementById('productModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('productForm');
        
        if (product) {
            title.textContent = 'Editar Producto';
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productStock').value = product.stock || '';
            document.getElementById('productImage').value = product.image || '';
            form.dataset.editId = product._id;
        } else {
            title.textContent = 'Agregar Producto';
            form.reset();
            delete form.dataset.editId;
        }
        
        modal.classList.remove('hidden');
    }

    hideProductModal() {
        document.getElementById('productModal').classList.add('hidden');
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            alert('No tienes permisos para esta acción');
            return;
        }

        const form = e.target;
        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value,
            stock: parseInt(document.getElementById('productStock').value),
            image: document.getElementById('productImage').value
        };

        const token = localStorage.getItem('token');
        const isEditing = form.dataset.editId;

        try {
            const url = isEditing ? `/api/products/${isEditing}` : '/api/products';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                this.hideProductModal();
                this.loadProducts();
                alert('✅ Producto guardado exitosamente');
            } else {
                const error = await response.json();
                alert('❌ Error: ' + error.error);
            }
        } catch (error) {
            alert('❌ Error de conexión');
        }
    }

    editProduct(productId) {
        // Implementación básica para editar
        this.showProductModal({ _id: productId });
    }

    deleteProduct(productId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            return;
        }

        const token = localStorage.getItem('token');

        fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                this.loadProducts();
                alert('✅ Producto eliminado');
            } else {
                alert('❌ Error eliminando producto');
            }
        })
        .catch(error => {
            alert('❌ Error de conexión');
        });
    }

    connectToChat() {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io();

        this.socket.on('connect', () => {
            console.log('✅ Conectado al chat');
        });

        this.socket.on('newMessage', (message) => {
            this.displayMessage(message);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Desconectado del chat');
        });
    }

    displayMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        
        const isOwnMessage = this.currentUser && message.username === this.currentUser.username;
        
        messageDiv.className = `chat-message ${isOwnMessage ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <div class="username">${message.username}</div>
            <div class="message-text">${message.message}</div>
            <div class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        this.scrollChatToBottom();
    }

    sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (message && this.socket) {
            this.socket.emit('sendMessage', { 
                message: message,
                username: this.currentUser ? this.currentUser.username : 'Anónimo'
            });
            chatInput.value = '';
        }
    }

    scrollChatToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showMessage(element, text, type) {
        element.textContent = text;
        element.className = `message ${type}`;
        
        setTimeout(() => {
            element.textContent = '';
            element.className = 'message';
        }, 5000);
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PortalProductos();
});
class PortalProductos {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.socket = null;
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.productsCache = []; 
        this.adminOrdersCache = []; // Caché para filtrar pedidos
        this.currentEditingId = null;
        this.typingTimer = null;
        this.isTyping = false;

        this.init();
    }

    init() {
        if (this.token) this.checkAuthStatus();
        else this.updateAuthUI(false);
        this.loadProducts();
        this.setupChatListeners();
    }

    setupChatListeners() {
        const input = document.getElementById('chatInput');
        if(input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            input.addEventListener('input', () => {
                if(!this.socket || !this.socket.connected) return;
                if(!this.isTyping) { this.isTyping = true; this.socket.emit('userTyping'); }
                clearTimeout(this.typingTimer);
                this.typingTimer = setTimeout(() => { this.isTyping = false; this.socket.emit('userStoppedTyping'); }, 1000);
            });
        }
    }

    async graphqlRequest(query, variables = {}) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify({ query, variables })
            });
            const result = await response.json();
            if (result.errors) throw new Error(result.errors[0].message);
            return result.data;
        } catch (error) { return null; }
    }

    showSection(sectionId) {
        const privateSections = ['productsSection', 'chatSection', 'cartSection', 'adminOrdersSection', 'adminUsersSection'];
        if (privateSections.includes(sectionId) && !this.currentUser) {
            alert("🔒 Debes iniciar sesión para acceder aquí.");
            this.showSection('loginSection');
            return;
        }

        document.querySelectorAll('.section').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        const section = document.getElementById(sectionId);
        if (section) { section.classList.remove('hidden'); section.classList.add('active'); }

        const btnIdMap = {
            'homeSection': 'homeBtn', 'productsSection': 'productsBtn', 
            'chatSection': 'chatBtn', 'cartSection': 'navCartBtn',
            'adminOrdersSection': 'navAdminOrders', 'adminUsersSection': 'navAdminUsers'
        };
        const btn = document.getElementById(btnIdMap[sectionId]);
        if(btn) btn.classList.add('active');

        if (sectionId === 'productsSection') this.loadProducts();
        if (sectionId === 'chatSection') this.connectToChat();
        if (sectionId === 'cartSection') { this.renderCart(); this.loadMyOrders(); }
        if (sectionId === 'adminOrdersSection') this.loadAdminOrders();
        if (sectionId === 'adminUsersSection') this.loadUsersREST();
    }

    updateAuthUI(isAuthenticated) {
        try {
            const el = {
                loginBtn: document.getElementById('loginBtn'),
                registerBtn: document.getElementById('registerBtn'),
                logoutBtn: document.getElementById('logoutBtn'),
                userInfo: document.getElementById('userInfo'),
                navCartBtn: document.getElementById('navCartBtn'),
                addProductBtn: document.getElementById('addProductBtn'),
                productsBtn: document.getElementById('productsBtn'),
                chatBtn: document.getElementById('chatBtn'),
                navAdminOrders: document.getElementById('navAdminOrders'),
                navAdminUsers: document.getElementById('navAdminUsers'),
                chatInput: document.getElementById('chatInput'),
                sendBtn: document.getElementById('sendMessageBtn')
            };

            if(el.loginBtn) el.loginBtn.classList.toggle('hidden', isAuthenticated);
            if(el.registerBtn) el.registerBtn.classList.toggle('hidden', isAuthenticated);
            if(el.logoutBtn) el.logoutBtn.classList.toggle('hidden', !isAuthenticated);
            if(el.productsBtn) el.productsBtn.classList.toggle('hidden', !isAuthenticated);
            if(el.chatBtn) el.chatBtn.classList.toggle('hidden', !isAuthenticated);

            const isAdmin = this.currentUser && this.currentUser.role === 'admin';
            
            if(el.navCartBtn) el.navCartBtn.classList.toggle('hidden', !isAuthenticated || isAdmin);
            if(el.navAdminOrders) el.navAdminOrders.classList.toggle('hidden', !isAdmin);
            if(el.navAdminUsers) el.navAdminUsers.classList.toggle('hidden', !isAdmin);
            if(el.addProductBtn) el.addProductBtn.classList.toggle('hidden', !isAdmin);

            if (isAuthenticated && this.currentUser) {
                if(el.userInfo) {
                    const badge = isAdmin ? 'ADMIN' : 'USER';
                    el.userInfo.innerHTML = `Hola, <b>${this.currentUser.username}</b> (${badge})`;
                    el.userInfo.classList.remove('hidden');
                }
                this.updateCartCount();
                if(el.chatInput) el.chatInput.disabled = false;
                if(el.sendBtn) el.sendBtn.disabled = false;
                this.connectToChat();
            } else {
                if(el.userInfo) el.userInfo.classList.add('hidden');
                if(el.chatInput) el.chatInput.disabled = true;
                if(el.sendBtn) el.sendBtn.disabled = true;
            }
        } catch (e) {}
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email, password})
            });
            const data = await res.json();
            
            if (res.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.currentUser = data.user;
                this.updateAuthUI(true);
                this.showSection('homeSection');
                document.getElementById('loginForm').reset();
                this.connectToChat(); 
            } else { alert(data.error); }
        } catch (err) { console.error(err); }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, email, password})
            });
            const data = await res.json();
            if (res.ok) {
                alert('Registro exitoso. Inicia sesión.');
                this.showSection('loginSection');
                document.getElementById('registerForm').reset();
            } else { alert(data.error); }
        } catch (err) { alert('Error conexión'); }
    }

    async checkAuthStatus() {
        if (!this.token) return;
        try {
            const res = await fetch('/api/auth/verify', { headers: { 'Authorization': `Bearer ${this.token}` }});
            if (res.ok) {
                const data = await res.json();
                this.currentUser = data.user;
                this.updateAuthUI(true);
            } else { this.logout(); }
        } catch (e) { this.logout(); }
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        if(this.socket) { this.socket.disconnect(); this.socket = null; }
        this.updateAuthUI(false);
        this.showSection('homeSection');
    }

    async loadProducts() {
        const query = `{ getProducts { id name description price category stock image } }`;
        const data = await this.graphqlRequest(query);
        if (data && data.getProducts) {
            this.productsCache = data.getProducts;
            this.filterProductsLocal();
        }
    }

    toggleFilters() {
        const grid = document.getElementById('filtersGrid');
        if (grid.classList.contains('hidden')) grid.classList.remove('hidden');
        else grid.classList.add('hidden');
    }

    filterProductsLocal() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const category = document.getElementById('filterCategory').value;
        const minPrice = parseFloat(document.getElementById('filterMinPrice').value) || 0;
        const maxPrice = parseFloat(document.getElementById('filterMaxPrice').value) || Infinity;
        const sortBy = document.getElementById('filterSort').value;

        let filtered = this.productsCache.filter(p => {
            const matchesText = p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search);
            const matchesCategory = category === 'all' || p.category === category;
            const matchesPrice = p.price >= minPrice && p.price <= maxPrice;
            return matchesText && matchesCategory && matchesPrice;
        });

        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'nameAsc': return a.name.localeCompare(b.name);
                case 'priceAsc': return a.price - b.price;
                default: return 0;
            }
        });

        const countDiv = document.getElementById('resultsCount');
        if(countDiv) countDiv.textContent = `Mostrando ${filtered.length} productos`;

        this.renderProducts(filtered);
    }

    renderProducts(products) {
        const container = document.getElementById('productsList');
        if (!container) return;
        if (!products.length) { container.innerHTML = '<div class="no-results" style="grid-column:1/-1;text-align:center; padding:2rem"><h3>No hay productos</h3></div>'; return; }

        const isAdmin = this.currentUser && this.currentUser.role === 'admin';

        container.innerHTML = products.map(p => `
            <div class="product-card">
                ${p.image ? `<img src="${p.image}" onerror="this.style.display='none'">` : ''}
                <h3>${p.name}</h3>
                <p class="description" style="color:#666; font-size:0.9rem">${p.description}</p>
                <div class="price">$${p.price.toFixed(2)}</div>
                <div style="margin: 10px 0;">
                    <span class="category">${p.category}</span>
                    <span class="category" style="background:#eee; padding:2px; font-size:0.8rem">Stock: ${p.stock}</span>
                </div>
                <div style="margin-top:1rem; display:flex; gap:10px;">
                    ${!isAdmin ? `<button class="btn-primary" onclick="app.addToCart('${p.id}', '${p.name}', ${p.price})">Añadir 🛒</button>` : ''}
                    ${isAdmin ? `
                        <button class="btn-secondary" onclick="app.editProductREST('${p.id}')">✏️</button>
                        <button class="btn-danger" onclick="app.deleteProductREST('${p.id}')">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    showProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        form.reset();

        if (product) {
            this.currentEditingId = product.id; 
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productImage').value = product.image || '';
        } else {
            this.currentEditingId = null;
        }
        modal.classList.remove('hidden');
    }

    hideProductModal() { document.getElementById('productModal').classList.add('hidden'); }

    async handleProductSubmit(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value,
            stock: parseInt(document.getElementById('productStock').value),
            image: document.getElementById('productImage').value
        };
        const method = this.currentEditingId ? 'PUT' : 'POST';
        const url = this.currentEditingId ? `/api/products/${this.currentEditingId}` : '/api/products';

        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}`},
            body: JSON.stringify(data)
        });

        if (res.ok) {
            this.hideProductModal();
            this.loadProducts();
            alert('✅ Guardado');
        } else { alert('Error al guardar'); }
    }

    async editProductREST(id) {
        let p = this.productsCache.find(x => x.id === id);
        if(!p) {
            const res = await fetch(`/api/products/${id}`);
            p = await res.json();
            if(p._id) p.id = p._id;
        }
        this.showProductModal(p);
    }

    async deleteProductREST(id) {
        if(!confirm('¿Borrar?')) return;
        await fetch(`/api/products/${id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${this.token}`} });
        this.loadProducts();
    }

    addToCart(id, name, price) {
        if (!this.currentUser) return;
        const existing = this.cart.find(i => i.id === id);
        if (existing) existing.quantity++;
        else this.cart.push({ id, name, price, quantity: 1 });
        this.saveCart();
        alert(`✅ ${name} añadido`);
    }

    removeFromCart(id) {
        this.cart = this.cart.filter(i => i.id !== id);
        this.saveCart();
        this.renderCart();
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
        this.updateCartCount();
    }

    updateCartCount() {
        const count = this.cart.reduce((a, b) => a + b.quantity, 0);
        const badge = document.getElementById('cartCount');
        if(badge) badge.textContent = count;
    }

    renderCart() {
        const div = document.getElementById('cartItemsContainer');
        const tot = document.getElementById('cartTotal');
        if (this.cart.length === 0) { div.innerHTML = '<p>Vacío</p>'; tot.textContent = '0.00'; return; }

        let total = 0;
        div.innerHTML = this.cart.map(item => {
            const sub = item.price * item.quantity;
            total += sub;
            return `<div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <div><b>${item.name}</b><br><small>$${item.price} x ${item.quantity}</small></div>
                <div style="text-align:right;">$${sub.toFixed(2)} <button class="btn-danger" style="padding:2px 6px; font-size:0.7rem; margin-left:10px" onclick="app.removeFromCart('${item.id}')">X</button></div>
            </div>`;
        }).join('');
        tot.textContent = total.toFixed(2);
    }

    async checkout() {
        if (this.cart.length === 0) return alert('Carrito vacío');
        const pInput = this.cart.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price }));
        const m = `mutation C($p: [ProductInput]!) { createOrder(products: $p) { id } }`;
        const data = await this.graphqlRequest(m, { p: pInput });
        if (data && data.createOrder) {
            alert(`🎉 Pedido realizado! ID: ${data.createOrder.id}`);
            this.cart = []; this.saveCart(); this.renderCart(); this.loadMyOrders();
        }
    }

    // --- SECCIÓN ACTUALIZADA: MIS PEDIDOS (CON FECHA Y DETALLE) ---
    async loadMyOrders() {
        // Pedimos también 'createdAt' y el detalle de productos
        const q = `{ getMyOrders { id total status createdAt products { quantity price product { name } } } }`;
        const data = await this.graphqlRequest(q);
        if (data && data.getMyOrders) {
            document.getElementById('myOrdersList').innerHTML = data.getMyOrders.map(o => {
                const date = new Date(parseInt(o.createdAt)).toLocaleString();
                // Construir lista de productos
                const itemsList = o.products.map(p => 
                    `<div><small>• ${p.quantity}x ${p.product?.name || 'Producto'} ($${p.price})</small></div>`
                ).join('');

                return `
                <div style="background:#f8f9fa; padding:15px; margin-bottom:10px; border-radius:8px; border-left: 4px solid #667eea;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <b>#${o.id.slice(-4)}</b> 
                        <span style="font-weight:bold">$${o.total}</span>
                    </div>
                    <div style="font-size:0.85rem; color:#666; margin-bottom:5px;">
                        ${date} | <span style="text-transform:uppercase; font-size:0.75rem; background:#eee; padding:2px 5px; border-radius:4px;">${o.status}</span>
                    </div>
                    <div style="border-top:1px solid #eee; padding-top:5px; margin-top:5px;">
                        ${itemsList}
                    </div>
                </div>
            `;
            }).join('');
        }
    }

    // --- SECCIÓN ACTUALIZADA: ADMIN PEDIDOS (CON FECHA Y DETALLE) ---
    async loadAdminOrders(filter = 'all') {
        // Pedimos también 'createdAt' y el detalle de productos
        const q = `{ getOrders { id total status createdAt user { username } products { quantity price product { name } } } }`;
        const data = await this.graphqlRequest(q);
        if (data) {
            this.adminOrdersCache = data.getOrders; // Guardamos cache
            this.renderAdminOrders(filter);
        }
    }

    filterAdminOrders(status) {
        this.renderAdminOrders(status);
    }

    renderAdminOrders(filter) {
        const container = document.getElementById('adminOrdersList');
        if (!container) return;

        let orders = this.adminOrdersCache;
        if (filter !== 'all') {
            orders = orders.filter(o => o.status === filter);
        }

        container.innerHTML = orders.map(o => {
            const date = new Date(parseInt(o.createdAt)).toLocaleString();
            // Construir lista de productos
            const productsList = o.products.map(p => 
                `<div style="font-size:0.85rem; color:#555; margin-left:10px;">• ${p.quantity}x ${p.product?.name || 'Producto'} ($${p.price})</div>`
            ).join('');

            return `
            <div style="padding:15px; border:1px solid #eee; margin-bottom:10px; border-left:4px solid #667eea; background:white; border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <div>
                        User: <b>${o.user?.username || 'Desconocido'}</b> <br>
                        <span style="font-size:0.8rem; color:#888;">${date}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:bold; font-size:1.1rem">$${o.total}</div>
                        <select style="margin-top:2px; padding:2px; font-size:0.8rem;" onchange="app.updateOrderStatus('${o.id}', this.value)">
                            <option value="pending" ${o.status==='pending'?'selected':''}>⏳ Pendiente</option>
                            <option value="completed" ${o.status==='completed'?'selected':''}>✅ Completado</option>
                            <option value="cancelled" ${o.status==='cancelled'?'selected':''}>❌ Cancelado</option>
                        </select>
                    </div>
                </div>
                
                <div style="border-top:1px solid #eee; padding-top:5px; margin-top:5px;">
                    <small>Productos:</small>
                    ${productsList}
                </div>
            </div>
        `}).join('');
    }

    async updateOrderStatus(id, st) {
        const m = `mutation U($id: ID!, $st: String!) { updateOrderStatus(orderId: $id, status: $st) { id } }`;
        await this.graphqlRequest(m, { id, st });
        this.loadAdminOrders(); 
    }

    async loadUsersREST() {
        const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${this.token}` }});
        const users = await res.json();
        document.getElementById('usersList').innerHTML = users.map(u => `
            <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-weight:bold">${u.username}</span> 
                    <span style="background:${u.role==='admin'?'#fee2e2':'#d1fae5'}; padding:2px 6px; border-radius:10px; font-size:0.8rem">${u.role}</span>
                </div>
                ${u.role !== 'admin' || u.username !== this.currentUser.username ? `
                    <div>
                        <button class="btn-secondary" style="font-size:0.8rem; padding:4px 8px;" onclick="app.toggleUserRole('${u._id}', '${u.role}')">Cambiar Rol</button>
                        ${u.role !== 'admin' ? `<button class="btn-danger" style="font-size:0.8rem; padding:4px 8px;" onclick="app.deleteUser('${u._id}')">X</button>` : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async toggleUserRole(id, currentRole) {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if(!confirm(`¿Cambiar rol a ${newRole}?`)) return;
        
        await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
            body: JSON.stringify({ role: newRole })
        });
        this.loadUsersREST();
    }

    async deleteUser(id) {
        if(!confirm('¿Eliminar usuario?')) return;
        await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${this.token}` }});
        this.loadUsersREST();
    }

    // --- CHAT ---
    connectToChat() {
        if (this.socket && this.socket.connected) return;
        if (!this.token) return;
        if (this.socket) this.socket.disconnect();

        this.socket = io('/', { auth: { token: this.token }, reconnection: true });
        
        this.socket.on('connect', () => {
            const msgs = document.getElementById('chatMessages');
            if(msgs && msgs.textContent.includes('Conectando')) msgs.innerHTML = '';
            document.getElementById('chatInput').disabled = false;
            document.getElementById('sendMessageBtn').disabled = false;
        });

        this.socket.on('connect_error', () => {
            document.getElementById('chatMessages').innerHTML = '<div style="color:red; text-align:center">Error de conexión</div>';
        });

        this.socket.on('chatHistory', msgs => {
            const div = document.getElementById('chatMessages');
            if(div) {
                div.innerHTML = '';
                msgs.forEach(m => this.appendMessage(m));
            }
        });
        
        this.socket.on('newMessage', m => this.appendMessage(m));
        
        this.socket.on('usersOnline', d => {
            document.getElementById('onlineCount').textContent = d.count;
            const list = document.getElementById('usersOnlineList');
            if(list) {
                list.innerHTML = d.users.map(u => `
                    <li class="online-user">
                        <span class="online-dot"></span>${u.username}
                    </li>`).join('');
            }
        });
        
        this.socket.on('userTyping', d => {
            const ind = document.getElementById('typingIndicator');
            ind.innerText = `${d.username} escribe...`;
            ind.classList.remove('hidden');
        });
        
        this.socket.on('userStoppedTyping', () => document.getElementById('typingIndicator').classList.add('hidden'));

        const input = document.getElementById('chatInput');
        if(input) {
            input.addEventListener('input', () => {
                if(!this.isTyping) { this.isTyping = true; this.socket.emit('userTyping'); }
                clearTimeout(this.typingTimer);
                this.typingTimer = setTimeout(() => { this.isTyping = false; this.socket.emit('userStoppedTyping'); }, 1000);
            });
        }
    }

    sendMessage() {
        const inp = document.getElementById('chatInput');
        if(inp.value.trim()) {
            this.socket.emit('sendMessage', { message: inp.value });
            inp.value = '';
            this.socket.emit('userStoppedTyping');
            inp.focus(); 
        }
    }

    appendMessage(msg) {
        const div = document.getElementById('chatMessages');
        if (!div) return;
        
        const p = document.createElement('div');
        const isOwn = this.currentUser && msg.username === this.currentUser.username;
        p.className = `chat-message ${isOwn ? 'own' : 'other'} ${msg.type === 'system' ? 'system' : ''}`;
        
        if (msg.type === 'system') p.innerHTML = `<em>${msg.message}</em>`;
        else {
            p.innerHTML = `<div class="username" style="color:${getUserColor(msg.username)}; font-size:0.8rem; font-weight:bold">${msg.username}</div><div>${msg.message}</div>`;
        }
        div.appendChild(p);
        div.scrollTop = div.scrollHeight;
    }
}

function getUserColor(u) { if(!u) return '#000'; let h=0; for(let i=0;i<u.length;i++) h=u.charCodeAt(i)+((h<<5)-h); return `hsl(${Math.abs(h%360)}, 70%, 40%)`; }

window.app = new PortalProductos();
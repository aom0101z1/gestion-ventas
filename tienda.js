// tienda.js - Café/Store Management Module
// Manages products, inventory, and point of sale for the café

console.log('📦 Loading Tienda module...');

// ============================================
// DATE HELPER - COLOMBIA TIMEZONE
// ============================================

/**
 * Get current date/time in Colombia timezone (UTC-5)
 * @returns {string} ISO date string in Colombia timezone
 */
function getColombiaDateTime() {
    const now = new Date();
    const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    return colombiaTime.toISOString();
}

/**
 * Get today's date in Colombia timezone (UTC-5)
 * @returns {string} Date in YYYY-MM-DD format
 */
function getTodayInColombia() {
    const now = new Date();
    const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================
// SECTION 1: PRODUCT MANAGER CLASS
// ============================================

class ProductManager {
    constructor() {
        this.products = new Map();
        this.categories = ['Bebidas Frías', 'Bebidas Calientes', 'Snacks', 'Dulces', 'Comidas', 'Otros'];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            await this.loadProducts();
            this.initialized = true;
            console.log('✅ ProductManager initialized');
        } catch (error) {
            console.error('❌ Error initializing ProductManager:', error);
            throw error;
        }
    }

    async loadProducts() {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'products');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.entries(data).forEach(([id, product]) => {
                    this.products.set(id, product);
                });
            }
            console.log(`✅ Loaded ${this.products.size} products`);
        } catch (error) {
            console.error('❌ Error loading products:', error);
            throw error;
        }
    }

    async addProduct(productData) {
        try {
            const productId = `PROD-${Date.now()}`;

            const product = {
                id: productId,
                barcode: productData.barcode || '',
                name: productData.name,
                category: productData.category,
                price: Number(productData.price),
                cost: Number(productData.cost),
                currentStock: Number(productData.initialStock || 0),
                minStock: Number(productData.minStock || 5),
                image: productData.image || '',
                createdAt: new Date().toISOString(),
                createdBy: window.FirebaseData.currentUser?.email || 'unknown'
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `products/${productId}`);
            await db.set(ref, product);

            this.products.set(productId, product);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Producto añadido',
                    'product',
                    productId,
                    `${product.name} - ${product.barcode}`,
                    { after: { nombre: product.name, precio: product.price, stock: product.currentStock } }
                );
            }

            console.log('✅ Product added:', productId);
            return product;
        } catch (error) {
            console.error('❌ Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `products/${productId}`);

            const updatedData = {
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await db.update(ref, updatedData);

            const product = this.products.get(productId);
            this.products.set(productId, { ...product, ...updatedData });

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Producto editado',
                    'product',
                    productId,
                    `${product.name}`,
                    { after: updates }
                );
            }

            console.log('✅ Product updated:', productId);
            return true;
        } catch (error) {
            console.error('❌ Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(productId) {
        try {
            const product = this.products.get(productId);

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `products/${productId}`);
            await db.remove(ref);

            this.products.delete(productId);

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Producto eliminado',
                    'product',
                    productId,
                    `${product.name}`,
                    { before: { nombre: product.name, barcode: product.barcode } }
                );
            }

            console.log('✅ Product deleted:', productId);
            return true;
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            throw error;
        }
    }

    getProductByBarcode(barcode) {
        return Array.from(this.products.values()).find(p => p.barcode === barcode);
    }

    getProducts(filters = {}) {
        let products = Array.from(this.products.values());

        if (filters.category && filters.category !== 'all') {
            products = products.filter(p => p.category === filters.category);
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            products = products.filter(p =>
                p.name?.toLowerCase().includes(search) ||
                p.barcode?.includes(search)
            );
        }

        if (filters.lowStock) {
            products = products.filter(p => p.currentStock <= p.minStock);
        }

        return products.sort((a, b) => a.name.localeCompare(b.name));
    }
}

// ============================================
// SECTION 2: INVENTORY MANAGER CLASS
// ============================================

class InventoryManager {
    constructor() {
        this.movements = new Map();
    }

    async recordMovement(movementData) {
        try {
            const movementId = `MOV-${Date.now()}`;

            const movement = {
                id: movementId,
                type: movementData.type, // 'purchase', 'sale', 'adjustment'
                productId: movementData.productId,
                productName: movementData.productName,
                quantity: Number(movementData.quantity),
                cost: Number(movementData.cost || 0),
                reason: movementData.reason || '',
                date: getColombiaDateTime(), // Use Colombia timezone
                recordedBy: window.FirebaseData.currentUser?.email || 'unknown'
            };

            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `inventory-movements/${movementId}`);
            await db.set(ref, movement);

            this.movements.set(movementId, movement);

            console.log('✅ Inventory movement recorded:', movementId);
            return movement;
        } catch (error) {
            console.error('❌ Error recording movement:', error);
            throw error;
        }
    }

    async receiveInventory(productId, quantity, cost) {
        try {
            const product = window.ProductManager.products.get(productId);
            if (!product) throw new Error('Product not found');

            // Record movement
            await this.recordMovement({
                type: 'purchase',
                productId: productId,
                productName: product.name,
                quantity: quantity,
                cost: cost,
                reason: 'Compra a proveedor'
            });

            // Update stock
            const newStock = product.currentStock + quantity;
            await window.ProductManager.updateProduct(productId, {
                currentStock: newStock
            });

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Inventario recibido',
                    'inventory',
                    productId,
                    `${product.name} - +${quantity} unidades`,
                    { after: { cantidad: quantity, nuevoStock: newStock } }
                );
            }

            console.log(`✅ Inventory received: ${product.name} +${quantity}`);
            return true;
        } catch (error) {
            console.error('❌ Error receiving inventory:', error);
            throw error;
        }
    }

    async adjustInventory(productId, quantity, reason) {
        try {
            const product = window.ProductManager.products.get(productId);
            if (!product) throw new Error('Product not found');

            await this.recordMovement({
                type: 'adjustment',
                productId: productId,
                productName: product.name,
                quantity: quantity,
                reason: reason
            });

            const newStock = Math.max(0, product.currentStock + quantity);
            await window.ProductManager.updateProduct(productId, {
                currentStock: newStock
            });

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Ajuste de inventario',
                    'inventory',
                    productId,
                    `${product.name} - ${quantity > 0 ? '+' : ''}${quantity} unidades`,
                    { after: { razon: reason, nuevoStock: newStock } }
                );
            }

            console.log(`✅ Inventory adjusted: ${product.name} ${quantity}`);
            return true;
        } catch (error) {
            console.error('❌ Error adjusting inventory:', error);
            throw error;
        }
    }
}

// ============================================
// SECTION 3: SALES MANAGER CLASS
// ============================================

class SalesManager {
    constructor() {
        this.sales = new Map();
        this.currentSale = {
            items: [],
            total: 0
        };
    }

    async loadSales(startDate = null, endDate = null) {
        try {
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, 'sales');
            const snapshot = await db.get(ref);

            if (snapshot.exists()) {
                const data = snapshot.val();
                this.sales.clear();

                Object.entries(data).forEach(([id, sale]) => {
                    if (startDate || endDate) {
                        const saleDate = new Date(sale.date);
                        if (startDate && saleDate < new Date(startDate)) return;
                        if (endDate && saleDate > new Date(endDate + 'T23:59:59')) return;
                    }
                    this.sales.set(id, sale);
                });
            }
            console.log(`✅ Loaded ${this.sales.size} sales`);
        } catch (error) {
            console.error('❌ Error loading sales:', error);
            throw error;
        }
    }

    addItemToCurrentSale(product, quantity = 1) {
        // Check if product already in cart
        const existingItem = this.currentSale.items.find(item => item.productId === product.id);

        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.subtotal = existingItem.quantity * existingItem.price;
        } else {
            this.currentSale.items.push({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: quantity,
                subtotal: product.price * quantity
            });
        }

        this.calculateTotal();
        console.log(`📦 Added to cart: ${product.name} x${quantity}`);
    }

    removeItemFromCurrentSale(productId) {
        this.currentSale.items = this.currentSale.items.filter(item => item.productId !== productId);
        this.calculateTotal();
    }

    updateItemQuantity(productId, quantity) {
        const item = this.currentSale.items.find(item => item.productId === productId);
        if (item) {
            item.quantity = quantity;
            item.subtotal = item.price * quantity;
            this.calculateTotal();
        }
    }

    calculateTotal() {
        this.currentSale.total = this.currentSale.items.reduce((sum, item) => sum + item.subtotal, 0);
    }

    clearCurrentSale() {
        this.currentSale = {
            items: [],
            total: 0
        };
    }

    async completeSale(paymentMethod, amountPaid = null) {
        try {
            if (this.currentSale.items.length === 0) {
                throw new Error('No hay productos en la venta');
            }

            const saleId = `SALE-${Date.now()}`;

            const sale = {
                id: saleId,
                items: this.currentSale.items,
                total: this.currentSale.total,
                paymentMethod: paymentMethod,
                amountPaid: amountPaid || this.currentSale.total,
                change: amountPaid ? (amountPaid - this.currentSale.total) : 0,
                date: getColombiaDateTime(), // Use Colombia timezone
                cashier: window.FirebaseData.currentUser?.email || 'unknown'
            };

            // Save sale to Firebase
            const db = window.firebaseModules.database;
            const ref = db.ref(window.FirebaseData.database, `sales/${saleId}`);
            await db.set(ref, sale);

            this.sales.set(saleId, sale);

            // Update inventory for each item
            for (const item of this.currentSale.items) {
                const product = window.ProductManager.products.get(item.productId);
                if (product) {
                    const newStock = Math.max(0, product.currentStock - item.quantity);
                    await window.ProductManager.updateProduct(item.productId, {
                        currentStock: newStock
                    });

                    // Record inventory movement
                    await window.InventoryManager.recordMovement({
                        type: 'sale',
                        productId: item.productId,
                        productName: item.productName,
                        quantity: -item.quantity,
                        reason: `Venta ${saleId}`
                    });
                }
            }

            // Audit log
            if (typeof window.logAudit === 'function') {
                await window.logAudit(
                    'Venta registrada',
                    'sale',
                    saleId,
                    `Total: $${sale.total.toLocaleString()} - ${sale.items.length} productos`,
                    {
                        after: {
                            total: sale.total,
                            items: sale.items.length,
                            metodoPago: paymentMethod
                        }
                    }
                );
            }

            console.log('✅ Sale completed:', saleId);

            const completedSale = { ...sale };
            this.clearCurrentSale();

            return completedSale;
        } catch (error) {
            console.error('❌ Error completing sale:', error);
            throw error;
        }
    }

    getDailySales(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return Array.from(this.sales.values()).filter(sale => {
            const saleDate = new Date(sale.date).toISOString().split('T')[0];
            return saleDate === targetDate;
        });
    }

    calculateDailyReport(date = null) {
        const dailySales = this.getDailySales(date);

        const report = {
            totalSales: dailySales.length,
            totalRevenue: dailySales.reduce((sum, sale) => sum + sale.total, 0),
            cash: 0,
            transfer: 0,
            productsSold: 0,
            topProducts: new Map()
        };

        dailySales.forEach(sale => {
            if (sale.paymentMethod === 'Efectivo') report.cash += sale.total;
            if (sale.paymentMethod === 'Transferencia') report.transfer += sale.total;

            sale.items.forEach(item => {
                report.productsSold += item.quantity;

                const current = report.topProducts.get(item.productName) || { quantity: 0, revenue: 0 };
                report.topProducts.set(item.productName, {
                    quantity: current.quantity + item.quantity,
                    revenue: current.revenue + item.subtotal
                });
            });
        });

        report.topProducts = Array.from(report.topProducts.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        return report;
    }
}

// ============================================
// SECTION 4: BARCODE SCANNER HANDLER
// ============================================

class BarcodeScanner {
    constructor() {
        this.buffer = '';
        this.timeout = null;
        this.listeners = [];
    }

    startListening(callback) {
        this.listeners.push(callback);

        if (this.listeners.length === 1) {
            document.addEventListener('keypress', this.handleKeyPress.bind(this));
            console.log('🔍 Barcode scanner listening...');
        }
    }

    stopListening(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);

        if (this.listeners.length === 0) {
            document.removeEventListener('keypress', this.handleKeyPress.bind(this));
            console.log('🔍 Barcode scanner stopped');
        }
    }

    handleKeyPress(e) {
        // Ignore if typing in an input field (except barcode input fields)
        if (e.target.tagName === 'INPUT' && !e.target.classList.contains('barcode-input')) {
            return;
        }

        if (e.key === 'Enter') {
            if (this.buffer.length > 0) {
                this.notifyListeners(this.buffer);
                this.buffer = '';
            }
        } else {
            this.buffer += e.key;

            // Reset buffer after 100ms of inactivity
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.buffer = '';
            }, 100);
        }
    }

    notifyListeners(barcode) {
        this.listeners.forEach(callback => {
            try {
                callback(barcode);
            } catch (error) {
                console.error('❌ Error in barcode listener:', error);
            }
        });
    }
}

// ============================================
// SECTION 5: UI RENDERING FUNCTIONS
// ============================================

function renderProductsTable(products) {
    if (products.length === 0) {
        return '<div style="text-align: center; padding: 40px; color: #6b7280;">No hay productos registrados</div>';
    }

    return `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <thead style="background: #f3f4f6;">
                    <tr>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Código Barras</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Producto</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Categoría</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600;">Precio</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600;">Costo</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Stock</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => {
                        const isLowStock = p.currentStock <= p.minStock;
                        const profit = p.price - p.cost;
                        const margin = ((profit / p.price) * 100).toFixed(1);

                        return `
                            <tr style="border-top: 1px solid #e5e7eb;">
                                <td style="padding: 12px;">
                                    <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                        ${p.barcode || '-'}
                                    </code>
                                </td>
                                <td style="padding: 12px; font-weight: 500;">${p.name}</td>
                                <td style="padding: 12px;">
                                    <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                                        ${p.category}
                                    </span>
                                </td>
                                <td style="padding: 12px; text-align: right; font-weight: 600; color: #059669;">
                                    $${p.price.toLocaleString()}
                                </td>
                                <td style="padding: 12px; text-align: right; color: #6b7280;">
                                    $${p.cost.toLocaleString()}
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    <span style="
                                        background: ${isLowStock ? '#fee2e2' : '#d1fae5'};
                                        color: ${isLowStock ? '#dc2626' : '#059669'};
                                        padding: 4px 12px;
                                        border-radius: 12px;
                                        font-weight: 600;
                                    ">
                                        ${isLowStock ? '⚠️ ' : ''}${p.currentStock}
                                    </span>
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    <button onclick="editProduct('${p.id}')" class="btn btn-sm" style="background: #3b82f6; color: white; margin-right: 4px;">
                                        ✏️ Editar
                                    </button>
                                    <button onclick="deleteProduct('${p.id}')" class="btn btn-sm" style="background: #ef4444; color: white;">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderPointOfSale() {
    const currentSale = window.SalesManager.currentSale;

    return `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; height: calc(100vh - 200px);">
            <!-- Left: Product Scanner & Cart -->
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Scanner Input -->
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 16px 0;">🔍 Escanear Producto</h3>
                    <input
                        type="text"
                        id="barcodeInput"
                        class="barcode-input"
                        placeholder="Escanee el código de barras o búsqueda manual..."
                        style="width: 100%; padding: 12px; border: 2px solid #3b82f6; border-radius: 6px; font-size: 16px;"
                        autocomplete="off"
                    >
                    <div id="productSearchResults" style="margin-top: 12px;"></div>
                </div>

                <!-- Shopping Cart -->
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; overflow-y: auto;">
                    <h3 style="margin: 0 0 16px 0;">🛒 Carrito de Compra</h3>
                    <div id="cartItems">
                        ${currentSale.items.length === 0 ?
                            '<div style="text-align: center; padding: 40px; color: #9ca3af;">El carrito está vacío<br>Escanee un producto para comenzar</div>' :
                            renderCartItems(currentSale.items)
                        }
                    </div>
                </div>
            </div>

            <!-- Right: Summary & Payment -->
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column;">
                <h3 style="margin: 0 0 16px 0;">💳 Resumen de Venta</h3>

                <div style="flex: 1;">
                    <div style="padding: 16px; background: #f9fafb; border-radius: 6px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 14px;">Items:</span>
                            <span style="font-weight: 600;">${currentSale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 16px;">
                            <span style="color: #374151; font-weight: 500;">Subtotal:</span>
                            <span style="font-weight: 600; color: #1f2937;">$${currentSale.total.toLocaleString('es-CO')}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #059669;">
                            <span style="font-size: 20px; font-weight: 700; color: #059669;">TOTAL:</span>
                            <span style="font-size: 28px; font-weight: 700; color: #059669;">
                                $${currentSale.total.toLocaleString('es-CO')}
                            </span>
                        </div>
                    </div>

                    ${currentSale.items.length > 0 ? `
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Método de Pago:</label>
                            <select id="paymentMethod" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                                <option value="Efectivo">💵 Efectivo</option>
                                <option value="Nequi">📱 Nequi</option>
                                <option value="Bancolombia">🏦 Bancolombia</option>
                            </select>
                        </div>

                        <div id="cashPaymentSection" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Paga con:</label>
                            <input
                                type="text"
                                id="amountReceived"
                                placeholder="Ej: 50000"
                                style="width: 100%; padding: 12px; border: 2px solid #3b82f6; border-radius: 6px; font-size: 18px; font-weight: 600;"
                            >

                            <!-- Quick Bill Buttons -->
                            <div style="margin-top: 12px;">
                                <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; text-align: center;">Billetes comunes:</div>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                    <button onclick="selectBillAmount(10000)" type="button" style="
                                        padding: 10px;
                                        background: linear-gradient(135deg, #fca5a5 0%, #dc2626 100%);
                                        color: white;
                                        border: 2px solid #991b1b;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-weight: 700;
                                        font-size: 14px;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                        transition: transform 0.1s;
                                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                        💵 $10,000
                                    </button>
                                    <button onclick="selectBillAmount(20000)" type="button" style="
                                        padding: 10px;
                                        background: linear-gradient(135deg, #fde047 0%, #eab308 100%);
                                        color: #422006;
                                        border: 2px solid #a16207;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-weight: 700;
                                        font-size: 14px;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                        transition: transform 0.1s;
                                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                        💵 $20,000
                                    </button>
                                    <button onclick="selectBillAmount(50000)" type="button" style="
                                        padding: 10px;
                                        background: linear-gradient(135deg, #86efac 0%, #16a34a 100%);
                                        color: white;
                                        border: 2px solid #15803d;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-weight: 700;
                                        font-size: 14px;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                        transition: transform 0.1s;
                                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                        💵 $50,000
                                    </button>
                                    <button onclick="selectBillAmount(100000)" type="button" style="
                                        padding: 10px;
                                        background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
                                        color: white;
                                        border: 2px solid #6d28d9;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-weight: 700;
                                        font-size: 14px;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                        transition: transform 0.1s;
                                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                        💵 $100,000
                                    </button>
                                </div>
                            </div>

                            <div id="changeDisplay" style="margin-top: 12px; padding: 16px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 8px; border: 2px solid #059669; display: none;">
                                <div style="text-align: center; margin-bottom: 8px;">
                                    <div style="font-size: 12px; color: #065f46; margin-bottom: 4px;">Paga con: <strong id="paysWithAmount">$0</strong></div>
                                    <div style="font-size: 12px; color: #065f46; margin-bottom: 4px;">Total: <strong>$${currentSale.total.toLocaleString('es-CO')}</strong></div>
                                    <div style="border-top: 1px solid #059669; margin: 8px 0;"></div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 14px; color: #065f46; font-weight: 600; margin-bottom: 4px;">CAMBIO A DEVOLVER:</div>
                                    <div id="changeAmount" style="font-size: 32px; font-weight: 700; color: #059669;"></div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div style="display: flex; gap: 8px;">
                    <button
                        onclick="cancelSale()"
                        class="btn"
                        style="flex: 1; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;"
                        ${currentSale.items.length === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        ❌ Cancelar
                    </button>
                    <button
                        onclick="completeSale()"
                        class="btn"
                        style="flex: 2; padding: 12px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 16px;"
                        ${currentSale.items.length === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        ✅ COBRAR $${currentSale.total.toLocaleString('es-CO')}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderCartItems(items) {
    return items.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e5e7eb; background: #fafafa; margin-bottom: 4px; border-radius: 4px;">
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #1f2937; font-size: 15px;">${item.productName}</div>
                <div style="font-size: 13px; color: #6b7280;">$${item.price.toLocaleString('es-CO')} c/u × ${item.quantity}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})"
                        class="btn btn-sm" style="background: #ef4444; color: white; width: 32px; height: 32px; padding: 0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    -
                </button>
                <input
                    type="number"
                    value="${item.quantity}"
                    onchange="updateCartQuantity('${item.productId}', parseInt(this.value))"
                    style="width: 50px; text-align: center; padding: 6px; border: 2px solid #d1d5db; border-radius: 4px; font-weight: 600;"
                    min="1"
                >
                <button onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})"
                        class="btn btn-sm" style="background: #059669; color: white; width: 32px; height: 32px; padding: 0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    +
                </button>
            </div>
            <div style="width: 110px; text-align: right; font-weight: 700; color: #059669; font-size: 16px;">
                $${item.subtotal.toLocaleString('es-CO')}
            </div>
            <button onclick="removeFromCart('${item.productId}')"
                    class="btn btn-sm" style="background: #6b7280; color: white; margin-left: 8px; border: none; border-radius: 4px; cursor: pointer; width: 36px; height: 36px; padding: 0;">
                🗑️
            </button>
        </div>
    `).join('');
}

function renderDailySalesReport(report) {
    return `
        <div style="padding: 20px;">
            <h2 style="margin-bottom: 24px;">📊 Reporte de Ventas Diarias</h2>

            <!-- Date Selector -->
            <div style="margin-bottom: 24px; background: white; padding: 16px; border-radius: 8px;">
                <label style="font-weight: 600; margin-right: 12px;">Fecha:</label>
                <input
                    type="date"
                    id="reportDate"
                    value="${new Date().toISOString().split('T')[0]}"
                    onchange="loadDailySalesReport(this.value)"
                    style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;"
                >
            </div>

            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; color: white;">
                    <div style="font-size: 14px; opacity: 0.9;">Total Ventas</div>
                    <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">${report.totalSales}</div>
                </div>
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px; color: white;">
                    <div style="font-size: 14px; opacity: 0.9;">Ingresos Total</div>
                    <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">$${report.totalRevenue.toLocaleString()}</div>
                </div>
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 8px; color: white;">
                    <div style="font-size: 14px; opacity: 0.9;">Efectivo</div>
                    <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">$${report.cash.toLocaleString()}</div>
                </div>
                <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 8px; color: white;">
                    <div style="font-size: 14px; opacity: 0.9;">Transferencias</div>
                    <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">$${report.transfer.toLocaleString()}</div>
                </div>
            </div>

            <!-- Top Products -->
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 16px 0;">🏆 Productos Más Vendidos</h3>
                ${report.topProducts.length === 0 ?
                    '<div style="text-align: center; padding: 40px; color: #9ca3af;">No hay ventas registradas</div>' :
                    `<table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 12px; text-align: left;">#</th>
                                <th style="padding: 12px; text-align: left;">Producto</th>
                                <th style="padding: 12px; text-align: center;">Cantidad Vendida</th>
                                <th style="padding: 12px; text-align: right;">Ingresos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.topProducts.map((product, index) => `
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 12px; font-weight: 600;">${index + 1}</td>
                                    <td style="padding: 12px;">${product.name}</td>
                                    <td style="padding: 12px; text-align: center; font-weight: 600;">${product.quantity}</td>
                                    <td style="padding: 12px; text-align: right; font-weight: 600; color: #059669;">
                                        $${product.revenue.toLocaleString()}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        </div>
    `;
}

// ============================================
// SECTION 6: WINDOW FUNCTIONS
// ============================================

window.loadTiendaTab = async function() {
    const container = document.getElementById('tiendaContainer');
    if (!container) return;

    try {
        // Initialize managers if needed
        if (!window.ProductManager?.initialized) {
            await window.ProductManager.init();
        }

        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="margin: 0;">🏪 Gestión de Tienda</h2>
                </div>

                <!-- Sub Navigation -->
                <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                    <button onclick="showTiendaSection('pos')" id="tienda-tab-pos" class="tienda-tab active">
                        💳 Punto de Venta
                    </button>
                    <button onclick="showTiendaSection('products')" id="tienda-tab-products" class="tienda-tab">
                        📦 Productos
                    </button>
                    <button onclick="showTiendaSection('inventory')" id="tienda-tab-inventory" class="tienda-tab">
                        📊 Inventario
                    </button>
                    <button onclick="showTiendaSection('receive')" id="tienda-tab-receive" class="tienda-tab">
                        📥 Recibir Inventario
                    </button>
                    <button onclick="showTiendaSection('reports')" id="tienda-tab-reports" class="tienda-tab">
                        📈 Reportes
                    </button>
                </div>

                <!-- Content Area -->
                <div id="tiendaSectionContent"></div>
            </div>
        `;

        // Add CSS for tabs
        const style = document.createElement('style');
        style.textContent = `
            .tienda-tab {
                padding: 10px 20px;
                background: white;
                border: none;
                border-bottom: 3px solid transparent;
                cursor: pointer;
                font-weight: 500;
                color: #6b7280;
                transition: all 0.2s;
            }
            .tienda-tab:hover {
                color: #1f2937;
                background: #f9fafb;
            }
            .tienda-tab.active {
                color: #3b82f6;
                border-bottom-color: #3b82f6;
            }
        `;
        document.head.appendChild(style);

        // Load default section (POS)
        showTiendaSection('pos');

    } catch (error) {
        console.error('❌ Error loading Tienda tab:', error);
        window.showNotification('❌ Error al cargar la tienda', 'error');
    }
};

window.showTiendaSection = function(section) {
    // Update active tab
    document.querySelectorAll('.tienda-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tienda-tab-${section}`)?.classList.add('active');

    const content = document.getElementById('tiendaSectionContent');

    switch(section) {
        case 'pos':
            content.innerHTML = renderPointOfSale();
            setupPOSEventListeners();
            break;
        case 'products':
            showProductsSection();
            break;
        case 'inventory':
            showInventorySection();
            break;
        case 'receive':
            showReceiveInventorySection();
            break;
        case 'reports':
            showReportsSection();
            break;
    }
};

function showProductsSection() {
    const content = document.getElementById('tiendaSectionContent');
    const products = window.ProductManager.getProducts();

    content.innerHTML = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; gap: 12px; flex: 1;">
                    <input
                        type="text"
                        id="productSearch"
                        placeholder="Buscar producto..."
                        style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; flex: 1; max-width: 400px;"
                    >
                    <select id="categoryFilter" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="all">Todas las categorías</option>
                        ${window.ProductManager.categories.map(cat =>
                            `<option value="${cat}">${cat}</option>`
                        ).join('')}
                    </select>
                </div>
                <button onclick="showProductForm()" class="btn btn-primary">
                    ➕ Nuevo Producto
                </button>
            </div>

            <div id="productsTableContainer">
                ${renderProductsTable(products)}
            </div>
        </div>
    `;

    // Add event listeners
    document.getElementById('productSearch').addEventListener('input', filterProducts);
    document.getElementById('categoryFilter').addEventListener('change', filterProducts);
}

function showInventorySection() {
    const content = document.getElementById('tiendaSectionContent');
    const products = window.ProductManager.getProducts();

    content.innerHTML = `
        <div>
            <h3 style="margin-bottom: 16px;">📊 Estado del Inventario</h3>

            <!-- Inventory Summary -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; margin-bottom: 8px;">Total Productos</div>
                    <div style="font-size: 32px; font-weight: 700; color: #1f2937;">${products.length}</div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; margin-bottom: 8px;">Stock Total</div>
                    <div style="font-size: 32px; font-weight: 700; color: #059669;">
                        ${products.reduce((sum, p) => sum + p.currentStock, 0)}
                    </div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; margin-bottom: 8px;">Bajo Stock</div>
                    <div style="font-size: 32px; font-weight: 700; color: #ef4444;">
                        ${products.filter(p => p.currentStock <= p.minStock).length}
                    </div>
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="color: #6b7280; margin-bottom: 8px;">Valor Inventario</div>
                    <div style="font-size: 32px; font-weight: 700; color: #3b82f6;">
                        $${products.reduce((sum, p) => sum + (p.cost * p.currentStock), 0).toLocaleString()}
                    </div>
                </div>
            </div>

            <!-- Low Stock Alert -->
            ${products.filter(p => p.currentStock <= p.minStock).length > 0 ? `
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                    <h4 style="margin: 0 0 12px 0; color: #991b1b;">⚠️ Productos con Stock Bajo</h4>
                    ${products.filter(p => p.currentStock <= p.minStock).map(p => `
                        <div style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                            ${p.name} - <strong>${p.currentStock} unidades</strong> (Mínimo: ${p.minStock})
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- Full Inventory Table -->
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${renderProductsTable(products)}
            </div>
        </div>
    `;
}

function showReceiveInventorySection() {
    const content = document.getElementById('tiendaSectionContent');

    content.innerHTML = `
        <div style="max-width: 600px;">
            <h3 style="margin-bottom: 16px;">📥 Recibir Inventario</h3>
            <p style="color: #6b7280; margin-bottom: 24px;">Escanee el código de barras del producto que desea agregar al inventario.</p>

            <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Código de Barras:</label>
                    <input
                        type="text"
                        id="receiveBarcode"
                        class="barcode-input"
                        placeholder="Escanee el código de barras..."
                        style="width: 100%; padding: 12px; border: 2px solid #3b82f6; border-radius: 6px; font-size: 16px;"
                        autocomplete="off"
                    >
                </div>

                <div id="receiveProductInfo" style="display: none; margin-top: 24px; padding: 16px; background: #f0fdf4; border-radius: 6px; border: 1px solid #86efac;">
                    <h4 style="margin: 0 0 12px 0;">Producto Encontrado:</h4>
                    <div id="productInfoDisplay"></div>

                    <div style="margin-top: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Cantidad a Recibir:</label>
                        <input
                            type="number"
                            id="receiveQuantity"
                            min="1"
                            value="1"
                            style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                        >
                    </div>

                    <div style="margin-top: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Costo Unitario:</label>
                        <input
                            type="number"
                            id="receiveCost"
                            min="0"
                            style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                        >
                    </div>

                    <button
                        onclick="confirmReceiveInventory()"
                        class="btn"
                        style="width: 100%; margin-top: 16px; padding: 12px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ✅ Confirmar Recepción
                    </button>
                </div>
            </div>
        </div>
    `;

    // Setup barcode listener for receiving inventory
    const barcodeInput = document.getElementById('receiveBarcode');
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const barcode = this.value.trim();
            if (barcode) {
                handleReceiveBarcodeScan(barcode);
            }
        }
    });

    barcodeInput.focus();
}

async function showReportsSection() {
    const content = document.getElementById('tiendaSectionContent');

    // Load today's sales
    const today = new Date().toISOString().split('T')[0];
    await window.SalesManager.loadSales(today, today);
    const report = window.SalesManager.calculateDailyReport(today);

    content.innerHTML = renderDailySalesReport(report);
}

// Product Management Functions
window.showProductForm = function(productId = null) {
    const product = productId ? window.ProductManager.products.get(productId) : null;
    const isEdit = !!product;

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <h2 style="margin: 0 0 24px 0;">${isEdit ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h2>

                <form id="productForm" onsubmit="saveProduct(event, '${productId || ''}')">
                    <div style="display: grid; gap: 16px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Código de Barras:</label>
                            <input
                                type="text"
                                name="barcode"
                                value="${product?.barcode || ''}"
                                placeholder="Escanee o ingrese manualmente"
                                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                            >
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Nombre del Producto: *</label>
                            <input
                                type="text"
                                name="name"
                                value="${product?.name || ''}"
                                required
                                placeholder="Ej: Coca-Cola 350ml"
                                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                            >
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Categoría: *</label>
                            <select
                                name="category"
                                required
                                style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                                ${window.ProductManager.categories.map(cat =>
                                    `<option value="${cat}" ${product?.category === cat ? 'selected' : ''}>${cat}</option>`
                                ).join('')}
                            </select>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Precio de Venta: *</label>
                                <input
                                    type="number"
                                    name="price"
                                    value="${product?.price || ''}"
                                    required
                                    min="0"
                                    step="100"
                                    placeholder="3000"
                                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                                >
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Costo: *</label>
                                <input
                                    type="number"
                                    name="cost"
                                    value="${product?.cost || ''}"
                                    required
                                    min="0"
                                    step="100"
                                    placeholder="2000"
                                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                                >
                            </div>
                        </div>

                        ${!isEdit ? `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Stock Inicial:</label>
                                    <input
                                        type="number"
                                        name="initialStock"
                                        value="0"
                                        min="0"
                                        style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                                    >
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Stock Mínimo:</label>
                                    <input
                                        type="number"
                                        name="minStock"
                                        value="5"
                                        min="0"
                                        style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                                    >
                                </div>
                            </div>
                        ` : `
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Stock Mínimo:</label>
                                <input
                                    type="number"
                                    name="minStock"
                                    value="${product?.minStock || 5}"
                                    min="0"
                                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;"
                                >
                            </div>
                        `}
                    </div>

                    <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                        <button type="button" onclick="closeModal()" class="btn" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary" style="padding: 10px 20px;">
                            ${isEdit ? '💾 Guardar Cambios' : '➕ Crear Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.saveProduct = async function(event, productId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const productData = {
        barcode: formData.get('barcode'),
        name: formData.get('name'),
        category: formData.get('category'),
        price: formData.get('price'),
        cost: formData.get('cost'),
        minStock: formData.get('minStock'),
        initialStock: formData.get('initialStock')
    };

    try {
        if (productId) {
            await window.ProductManager.updateProduct(productId, {
                barcode: productData.barcode,
                name: productData.name,
                category: productData.category,
                price: Number(productData.price),
                cost: Number(productData.cost),
                minStock: Number(productData.minStock)
            });
            window.showNotification('✅ Producto actualizado', 'success');
        } else {
            await window.ProductManager.addProduct(productData);
            window.showNotification('✅ Producto creado', 'success');
        }

        window.closeModal();
        showProductsSection();
    } catch (error) {
        console.error('Error saving product:', error);
        window.showNotification('❌ Error al guardar producto', 'error');
    }
};

window.editProduct = function(productId) {
    showProductForm(productId);
};

window.deleteProduct = async function(productId) {
    const product = window.ProductManager.products.get(productId);
    if (!confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) return;

    try {
        await window.ProductManager.deleteProduct(productId);
        window.showNotification('✅ Producto eliminado', 'success');
        showProductsSection();
    } catch (error) {
        console.error('Error deleting product:', error);
        window.showNotification('❌ Error al eliminar producto', 'error');
    }
};

function filterProducts() {
    const search = document.getElementById('productSearch').value;
    const category = document.getElementById('categoryFilter').value;

    const products = window.ProductManager.getProducts({
        search: search,
        category: category
    });

    document.getElementById('productsTableContainer').innerHTML = renderProductsTable(products);
}

// POS Functions
function setupPOSEventListeners() {
    const barcodeInput = document.getElementById('barcodeInput');
    const paymentMethod = document.getElementById('paymentMethod');
    const amountReceived = document.getElementById('amountReceived');

    // Barcode scanning
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const input = this.value.trim();
            if (input) {
                handlePOSBarcodeScan(input);
                this.value = '';
            }
        }
    });

    // Manual search
    barcodeInput.addEventListener('input', function(e) {
        if (e.target.value.length >= 2) {
            showProductSearchResults(e.target.value);
        } else {
            document.getElementById('productSearchResults').innerHTML = '';
        }
    });

    // Payment method change
    if (paymentMethod) {
        paymentMethod.addEventListener('change', function() {
            const cashSection = document.getElementById('cashPaymentSection');
            if (this.value === 'Efectivo') {
                cashSection.style.display = 'block';
            } else {
                cashSection.style.display = 'none';
            }
        });
    }

    // Amount received calculation with formatting
    if (amountReceived) {
        amountReceived.addEventListener('input', function() {
            // Remove all non-numeric characters
            let value = this.value.replace(/[^\d]/g, '');

            // Don't process if empty
            if (!value) {
                document.getElementById('changeDisplay').style.display = 'none';
                return;
            }

            const received = Number(value);
            const total = window.SalesManager.currentSale.total;
            const change = received - total;

            const changeDisplay = document.getElementById('changeDisplay');
            const changeAmount = document.getElementById('changeAmount');
            const paysWithAmount = document.getElementById('paysWithAmount');

            if (received > 0) {
                // Update "paga con" display
                if (paysWithAmount) {
                    paysWithAmount.textContent = `$${received.toLocaleString('es-CO')}`;
                }

                if (received >= total) {
                    changeDisplay.style.display = 'block';
                    changeAmount.textContent = `$${change.toLocaleString('es-CO')}`;
                } else {
                    changeDisplay.style.display = 'none';
                }
            } else {
                changeDisplay.style.display = 'none';
            }
        });

        // Format on blur to add commas
        amountReceived.addEventListener('blur', function() {
            let value = this.value.replace(/[^\d]/g, '');
            if (value) {
                const formatted = Number(value).toLocaleString('es-CO');
                this.value = formatted;
            }
        });

        // Remove formatting on focus to allow easy editing
        amountReceived.addEventListener('focus', function() {
            let value = this.value.replace(/[^\d]/g, '');
            this.value = value;
        });
    }

    barcodeInput.focus();
}

function handlePOSBarcodeScan(barcode) {
    const product = window.ProductManager.getProductByBarcode(barcode);

    if (product) {
        if (product.currentStock <= 0) {
            window.showNotification('⚠️ Producto sin stock', 'warning');
            return;
        }

        window.SalesManager.addItemToCurrentSale(product);
        refreshPOSDisplay();
        window.showNotification(`✅ ${product.name} agregado`, 'success');
    } else {
        window.showNotification('❌ Producto no encontrado', 'error');
        // Offer to create new product
        if (confirm(`Producto con código ${barcode} no encontrado. ¿Desea crearlo?`)) {
            showProductForm();
            // Pre-fill barcode
            setTimeout(() => {
                document.querySelector('input[name="barcode"]').value = barcode;
            }, 100);
        }
    }
}

function showProductSearchResults(search) {
    const products = window.ProductManager.getProducts({ search: search });
    const container = document.getElementById('productSearchResults');

    if (products.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div style="border: 1px solid #d1d5db; border-radius: 6px; max-height: 200px; overflow-y: auto; background: white;">
            ${products.slice(0, 5).map(p => `
                <div
                    onclick="addProductToCart('${p.id}')"
                    style="padding: 12px; border-bottom: 1px solid #e5e7eb; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                    onmouseover="this.style.background='#f3f4f6'"
                    onmouseout="this.style.background='white'">
                    <div>
                        <div style="font-weight: 600;">${p.name}</div>
                        <div style="font-size: 12px; color: #6b7280;">Stock: ${p.currentStock}</div>
                    </div>
                    <div style="font-weight: 600; color: #059669;">$${p.price.toLocaleString()}</div>
                </div>
            `).join('')}
        </div>
    `;
}

window.addProductToCart = function(productId) {
    const product = window.ProductManager.products.get(productId);
    if (product) {
        handlePOSBarcodeScan(product.barcode || productId);
    }
    document.getElementById('barcodeInput').value = '';
    document.getElementById('productSearchResults').innerHTML = '';
    document.getElementById('barcodeInput').focus();
};

window.updateCartQuantity = function(productId, quantity) {
    if (quantity <= 0) {
        window.SalesManager.removeItemFromCurrentSale(productId);
    } else {
        const product = window.ProductManager.products.get(productId);
        if (quantity > product.currentStock) {
            window.showNotification(`⚠️ Solo hay ${product.currentStock} unidades disponibles`, 'warning');
            return;
        }
        window.SalesManager.updateItemQuantity(productId, quantity);
    }
    refreshPOSDisplay();
};

window.removeFromCart = function(productId) {
    window.SalesManager.removeItemFromCurrentSale(productId);
    refreshPOSDisplay();
};

window.cancelSale = function() {
    if (confirm('¿Está seguro de cancelar esta venta?')) {
        window.SalesManager.clearCurrentSale();
        refreshPOSDisplay();
        window.showNotification('Venta cancelada', 'info');
    }
};

// Quick bill amount selection
window.selectBillAmount = function(amount) {
    const amountInput = document.getElementById('amountReceived');
    if (!amountInput) return;

    // Set the value
    amountInput.value = amount;

    // Trigger the input event to calculate change
    const event = new Event('input', { bubbles: true });
    amountInput.dispatchEvent(event);

    // Focus the input field
    amountInput.focus();

    // Visual feedback
    window.showNotification(`💵 Seleccionado: $${amount.toLocaleString('es-CO')}`, 'success');
};

window.completeSale = async function() {
    try {
        const paymentMethod = document.getElementById('paymentMethod').value;
        let amountPaid = null;

        if (paymentMethod === 'Efectivo') {
            const receivedInput = document.getElementById('amountReceived');
            // Remove all formatting (commas, spaces) before converting to number
            const cleanValue = receivedInput.value.replace(/[^\d]/g, '');
            amountPaid = Number(cleanValue);

            if (!amountPaid || amountPaid < window.SalesManager.currentSale.total) {
                window.showNotification('❌ El monto recibido es insuficiente', 'error');
                return;
            }
        }

        const sale = await window.SalesManager.completeSale(paymentMethod, amountPaid);

        // Show success message with proper formatting
        const change = sale.change > 0 ? `\nCambio: $${sale.change.toLocaleString('es-CO')}` : '';
        window.showNotification(`✅ Venta completada\nTotal: $${sale.total.toLocaleString('es-CO')}${change}`, 'success');

        // Refresh display
        refreshPOSDisplay();

    } catch (error) {
        console.error('Error completing sale:', error);
        window.showNotification('❌ Error al completar venta: ' + error.message, 'error');
    }
};

function refreshPOSDisplay() {
    const content = document.getElementById('tiendaSectionContent');
    content.innerHTML = renderPointOfSale();
    setupPOSEventListeners();
}

// Receive Inventory Functions
function handleReceiveBarcodeScan(barcode) {
    const product = window.ProductManager.getProductByBarcode(barcode);

    if (product) {
        document.getElementById('receiveProductInfo').style.display = 'block';
        document.getElementById('productInfoDisplay').innerHTML = `
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${product.name}</div>
            <div style="color: #6b7280;">Stock actual: <strong>${product.currentStock}</strong> unidades</div>
            <div style="color: #6b7280;">Precio de venta: <strong>$${product.price.toLocaleString()}</strong></div>
        `;
        document.getElementById('receiveCost').value = product.cost;
        document.getElementById('receiveQuantity').focus();

        // Store current product ID
        document.getElementById('receiveBarcode').dataset.productId = product.id;
    } else {
        window.showNotification('❌ Producto no encontrado', 'error');
        if (confirm(`Producto con código ${barcode} no encontrado. ¿Desea crearlo?`)) {
            showProductForm();
            setTimeout(() => {
                document.querySelector('input[name="barcode"]').value = barcode;
            }, 100);
        }
    }
}

window.confirmReceiveInventory = async function() {
    try {
        const productId = document.getElementById('receiveBarcode').dataset.productId;
        const quantity = Number(document.getElementById('receiveQuantity').value);
        const cost = Number(document.getElementById('receiveCost').value);

        if (!productId || !quantity || !cost) {
            window.showNotification('❌ Complete todos los campos', 'error');
            return;
        }

        await window.InventoryManager.receiveInventory(productId, quantity, cost);

        const product = window.ProductManager.products.get(productId);
        window.showNotification(`✅ Inventario recibido: ${product.name} (+${quantity})`, 'success');

        // Reset form
        document.getElementById('receiveBarcode').value = '';
        document.getElementById('receiveBarcode').dataset.productId = '';
        document.getElementById('receiveProductInfo').style.display = 'none';
        document.getElementById('receiveQuantity').value = '1';
        document.getElementById('receiveBarcode').focus();

    } catch (error) {
        console.error('Error receiving inventory:', error);
        window.showNotification('❌ Error al recibir inventario', 'error');
    }
};

window.loadDailySalesReport = async function(date) {
    await window.SalesManager.loadSales(date, date);
    const report = window.SalesManager.calculateDailyReport(date);

    const content = document.getElementById('tiendaSectionContent');
    content.innerHTML = renderDailySalesReport(report);
};

// ============================================
// SECTION 7: INITIALIZATION
// ============================================

// Close modal function
window.closeModal = function() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
};

// Create global instances
window.ProductManager = new ProductManager();
window.InventoryManager = new InventoryManager();
window.SalesManager = new SalesManager();
window.BarcodeScanner = new BarcodeScanner();

console.log('✅ Tienda module loaded successfully');

// invoice-integration.js - Add this to your CRM
// Lightweight invoice integration for Ciudad Bilingüe

const InvoiceSystem = {
  // Invoice configuration
  config: {
    businessName: 'CIUDAD BILINGÜE',
    nit: '9.764.924-1',
    address: 'Cra 8. #22-52',
    phones: '324 297 3737 - 315 640 6911',
    email: 'contacto@ciudadbilingue.com',
    whatsapp: '324 297 37 37'
  },

  // Initialize invoice system
  init() {
    console.log('🧾 Initializing Invoice System...');
    this.addInvoiceButtons();
    this.setupPrintStyles();
  },

  // Add invoice buttons to payment entries
  addInvoiceButtons() {
    // Wait for payments to load
    setTimeout(() => {
      const paymentRows = document.querySelectorAll('.payment-row, [data-payment-id]');
      paymentRows.forEach(row => {
        if (!row.querySelector('.invoice-btn')) {
          const btn = document.createElement('button');
          btn.className = 'invoice-btn';
          btn.innerHTML = '🧾 Generar Comprobante';
          btn.style.cssText = 'margin-left: 10px; padding: 5px 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;';
          btn.onclick = () => this.generateInvoice(row);
          row.appendChild(btn);
        }
      });
    }, 1000);
  },

  // Generate invoice number: CB-YYYYMMDD-StudentRow#-Receipt# 
  async generateInvoiceNumber(studentId) {
    // Use the same logic as InvoiceGenerator for consistency
    return await window.InvoiceGenerator.generateInvoiceNumber(studentId);
  },

  // Get student data from Firebase
  async getStudentData(studentId) {
    try {
      const db = window.firebaseModules.database;
      const studentRef = db.ref(window.FirebaseData.database, `students/${studentId}`);
      const snapshot = await db.get(studentRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error('Error loading student:', error);
      return null;
    }
  },

  // Generate and show invoice
  async generateInvoice(paymentRow) {
    // Extract payment data from row
    const paymentData = {
      studentId: paymentRow.dataset.studentId || paymentRow.getAttribute('data-student-id'),
      amount: paymentRow.dataset.amount || paymentRow.querySelector('.amount')?.textContent,
      concept: paymentRow.dataset.concept || 'Mensualidad',
      date: paymentRow.dataset.date ? new Date(paymentRow.dataset.date) : new Date()
    };

    // Get student data
    const studentData = await this.getStudentData(paymentData.studentId);
    if (!studentData) {
      alert('No se pudo cargar la información del estudiante');
      return;
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(paymentData.studentId);

    // Create invoice data
    const invoiceData = {
      number: invoiceNumber,
      date: paymentData.date,
      student: {
        name: studentData.name || studentData.studentName || '',
        nit: studentData.nit || studentData.documentNumber || '',
        address: studentData.address || '',
        phone: studentData.phone || studentData.parentPhone || ''
      },
      items: [{
        quantity: 1,
        description: paymentData.concept,
        unitPrice: parseFloat(paymentData.amount) || 0,
        total: parseFloat(paymentData.amount) || 0
      }],
      subtotal: parseFloat(paymentData.amount) || 0,
      total: parseFloat(paymentData.amount) || 0,
      observations: '',
      printedAt: new Date().toISOString()
    };

    // Show invoice modal
    this.showInvoiceModal(invoiceData);

    // Save to Firebase
    this.saveInvoiceToFirebase(invoiceData, paymentData.studentId);
  },

  // Show invoice in modal for editing/printing
  showInvoiceModal(invoiceData) {
    // Remove existing modal
    const existingModal = document.getElementById('invoiceModal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'invoiceModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    modal.innerHTML = `
      <div style="background: white; padding: 20px; max-width: 850px; max-height: 90vh; overflow-y: auto; position: relative;">
        <button onclick="document.getElementById('invoiceModal').remove()" 
                style="position: absolute; right: 10px; top: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">✖</button>
        
        <div id="invoiceContent">
          ${this.getInvoiceHTML(invoiceData)}
        </div>
        
        <div style="margin-top: 20px; text-align: center; no-print;">
          <button onclick="InvoiceSystem.printInvoice()" 
                  style="background: #3b82f6; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer;">
            🖨️ Imprimir
          </button>
          <button onclick="InvoiceSystem.saveAsPDF('${invoiceData.number}')" 
                  style="background: #10b981; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer;">
            📄 Guardar PDF
          </button>
          <button onclick="InvoiceSystem.editInvoice()" 
                  style="background: #f59e0b; color: white; padding: 10px 20px; margin: 0 10px; border: none; cursor: pointer;">
            ✏️ Editar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  },

  // Get invoice HTML template
  getInvoiceHTML(data) {
    const formatDate = (date) => {
      const d = new Date(date);
      return {
        day: d.getDate().toString().padStart(2, '0'),
        month: (d.getMonth() + 1).toString().padStart(2, '0'),
        year: d.getFullYear()
      };
    };

    const dateInfo = formatDate(data.date);
    const formatCurrency = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(num);

    return `
      <div class="invoice-print" style="width: 800px; padding: 20px; border: 2px solid #000; font-family: Arial, sans-serif; position: relative;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 80px; height: 80px; background: #6b7280; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
            CB
          </div>
          <h1 style="margin: 0; font-size: 32px;">${this.config.businessName}</h1>
          <p style="margin: 5px 0;">NIT. ${this.config.nit}</p>
          <p style="margin: 5px 0;">${this.config.address} &nbsp; Cel. ${this.config.phones}</p>
        </div>

        <!-- Invoice Number -->
        <div style="position: absolute; right: 20px; top: 20px; border: 2px solid #000; padding: 10px 20px;">
          <div style="font-size: 12px;">COMPROBANTE DE PAGO</div>
          <div style="font-size: 18px; font-weight: bold;">${data.number}</div>
        </div>

        <!-- Date -->
        <div style="position: absolute; right: 20px; top: 100px; border: 2px solid #000; padding: 10px;">
          <div style="font-size: 12px; text-align: center;">FECHA</div>
          <div style="display: flex; gap: 10px;">
            <div style="text-align: center;">
              <div style="border: 1px solid #000; padding: 5px 10px;">${dateInfo.day}</div>
              <small>DÍA</small>
            </div>
            <div style="text-align: center;">
              <div style="border: 1px solid #000; padding: 5px 10px;">${dateInfo.month}</div>
              <small>MES</small>
            </div>
            <div style="text-align: center;">
              <div style="border: 1px solid #000; padding: 5px 10px;">${dateInfo.year}</div>
              <small>AÑO</small>
            </div>
          </div>
        </div>

        <!-- Customer Info -->
        <div style="margin: 100px 0 20px 0;">
          <div style="display: flex; margin-bottom: 10px;">
            <label style="font-weight: bold; width: 100px;">Señor:</label>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.name}</span>
            <label style="font-weight: bold; width: 100px; margin-left: 20px;">NIT./C.C.:</label>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.nit}</span>
          </div>
          <div style="display: flex; margin-bottom: 20px;">
            <label style="font-weight: bold; width: 100px;">Dirección:</label>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.address}</span>
            <label style="font-weight: bold; width: 100px; margin-left: 20px;">Cel.:</label>
            <span style="flex: 1; border-bottom: 1px solid #000; padding: 0 5px;">${data.student.phone}</span>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0; width: 100px;">CANT.</th>
              <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0;">DESCRIPCIÓN</th>
              <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0; width: 150px;">VR. UNITARIO</th>
              <th style="border: 2px solid #000; padding: 10px; background: #f0f0f0; width: 150px;">VR. TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 10px;">${item.description}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: right;">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
            <!-- Empty rows for form -->
            ${[...Array(5)].map(() => `
              <tr>
                <td style="border: 1px solid #000; padding: 10px; height: 30px;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 10px;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 10px;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 10px;">&nbsp;</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="text-align: right;">
          <table style="margin-left: auto; width: 300px;">
            <tr>
              <td style="padding: 5px; font-weight: bold;">SUB-TOTAL</td>
              <td style="border: 1px solid #000; padding: 5px 10px; text-align: right; width: 150px;">
                ${formatCurrency(data.subtotal)}
              </td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold; font-size: 18px;">TOTAL</td>
              <td style="border: 2px solid #000; padding: 5px 10px; text-align: right; font-weight: bold; font-size: 18px;">
                ${formatCurrency(data.total)}
              </td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="margin-top: 20px; font-size: 12px; text-align: center;">
          <p style="margin: 5px 0;">Solicita la factura electrónica enviando este comprobante al correo: ${this.config.email}</p>
          <p style="margin: 5px 0;">o al whatsapp ${this.config.whatsapp}</p>
        </div>

        <!-- Observations -->
        <div style="margin-top: 20px; border: 1px solid #000; padding: 10px; min-height: 60px;">
          <strong>OBSERVACIONES:</strong><br>
          ${data.observations || ''}
        </div>

        <!-- Timestamp -->
        <div style="margin-top: 10px; font-size: 10px; color: #666; text-align: right;">
          Impreso: ${new Date(data.printedAt).toLocaleString('es-CO')}
        </div>
      </div>
    `;
  },

  // Print invoice
  printInvoice() {
    window.print();
  },

  // Save as PDF (using browser's print to PDF)
  saveAsPDF(invoiceNumber) {
    const filename = `Comprobante_${invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Show print dialog with save as PDF option
    window.print();
    
    // Alternative: you could integrate with jsPDF library for direct PDF generation
    alert(`Use la opción "Guardar como PDF" en el diálogo de impresión.\nNombre sugerido: ${filename}`);
  },

  // Edit invoice (make fields editable)
  editInvoice() {
    const content = document.getElementById('invoiceContent');
    const inputs = content.querySelectorAll('span[style*="border-bottom"]');
    
    inputs.forEach(span => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = span.textContent;
      input.style.cssText = span.style.cssText + '; background: #fffbeb;';
      span.parentNode.replaceChild(input, span);
    });

    // Change button to "Save"
    event.target.textContent = '💾 Guardar';
    event.target.onclick = () => this.saveEditedInvoice();
  },

  // Save invoice to Firebase
  async saveInvoiceToFirebase(invoiceData, studentId) {
    try {
      const db = window.firebaseModules.database;
      const invoiceRef = db.ref(window.FirebaseData.database, `invoices/${invoiceData.number}`);
      await db.set(invoiceRef, {
        ...invoiceData,
        studentId: studentId,
        createdAt: new Date().toISOString(),
        createdBy: window.FirebaseData.auth.currentUser?.email || 'unknown'
      });

      // Also save reference in student's invoices
      const studentInvoiceRef = db.ref(window.FirebaseData.database, `students/${studentId}/invoices/${invoiceData.number}`);
      await db.set(studentInvoiceRef, true);

      console.log('✅ Invoice saved:', invoiceData.number);
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  },

  // Setup print styles
  setupPrintStyles() {
    if (!document.getElementById('invoicePrintStyles')) {
      const style = document.createElement('style');
      style.id = 'invoicePrintStyles';
      style.textContent = `
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-print, .invoice-print * {
            visibility: visible;
          }
          .invoice-print {
            position: absolute;
            left: 0;
            top: 0;
          }
          .no-print, button {
            display: none !important;
          }
          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
};

// Initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => InvoiceSystem.init());
} else {
  InvoiceSystem.init();
}

// Also initialize when payments module is loaded
if (window.loadPayments) {
  const originalLoadPayments = window.loadPayments;
  window.loadPayments = function() {
    originalLoadPayments.apply(this, arguments);
    setTimeout(() => InvoiceSystem.init(), 1000);
  };
}

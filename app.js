// SelfieTape App - Complete Mobile Application
document.addEventListener('DOMContentLoaded', function() {
    // App State
    const appState = {
        clients: JSON.parse(localStorage.getItem('selfietape_clients')) || [],
        measurements: JSON.parse(localStorage.getItem('selfietape_measurements')) || [],
        currentClient: null
    };

    // DOM Elements
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const modal = document.getElementById('client-modal');
    const clientForm = document.getElementById('client-form');
    const measurementForm = document.getElementById('measurement-form');
    const clientSelect = document.getElementById('measurement-client');
    const toast = document.getElementById('toast');
    const installPrompt = document.getElementById('install-prompt');

    // Initialize App
    initApp();

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Update active nav
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Show page
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            
            // Update specific page data
            if (pageId === 'dashboard') updateDashboard();
            if (pageId === 'clients') renderClients();
            if (pageId === 'history') renderHistory();
            if (pageId === 'measure') populateClientSelect();
        });
    });

    // Quick Actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            
            switch(action) {
                case 'new-client':
                    showModal();
                    break;
                case 'quick-measure':
                    navLinks.forEach(l => l.classList.remove('active'));
                    document.querySelector('[data-page="measure"]').classList.add('active');
                    pages.forEach(page => page.classList.remove('active'));
                    document.getElementById('measure').classList.add('active');
                    break;
                case 'view-clients':
                    navLinks.forEach(l => l.classList.remove('active'));
                    document.querySelector('[data-page="clients"]').classList.add('active');
                    pages.forEach(page => page.classList.remove('active'));
                    document.getElementById('clients').classList.add('active');
                    renderClients();
                    break;
                case 'view-history':
                    navLinks.forEach(l => l.classList.remove('active'));
                    document.querySelector('[data-page="history"]').classList.add('active');
                    pages.forEach(page => page.classList.remove('active'));
                    document.getElementById('history').classList.add('active');
                    renderHistory();
                    break;
            }
        });
    });

    // Add Client Button
    document.getElementById('add-client-btn')?.addEventListener('click', showModal);

    // Modal Functions
    function showModal() {
        modal.classList.add('active');
        document.getElementById('client-name').focus();
    }

    function hideModal() {
        modal.classList.remove('active');
        clientForm.reset();
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', hideModal);
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) hideModal();
    });

    // Client Form Submission
    clientForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const client = {
            id: Date.now().toString(),
            name: document.getElementById('client-name').value.trim(),
            phone: document.getElementById('client-phone').value.trim(),
            email: document.getElementById('client-email').value.trim(),
            notes: document.getElementById('client-notes').value.trim(),
            createdAt: new Date().toISOString(),
            lastMeasured: null
        };

        appState.clients.push(client);
        saveData();
        hideModal();
        showToast('Client added successfully!');
        
        // Update UI
        if (document.getElementById('clients').classList.contains('active')) {
            renderClients();
        }
        updateDashboard();
        populateClientSelect();
    });

    // Measurement Form Submission
    measurementForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const clientId = clientSelect.value;
        if (!clientId) {
            showToast('Please select a client', 'error');
            return;
        }

        const measurement = {
            id: Date.now().toString(),
            clientId: clientId,
            timestamp: new Date().toISOString(),
            chest: parseFloat(document.getElementById('chest').value) || 0,
            waist: parseFloat(document.getElementById('waist').value) || 0,
            hips: parseFloat(document.getElementById('hips').value) || 0,
            shoulder: parseFloat(document.getElementById('shoulder').value) || 0,
            sleeve: parseFloat(document.getElementById('sleeve').value) || 0,
            inseam: parseFloat(document.getElementById('inseam').value) || 0,
            outseam: parseFloat(document.getElementById('outseam').value) || 0,
            thigh: parseFloat(document.getElementById('thigh').value) || 0,
            notes: document.getElementById('measurement-notes').value.trim()
        };

        // Update client's last measured date
        const client = appState.clients.find(c => c.id === clientId);
        if (client) {
            client.lastMeasured = measurement.timestamp;
        }

        appState.measurements.push(measurement);
        saveData();
        measurementForm.reset();
        showToast('Measurement saved successfully!');
        
        // Navigate to history
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-page="history"]').classList.add('active');
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById('history').classList.add('active');
        renderHistory();
        updateDashboard();
    });

    // Client Search
    document.getElementById('client-search')?.addEventListener('input', function(e) {
        renderClients(this.value.toLowerCase());
    });

    // History Filter
    document.getElementById('history-filter')?.addEventListener('change', function(e) {
        renderHistory(this.value);
    });

    // App Functions
    function initApp() {
        updateDashboard();
        renderClients();
        renderHistory();
        populateClientSelect();
        populateHistoryFilter();
        setupPWA();
        checkForUpdates();
    }

    function updateDashboard() {
        // Update stats
        document.getElementById('total-clients').textContent = appState.clients.length;
        document.getElementById('total-measurements').textContent = appState.measurements.length;
        
        // This week's measurements
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekMeasurements = appState.measurements.filter(m => 
            new Date(m.timestamp) > weekAgo
        ).length;
        document.getElementById('week-measurements').textContent = weekMeasurements;

        // Recent measurements
        const recentList = document.getElementById('recent-list');
        const recentMeasurements = [...appState.measurements]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        if (recentMeasurements.length === 0) {
            recentList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ruler-combined"></i>
                    <p>No measurements yet</p>
                    <p class="subtitle">Start by adding a measurement</p>
                </div>
            `;
            return;
        }

        recentList.innerHTML = recentMeasurements.map(m => {
            const client = appState.clients.find(c => c.id === m.clientId);
            const date = new Date(m.timestamp).toLocaleDateString();
            
            return `
                <div class="recent-item">
                    <div class="client-header">
                        <div class="client-name">${client?.name || 'Unknown Client'}</div>
                        <div class="client-date">${date}</div>
                    </div>
                    <div class="client-measurements">
                        <div class="measure-item">
                            <div class="measure-value">${m.chest}"</div>
                            <div class="measure-label">Chest</div>
                        </div>
                        <div class="measure-item">
                            <div class="measure-value">${m.waist}"</div>
                            <div class="measure-label">Waist</div>
                        </div>
                        <div class="measure-item">
                            <div class="measure-value">${m.hips}"</div>
                            <div class="measure-label">Hips</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderClients(searchTerm = '') {
        const clientsList = document.getElementById('clients-list');
        let filteredClients = appState.clients;
        
        if (searchTerm) {
            filteredClients = appState.clients.filter(client =>
                client.name.toLowerCase().includes(searchTerm) ||
                client.phone.includes(searchTerm) ||
                client.email.toLowerCase().includes(searchTerm)
            );
        }

        if (filteredClients.length === 0) {
            clientsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>${searchTerm ? 'No clients found' : 'No clients yet'}</p>
                    <p class="subtitle">${searchTerm ? 'Try a different search' : 'Add your first client'}</p>
                </div>
            `;
            return;
        }

        clientsList.innerHTML = filteredClients.map(client => {
            const lastMeasured = client.lastMeasured 
                ? new Date(client.lastMeasured).toLocaleDateString()
                : 'Never measured';
            
            const measurementCount = appState.measurements.filter(m => m.clientId === client.id).length;
            
            return `
                <div class="client-item" data-client-id="${client.id}">
                    <div class="client-header">
                        <div>
                            <div class="client-name">${client.name}</div>
                            <div class="client-info">
                                ${client.phone ? `<span><i class="fas fa-phone"></i> ${client.phone}</span>` : ''}
                                ${client.email ? `<span><i class="fas fa-envelope"></i> ${client.email}</span>` : ''}
                            </div>
                        </div>
                        <div class="client-stats">
                            <span class="stat-badge">${measurementCount} measurements</span>
                        </div>
                    </div>
                    <div class="client-footer">
                        <div class="client-date">Last measured: ${lastMeasured}</div>
                        <button class="btn-secondary measure-btn" data-client-id="${client.id}">
                            <i class="fas fa-plus"></i> Add Measurement
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to measure buttons
        document.querySelectorAll('.measure-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const clientId = this.getAttribute('data-client-id');
                
                // Navigate to measure page
                navLinks.forEach(l => l.classList.remove('active'));
                document.querySelector('[data-page="measure"]').classList.add('active');
                pages.forEach(page => page.classList.remove('active'));
                document.getElementById('measure').classList.add('active');
                
                // Select the client
                clientSelect.value = clientId;
            });
        });
    }

    function renderHistory(filter = 'all') {
        const historyList = document.getElementById('history-list');
        let filteredMeasurements = [...appState.measurements]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (filter !== 'all') {
            filteredMeasurements = filteredMeasurements.filter(m => m.clientId === filter);
        }

        if (filteredMeasurements.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No measurement history</p>
                    <p class="subtitle">Measurements will appear here</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = filteredMeasurements.map(m => {
            const client = appState.clients.find(c => c.id === m.clientId);
            const date = new Date(m.timestamp);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="history-item">
                    <div class="client-header">
                        <div class="client-name">${client?.name || 'Unknown Client'}</div>
                        <div class="client-date">
                            ${formattedDate} at ${formattedTime}
                        </div>
                    </div>
                    
                    <div class="measurement-details">
                        <div class="measurement-row">
                            <span class="measure-label">Chest:</span>
                            <span class="measure-value">${m.chest}"</span>
                            <span class="measure-label">Waist:</span>
                            <span class="measure-value">${m.waist}"</span>
                            <span class="measure-label">Hips:</span>
                            <span class="measure-value">${m.hips}"</span>
                        </div>
                        <div class="measurement-row">
                            <span class="measure-label">Shoulder:</span>
                            <span class="measure-value">${m.shoulder}"</span>
                            <span class="measure-label">Sleeve:</span>
                            <span class="measure-value">${m.sleeve}"</span>
                            <span class="measure-label">Inseam:</span>
                            <span class="measure-value">${m.inseam}"</span>
                        </div>
                        <div class="measurement-row">
                            <span class="measure-label">Outseam:</span>
                            <span class="measure-value">${m.outseam}"</span>
                            <span class="measure-label">Thigh:</span>
                            <span class="measure-value">${m.thigh}"</span>
                        </div>
                    </div>
                    
                    ${m.notes ? `
                        <div class="measurement-notes">
                            <strong>Notes:</strong> ${m.notes}
                        </div>
                    ` : ''}
                    
                    <div class="history-actions">
                        <button class="btn-secondary delete-btn" data-measurement-id="${m.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add delete functionality
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const measurementId = this.getAttribute('data-measurement-id');
                if (confirm('Are you sure you want to delete this measurement?')) {
                    deleteMeasurement(measurementId);
                }
            });
        });
    }

    function populateClientSelect() {
        clientSelect.innerHTML = '<option value="">Choose a client...</option>' +
            appState.clients.map(client => 
                `<option value="${client.id}">${client.name}</option>`
            ).join('');
    }

    function populateHistoryFilter() {
        const filter = document.getElementById('history-filter');
        if (!filter) return;
        
        filter.innerHTML = '<option value="all">All Clients</option>' +
            appState.clients.map(client => 
                `<option value="${client.id}">${client.name}</option>`
            ).join('');
    }

    function deleteMeasurement(measurementId) {
        appState.measurements = appState.measurements.filter(m => m.id !== measurementId);
        saveData();
        showToast('Measurement deleted');
        
        // Update all views
        updateDashboard();
        renderHistory(document.getElementById('history-filter')?.value || 'all');
        
        if (document.getElementById('dashboard').classList.contains('active')) {
            updateDashboard();
        }
    }

    function saveData() {
        localStorage.setItem('selfietape_clients', JSON.stringify(appState.clients));
        localStorage.setItem('selfietape_measurements', JSON.stringify(appState.measurements));
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = 'toast';
        toast.classList.add('show', type);
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function setupPWA() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is running in standalone mode');
        }
        
        // Listen for beforeinstallprompt event
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt after 5 seconds
            setTimeout(() => {
                if (deferredPrompt) {
                    installPrompt.classList.add('show');
                }
            }, 5000);
        });
        
        // Install button
        document.getElementById('install-btn')?.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                installPrompt.classList.remove('show');
                showToast('SelfieTape installed successfully!');
            }
            
            deferredPrompt = null;
        });
        
        // Dismiss install prompt
        document.getElementById('dismiss-install')?.addEventListener('click', () => {
            installPrompt.classList.remove('show');
        });
    }

    function checkForUpdates() {
        // Simple version checking
        const currentVersion = '1.0.0';
        const storedVersion = localStorage.getItem('selfietape_version');
        
        if (storedVersion !== currentVersion) {
            localStorage.setItem('selfietape_version', currentVersion);
            
            // Migrate data if needed
            if (!storedVersion) {
                showToast('Welcome to SelfieTape v1.0!', 'info');
            }
        }
    }

    // Export/Import Data (for backup)
    window.exportData = function() {
        const data = {
            clients: appState.clients,
            measurements: appState.measurements,
            exported: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selfietape-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully!');
    };

    window.importData = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (confirm('This will replace all current data. Continue?')) {
                        appState.clients = data.clients || [];
                        appState.measurements = data.measurements || [];
                        saveData();
                        
                        // Update all views
                        initApp();
                        showToast('Data imported successfully!');
                    }
                } catch (error) {
                    showToast('Invalid backup file', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    };

    // Make appState available globally for debugging
    window.appState = appState;
});
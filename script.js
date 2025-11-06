// ==================== DATA MANAGEMENT ====================
const data = {
    workers: JSON.parse(localStorage.getItem('workers')) || [],
    overlockEntries: JSON.parse(localStorage.getItem('overlockEntries')) || [],
    tasselEntries: JSON.parse(localStorage.getItem('tasselEntries')) || [],
    foldEntries: JSON.parse(localStorage.getItem('foldEntries')) || []
};

// ==================== INITIALIZATION ====================
function initApp() {
    try {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('overlockDate').value = today;
        document.getElementById('tasselDate').value = today;
        document.getElementById('foldDate').value = today;
        document.getElementById('reportDate').value = today;

        populateWorkerSelects();
        renderWorkers();
        renderOverlockEntries();
        renderTasselEntries();
        renderFoldEntries();
        populateAvailableTowelsForTassel();
        populateAvailableTowels();
        updateDashboard();
        
        // Hide loading screen after successful initialization
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 500);
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('loadingScreen').innerHTML = '<p style="color: red;">Error loading app. Please refresh the page.</p>';
    }
}

// ==================== TAB SWITCHING ====================
function switchTab(btn, tabName) {
    try {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        showToast(`Switched to ${btn.textContent.trim()}`);
    } catch (error) {
        console.error('Tab switch error:', error);
    }
}

// ==================== WORKER MANAGEMENT ====================
function addWorker() {
    const id = document.getElementById('workerId').value.trim();
    const name = document.getElementById('workerName').value.trim();
    const group = document.getElementById('workerGroup').value;

    if (!id || !name) {
        showToast('Please fill all fields', 'error');
        return;
    }

    if (data.workers.some(w => w.id === id)) {
        showToast('Worker ID already exists', 'error');
        return;
    }

    data.workers.push({ id, name, group, active: true });
    saveData();
    clearWorkerForm();
    renderWorkers();
    populateWorkerSelects();
    updateDashboard();
    showToast(`Worker ${name} added to ${group}!`);
}

function deleteWorker(id) {
    if (confirm('Are you sure you want to delete this worker?')) {
        data.workers = data.workers.filter(w => w.id !== id);
        saveData();
        renderWorkers();
        populateWorkerSelects();
        updateDashboard();
        showToast('Worker deleted');
    }
}

function renderWorkers() {
    const tbody = document.getElementById('workersTableBody');
    tbody.innerHTML = data.workers.map(w => {
        let badgeClass = 'badge-group-a';
        if (w.group === 'Fold') badgeClass = 'badge-group-b';
        
        return `
            <tr>
                <td>${w.id}</td>
                <td>${w.name}</td>
                <td><span class="badge ${badgeClass}">${w.group}</span></td>
                <td><span class="badge badge-success">Active</span></td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteWorker('${w.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function clearWorkerForm() {
    document.getElementById('workerId').value = '';
    document.getElementById('workerName').value = '';
}

function populateWorkerSelects() {
    // Populate Overlock Workers
    const overlockSelect = document.getElementById('overlockWorker');
    const overlockWorkers = data.workers.filter(w => w.group === 'Overlock');
    overlockSelect.innerHTML = '<option>Select Worker</option>' + 
        overlockWorkers.map(w => `<option value="${w.id}">${w.name} (${w.id})</option>`).join('');

    // Populate Tassel Workers
    const tasselSelect = document.getElementById('tasselWorker');
    const tasselWorkers = data.workers.filter(w => w.group === 'Tassel');
    tasselSelect.innerHTML = '<option>Select Worker</option>' + 
        tasselWorkers.map(w => `<option value="${w.id}">${w.name} (${w.id})</option>`).join('');

    // Populate Fold Workers
    const foldSelect = document.getElementById('foldWorker');
    const foldWorkers = data.workers.filter(w => w.group === 'Fold');
    foldSelect.innerHTML = '<option>Select Worker</option>' + 
        foldWorkers.map(w => `<option value="${w.id}">${w.name} (${w.id})</option>`).join('');
}

// ==================== OVERLOCK STITCH ENTRY ====================
function addOverlockEntry() {
    const date = document.getElementById('overlockDate').value;
    const workerId = document.getElementById('overlockWorker').value;
    const towelType = document.getElementById('overlockTowelType').value.trim();
    const price = parseFloat(document.getElementById('overlockPrice').value) || 0;
    const qty = parseInt(document.getElementById('overlockQty').value) || 0;
    const nextStep = document.getElementById('overlockNextStep').value;

    if (!date || workerId === 'Select Worker' || !towelType || price <= 0 || qty <= 0) {
        showToast('Please fill all fields correctly', 'error');
        return;
    }

    data.overlockEntries.push({ 
        date, 
        workerId, 
        towelType, 
        qty, 
        rate: price,
        nextStep,
        id: Date.now()
    });
    
    saveData();
    document.getElementById('overlockTowelType').value = '';
    document.getElementById('overlockPrice').value = '0';
    document.getElementById('overlockQty').value = '0';
    renderOverlockEntries();
    populateAvailableTowelsForTassel();
    populateAvailableTowels();
    updateDashboard();
    showToast('Overlock entry added successfully!');
}

function deleteOverlockEntry(id) {
    if (confirm('Delete this entry?')) {
        data.overlockEntries = data.overlockEntries.filter(e => e.id !== id);
        saveData();
        renderOverlockEntries();
        populateAvailableTowelsForTassel();
        populateAvailableTowels();
        updateDashboard();
        showToast('Entry deleted');
    }
}

function renderOverlockEntries() {
    const today = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('overlockTableBody');
    
    const todayEntries = data.overlockEntries.filter(e => e.date === today);
    
    tbody.innerHTML = todayEntries.map(e => {
        const worker = data.workers.find(w => w.id === e.workerId);
        const amount = e.qty * e.rate;
        
        // Check completion based on next step
        let status = '';
        if (e.nextStep === 'Tassel') {
            const tasselQty = data.tasselEntries
                .filter(t => t.overlockEntryId === e.id)
                .reduce((sum, t) => sum + t.qty, 0);
            status = tasselQty >= e.qty ? 
                '<span class="badge badge-success">Completed</span>' : 
                '<span class="badge badge-warning">Pending Tassel</span>';
        } else {
            const foldQty = data.foldEntries
                .filter(f => f.overlockEntryId === e.id)
                .reduce((sum, f) => sum + f.qty, 0);
            status = foldQty >= e.qty ? 
                '<span class="badge badge-success">Completed</span>' : 
                '<span class="badge badge-warning">Pending Fold</span>';
        }
        
        return `
            <tr>
                <td>${worker ? worker.name : 'Unknown'}</td>
                <td>${e.towelType}</td>
                <td>${e.qty}</td>
                <td>₹${e.rate.toFixed(2)}</td>
                <td>₹${amount.toFixed(2)}</td>
                <td><span class="badge badge-info">${e.nextStep}</span></td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteOverlockEntry(${e.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== POPULATE TOWELS FOR TASSEL ====================
function populateAvailableTowelsForTassel() {
    const date = document.getElementById('tasselDate').value;
    const tasselTowelSelect = document.getElementById('tasselTowelSelect');
    
    // Get overlock entries that need tassel stitching
    const overlockForTassel = data.overlockEntries.filter(e => e.date === date && e.nextStep === 'Tassel');
    
    const availableTowels = [];
    overlockForTassel.forEach(overlock => {
        const worker = data.workers.find(w => w.id === overlock.workerId);
        
        const tasselQty = data.tasselEntries
            .filter(t => t.date === date && t.overlockEntryId === overlock.id)
            .reduce((sum, t) => sum + t.qty, 0);
        
        const remaining = overlock.qty - tasselQty;
        
        if (remaining > 0) {
            availableTowels.push({
                id: overlock.id,
                towelType: overlock.towelType,
                remaining: remaining,
                workerName: worker ? worker.name : 'Unknown'
            });
        }
    });
    
    if (availableTowels.length === 0) {
        tasselTowelSelect.innerHTML = '<option value="">No overlock towels waiting for tassel</option>';
    } else {
        tasselTowelSelect.innerHTML = '<option value="">Select available towel</option>' + 
            availableTowels.map(t => 
                `<option value="${t.id}">${t.towelType} (${t.workerName} - ${t.remaining} pcs)</option>`
            ).join('');
    }
}

function updateTasselDetails() {
    const tasselTowelSelect = document.getElementById('tasselTowelSelect');
    const selectedId = parseInt(tasselTowelSelect.value);
    
    if (!selectedId) {
        document.getElementById('tasselTowelType').value = '';
        document.getElementById('tasselPreviousWorker').value = '';
        document.getElementById('tasselAvailableQty').value = '';
        document.getElementById('tasselPrice').value = '0';
        document.getElementById('tasselQty').value = '0';
        return;
    }
    
    const date = document.getElementById('tasselDate').value;
    const overlockEntry = data.overlockEntries.find(e => e.id === selectedId);
    
    if (overlockEntry) {
        const worker = data.workers.find(w => w.id === overlockEntry.workerId);
        
        const tasselQty = data.tasselEntries
            .filter(t => t.date === date && t.overlockEntryId === overlockEntry.id)
            .reduce((sum, t) => sum + t.qty, 0);
        
        const remaining = overlockEntry.qty - tasselQty;
        
        document.getElementById('tasselTowelType').value = overlockEntry.towelType;
        document.getElementById('tasselPreviousWorker').value = worker ? worker.name : 'Unknown';
        document.getElementById('tasselAvailableQty').value = remaining;
        document.getElementById('tasselPrice').value = '0';
        document.getElementById('tasselQty').value = '0';
    }
}

// ==================== TASSEL STITCH ENTRY ====================
function addTasselEntry() {
    const date = document.getElementById('tasselDate').value;
    const workerId = document.getElementById('tasselWorker').value;
    const overlockEntryId = parseInt(document.getElementById('tasselTowelSelect').value);
    const towelType = document.getElementById('tasselTowelType').value.trim();
    const price = parseFloat(document.getElementById('tasselPrice').value);
    const qty = parseInt(document.getElementById('tasselQty').value);
    const availableQty = parseInt(document.getElementById('tasselAvailableQty').value) || 0;

    if (!date || workerId === 'Select Worker' || !overlockEntryId || !towelType || !price || price <= 0 || !qty || qty <= 0) {
        showToast('Please select a towel and fill all fields correctly', 'error');
        return;
    }
    
    if (qty > availableQty) {
        showToast(`Only ${availableQty} pcs available for tassel!`, 'error');
        return;
    }
    
    data.tasselEntries.push({ 
        date, 
        workerId, 
        towelType, 
        qty, 
        rate: price,
        overlockEntryId,
        id: Date.now()
    });
    
    saveData();
    document.getElementById('tasselTowelSelect').value = '';
    document.getElementById('tasselTowelType').value = '';
    document.getElementById('tasselPrice').value = '0';
    document.getElementById('tasselPreviousWorker').value = '';
    document.getElementById('tasselAvailableQty').value = '';
    document.getElementById('tasselQty').value = '0';
    renderTasselEntries();
    renderOverlockEntries();
    populateAvailableTowelsForTassel();
    populateAvailableTowels();
    updateDashboard();
    showToast('Tassel entry added successfully!');
}

function deleteTasselEntry(id) {
    if (confirm('Delete this entry?')) {
        data.tasselEntries = data.tasselEntries.filter(e => e.id !== id);
        saveData();
        renderTasselEntries();
        renderOverlockEntries();
        populateAvailableTowelsForTassel();
        populateAvailableTowels();
        updateDashboard();
        showToast('Entry deleted');
    }
}

function renderTasselEntries() {
    const today = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('tasselTableBody');
    
    const todayEntries = data.tasselEntries.filter(e => e.date === today);
    
    tbody.innerHTML = todayEntries.map(e => {
        const worker = data.workers.find(w => w.id === e.workerId);
        const amount = e.qty * e.rate;
        
        const foldQty = data.foldEntries
            .filter(f => f.tasselEntryId === e.id)
            .reduce((sum, f) => sum + f.qty, 0);
        
        const status = foldQty >= e.qty ? 
            '<span class="badge badge-success">Completed</span>' : 
            '<span class="badge badge-warning">Pending Fold</span>';
        
        return `
            <tr>
                <td>${worker ? worker.name : 'Unknown'}</td>
                <td>${e.towelType}</td>
                <td>${e.qty}</td>
                <td>₹${e.rate.toFixed(2)}</td>
                <td>₹${amount.toFixed(2)}</td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteTasselEntry(${e.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== POPULATE TOWELS FOR FOLDING ====================
function populateAvailableTowels() {
    const date = document.getElementById('foldDate').value;
    const foldTowelSelect = document.getElementById('foldTowelSelect');
    
    const availableTowels = [];
    
    // 1. Tassel-stitched towels (from tassel entries)
    const tasselEntries = data.tasselEntries.filter(e => e.date === date);
    tasselEntries.forEach(tassel => {
        const worker = data.workers.find(w => w.id === tassel.workerId);
        
        const foldedQty = data.foldEntries
            .filter(f => f.date === date && f.tasselEntryId === tassel.id)
            .reduce((sum, f) => sum + f.qty, 0);
        
        const remaining = tassel.qty - foldedQty;
        
        if (remaining > 0) {
            availableTowels.push({
                type: 'tassel',
                id: tassel.id,
                towelType: tassel.towelType,
                remaining: remaining,
                workerName: worker ? worker.name : 'Unknown',
                source: 'Tassel'
            });
        }
    });
    
    // 2. Overlock towels going directly to fold
    const overlockForFold = data.overlockEntries.filter(e => e.date === date && e.nextStep === 'Fold');
    overlockForFold.forEach(overlock => {
        const worker = data.workers.find(w => w.id === overlock.workerId);
        
        const foldedQty = data.foldEntries
            .filter(f => f.date === date && f.overlockEntryId === overlock.id)
            .reduce((sum, f) => sum + f.qty, 0);
        
        const remaining = overlock.qty - foldedQty;
        
        if (remaining > 0) {
            availableTowels.push({
                type: 'overlock',
                id: overlock.id,
                towelType: overlock.towelType,
                remaining: remaining,
                workerName: worker ? worker.name : 'Unknown',
                source: 'Overlock'
            });
        }
    });
    
    if (availableTowels.length === 0) {
        foldTowelSelect.innerHTML = '<option value="">No towels ready for folding</option>';
    } else {
        foldTowelSelect.innerHTML = '<option value="">Select available towel</option>' + 
            availableTowels.map(t => 
                `<option value="${t.type}-${t.id}">${t.towelType} (${t.workerName} - ${t.remaining} pcs) [${t.source}]</option>`
            ).join('');
    }
}

function updateFoldDetails() {
    const foldTowelSelect = document.getElementById('foldTowelSelect');
    const selectedValue = foldTowelSelect.value;
    
    if (!selectedValue) {
        document.getElementById('foldTowelType').value = '';
        document.getElementById('foldPreviousWorker').value = '';
        document.getElementById('foldAvailableQty').value = '';
        document.getElementById('foldPrice').value = '0';
        document.getElementById('foldQty').value = '0';
        return;
    }
    
    const [type, id] = selectedValue.split('-');
    const entryId = parseInt(id);
    const date = document.getElementById('foldDate').value;
    
    let entry, worker, foldedQty, remaining;
    
    if (type === 'tassel') {
        entry = data.tasselEntries.find(e => e.id === entryId);
        if (entry) {
            worker = data.workers.find(w => w.id === entry.workerId);
            foldedQty = data.foldEntries
                .filter(f => f.date === date && f.tasselEntryId === entry.id)
                .reduce((sum, f) => sum + f.qty, 0);
            remaining = entry.qty - foldedQty;
        }
    } else {
        entry = data.overlockEntries.find(e => e.id === entryId);
        if (entry) {
            worker = data.workers.find(w => w.id === entry.workerId);
            foldedQty = data.foldEntries
                .filter(f => f.date === date && f.overlockEntryId === entry.id)
                .reduce((sum, f) => sum + f.qty, 0);
            remaining = entry.qty - foldedQty;
        }
    }
    
    if (entry) {
        document.getElementById('foldTowelType').value = entry.towelType;
        document.getElementById('foldPreviousWorker').value = worker ? worker.name : 'Unknown';
        document.getElementById('foldAvailableQty').value = remaining;
        document.getElementById('foldPrice').value = '0';
        document.getElementById('foldQty').value = '0';
    }
}

// ==================== FOLD ENTRY ====================
function addFoldEntry() {
    const date = document.getElementById('foldDate').value;
    const workerId = document.getElementById('foldWorker').value;
    const selectedValue = document.getElementById('foldTowelSelect').value;
    const towelType = document.getElementById('foldTowelType').value.trim();
    const price = parseFloat(document.getElementById('foldPrice').value);
    const qty = parseInt(document.getElementById('foldQty').value);
    const availableQty = parseInt(document.getElementById('foldAvailableQty').value) || 0;

    if (!date || workerId === 'Select Worker' || !selectedValue || !towelType || !price || price <= 0 || !qty || qty <= 0) {
        showToast('Please select a towel and fill all fields correctly', 'error');
        return;
    }
    
    if (qty > availableQty) {
        showToast(`Only ${availableQty} pcs available to fold!`, 'error');
        return;
    }
    
    const [type, id] = selectedValue.split('-');
    const entryId = parseInt(id);
    
    const foldEntry = { 
        date, 
        workerId, 
        towelType, 
        qty, 
        rate: price,
        id: Date.now()
    };
    
    if (type === 'tassel') {
        foldEntry.tasselEntryId = entryId;
    } else {
        foldEntry.overlockEntryId = entryId;
    }
    
    data.foldEntries.push(foldEntry);
    
    saveData();
    document.getElementById('foldTowelSelect').value = '';
    document.getElementById('foldTowelType').value = '';
    document.getElementById('foldPrice').value = '0';
    document.getElementById('foldPreviousWorker').value = '';
    document.getElementById('foldAvailableQty').value = '';
    document.getElementById('foldQty').value = '0';
    renderFoldEntries();
    renderTasselEntries();
    renderOverlockEntries();
    populateAvailableTowels();
    updateDashboard();
    showToast('Fold entry added successfully!');
}

function deleteFoldEntry(id) {
    if (confirm('Delete this entry?')) {
        data.foldEntries = data.foldEntries.filter(e => e.id !== id);
        saveData();
        renderFoldEntries();
        renderTasselEntries();
        renderOverlockEntries();
        populateAvailableTowels();
        updateDashboard();
        showToast('Entry deleted');
    }
}

function renderFoldEntries() {
    const today = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('foldTableBody');
    
    const todayEntries = data.foldEntries.filter(e => e.date === today);
    
    tbody.innerHTML = todayEntries.map(e => {
        const worker = data.workers.find(w => w.id === e.workerId);
        const amount = e.qty * e.rate;
        
        return `
            <tr>
                <td>${worker ? worker.name : 'Unknown'}</td>
                <td>${e.towelType}</td>
                <td>${e.qty}</td>
                <td>₹${e.rate.toFixed(2)}</td>
                <td>₹${amount.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteFoldEntry(${e.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    
    // Worker counts
    const overlockCount = data.workers.filter(w => w.group === 'Overlock').length;
    const tasselCount = data.workers.filter(w => w.group === 'Tassel').length;
    const foldCount = data.workers.filter(w => w.group === 'Fold').length;
    
    document.getElementById('totalWorkers').textContent = data.workers.length;
    document.getElementById('overlockCount').textContent = overlockCount;
    document.getElementById('tasselCount').textContent = tasselCount;
    document.getElementById('foldCount').textContent = foldCount;
    
    // Today's entries
    const todayOverlock = data.overlockEntries.filter(e => e.date === today);
    const todayTassel = data.tasselEntries.filter(e => e.date === today);
    const todayFold = data.foldEntries.filter(e => e.date === today);
    
    // Calculate completed production (all 3 stages complete)
    let totalCompleted = 0;
    let totalPending = 0;
    
    // Check tassel entries that are folded
    todayTassel.forEach(tassel => {
        const foldedForThis = data.foldEntries
            .filter(f => f.tasselEntryId === tassel.id)
            .reduce((sum, f) => sum + f.qty, 0);
        
        totalCompleted += foldedForThis;
        totalPending += (tassel.qty - foldedForThis);
    });
    
    // Check overlock direct-to-fold entries
    todayOverlock.forEach(overlock => {
        if (overlock.nextStep === 'Fold') {
            const foldedForThis = data.foldEntries
                .filter(f => f.overlockEntryId === overlock.id)
                .reduce((sum, f) => sum + f.qty, 0);
            
            totalCompleted += foldedForThis;
            totalPending += (overlock.qty - foldedForThis);
        }
    });
    
    document.getElementById('todayProduction').textContent = totalCompleted;
    document.getElementById('pendingFold').textContent = totalPending;
    
    // Calculate total earnings (ALL workers)
    const overlockEarnings = todayOverlock.reduce((sum, e) => sum + (e.qty * e.rate), 0);
    const tasselEarnings = todayTassel.reduce((sum, e) => sum + (e.qty * e.rate), 0);
    const foldEarnings = todayFold.reduce((sum, e) => sum + (e.qty * e.rate), 0);
    
    const totalEarnings = overlockEarnings + tasselEarnings + foldEarnings;
    
    document.getElementById('totalEarnings').textContent = '₹' + totalEarnings.toFixed(2);
}

// ==================== REPORTS (SIMPLIFIED) ====================
function updateReportControls() {
    const reportType = document.getElementById('reportType').value;
    const dateControl = document.getElementById('dateControl');
    const weekSelector = document.getElementById('weekSelector');

    if (reportType === 'daily') {
        dateControl.style.display = 'block';
        weekSelector.classList.add('hidden');
    } else if (reportType === 'weekly') {
        dateControl.style.display = 'none';
        weekSelector.classList.remove('hidden');
        generateWeekSelector();
    } else if (reportType === 'monthly') {
        dateControl.style.display = 'block';
        weekSelector.classList.add('hidden');
    }
}

function generateWeekSelector() {
    const weekBars = document.getElementById('weekBars');
    weekBars.innerHTML = '';
    const today = new Date();
    
    for (let i = 4; i >= 0; i--) {
        const monday = new Date(today);
        monday.setDate(monday.getDate() - (monday.getDay() - 1 + (7 * i)));
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        const weekStart = monday.toISOString().split('T')[0];
        const weekEnd = sunday.toISOString().split('T')[0];
        const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        const bar = document.createElement('div');
        bar.className = 'week-bar';
        bar.innerHTML = `<div class="week-bar-label">${weekLabel}</div><div class="week-bar-date">${weekStart}</div>`;
        bar.onclick = () => selectWeek(weekStart, weekEnd, bar);
        weekBars.appendChild(bar);
    }
}

function selectWeek(weekStart, weekEnd, element) {
    document.querySelectorAll('.week-bar').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('reportDate').value = weekStart;
}

function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const reportDate = document.getElementById('reportDate').value;
    
    showToast(`Generating ${reportType} report...`);
    // Simplified - just show message for now
    document.getElementById('reportOutput').innerHTML = `
        <div class="info-box">Report generation in progress...</div>
        <p>Full reporting will be available in the next update.</p>
    `;
}

// ==================== UTILITIES ====================
function showToast(message, type = 'info') {
    try {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = 'toast show';
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    } catch (error) {
        console.error('Toast error:', error);
    }
}

function saveData() {
    localStorage.setItem('workers', JSON.stringify(data.workers));
    localStorage.setItem('overlockEntries', JSON.stringify(data.overlockEntries));
    localStorage.setItem('tasselEntries', JSON.stringify(data.tasselEntries));
    localStorage.setItem('foldEntries', JSON.stringify(data.foldEntries));
}

// ==================== CLEAR ALL DATA ====================
function clearAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL data (workers, entries, everything)!\n\nAre you absolutely sure?')) {
        if (confirm('Last chance! This cannot be undone. Delete everything?')) {
            localStorage.clear();
            location.reload();
            showToast('All data cleared! Starting fresh...');
        }
    }
}

// Initialize app when page loads
window.addEventListener('load', initApp);
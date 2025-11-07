// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
  apiKey: "AIzaSyD0lZv_e-pzwn5Yex0PKEsQmt3MJL1WmBI",
  authDomain: "namma-veetu-company.firebaseapp.com",
  projectId: "namma-veetu-company",
  storageBucket: "namma-veetu-company.firebasestorage.app",
  messagingSenderId: "501016676289",
  appId: "1:501016676289:web:373797cb9ddcb3f7ac5140",
  measurementId: "G-E9G7N9ZENT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ✅ Enable offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser doesn\'t support persistence');
    }
  });

// Collection names
const COLLECTIONS = {
  workers: 'workers',
  places: 'places',
  overlockEntries: 'overlockEntries',
  tasselEntries: 'tasselEntries',
  foldEntries: 'foldEntries',
  deliveryEntries: 'deliveryEntries'
};

// ==================== DATA MANAGEMENT (FIREBASE) ====================
const data = {
  workers: [],
  places: [],
  overlockEntries: [],
  tasselEntries: [],
  foldEntries: [],
  deliveryEntries: []
};

// ==================== FIREBASE HELPER FUNCTIONS ====================
async function loadFromFirebase(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error loading ${collectionName}:`, error);
    showToast(`Error loading ${collectionName}`, 'error');
    return [];
  }
}

async function saveToFirebase(collectionName, dataObj) {
  try {
    const docRef = await db.collection(collectionName).add(dataObj);
    return docRef.id;
  } catch (error) {
    console.error(`Error saving to ${collectionName}:`, error);
    showToast(`Error saving to ${collectionName}`, 'error');
    return null;
  }
}

async function deleteFromFirebase(collectionName, firebaseId) {
  try {
    await db.collection(collectionName).doc(firebaseId).delete();
    return true;
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error);
    showToast(`Error deleting from ${collectionName}`, 'error');
    return false;
  }
}

// ==================== INITIALIZATION ====================
async function initApp() {
  try {
    showToast('Loading data from cloud...');
    
    // Load all data from Firebase
    data.workers = await loadFromFirebase(COLLECTIONS.workers);
    data.places = await loadFromFirebase(COLLECTIONS.places);
    data.overlockEntries = await loadFromFirebase(COLLECTIONS.overlockEntries);
    data.tasselEntries = await loadFromFirebase(COLLECTIONS.tasselEntries);
    data.foldEntries = await loadFromFirebase(COLLECTIONS.foldEntries);
    data.deliveryEntries = await loadFromFirebase(COLLECTIONS.deliveryEntries);

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('overlockDate').value  = today;
    document.getElementById('tasselDate').value    = today;
    document.getElementById('foldDate').value      = today;
    document.getElementById('deliveryDate').value  = today;
    document.getElementById('reportDate').value    = today;

    populateWorkerSelects(); populatePlaceSelects();
    renderWorkers(); renderPlaces();
    renderOverlockEntries(); renderTasselEntries(); renderFoldEntries(); renderDeliveryEntries();
    populateAvailableTowelsForTassel(); populateAvailableTowels(); populateFoldedTowels();
    updateDashboard(); updateReportTypeUI();
    initMobileMenu();

    setTimeout(() => {
      const ls = document.getElementById('loadingScreen');
      if (ls) ls.classList.add('hidden');
    }, 500);
    
    showToast('Data loaded successfully! ✅');
  } catch (error) {
    console.error('Initialization error:', error);
    const ls = document.getElementById('loadingScreen');
    if (ls) ls.innerHTML = '<p style="color: red;">Error loading app. Please refresh the page.</p>';
    showToast('Error initializing app', 'error');
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
  } catch (error) { console.error('Tab switch error:', error); }
}

// ==================== WORKER MANAGEMENT ====================
async function addWorker() {
  const id = document.getElementById('workerId').value.trim();
  const name = document.getElementById('workerName').value.trim();
  if (!id || !name) { showToast('Please fill all fields', 'error'); return; }
  if (data.workers.some(w => w.id === id)) { showToast('Worker ID already exists', 'error'); return; }
  
  const workerData = { id, name, active: true, createdAt: new Date().toISOString() };
  const firebaseId = await saveToFirebase(COLLECTIONS.workers, workerData);
  
  if (firebaseId) {
    data.workers.push({ firebaseId, ...workerData });
    clearWorkerForm(); renderWorkers(); populateWorkerSelects(); updateDashboard();
    showToast(`Worker ${name} added successfully!`);
  }
}

async function deleteWorker(firebaseId) {
  if (confirm('Are you sure you want to delete this worker?')) {
    const success = await deleteFromFirebase(COLLECTIONS.workers, firebaseId);
    if (success) {
      data.workers = data.workers.filter(w => w.firebaseId !== firebaseId);
      renderWorkers(); populateWorkerSelects(); updateDashboard(); showToast('Worker deleted');
    }
  }
}

function renderWorkers() {
  const tbody = document.getElementById('workersTableBody');
  tbody.innerHTML = data.workers.map(w => `
    <tr>
      <td>${w.id}</td><td>${w.name}</td>
      <td><span class="badge badge-success">Active</span></td>
      <td><button class="btn btn-danger btn-small" onclick="deleteWorker('${w.firebaseId}')">Delete</button></td>
    </tr>`).join('');
}

function clearWorkerForm(){ document.getElementById('workerId').value=''; document.getElementById('workerName').value=''; }

function populateWorkerSelects() {
  const opts = '<option>Select Worker</option>' + data.workers.map(w => `<option value="${w.id}">${w.name} (${w.id})</option>`).join('');
  document.getElementById('overlockWorker').innerHTML = opts;
  document.getElementById('tasselWorker').innerHTML = opts;
  document.getElementById('foldWorker').innerHTML = opts;
}

// ==================== DELIVERY PLACES ====================
async function addPlace() {
  const id = document.getElementById('placeId').value.trim();
  const name = document.getElementById('placeName').value.trim();
  if (!id || !name) { showToast('Please fill all fields', 'error'); return; }
  if (data.places.some(p => p.id === id)) { showToast('Place ID already exists', 'error'); return; }
  
  const placeData = { id, name, active: true, createdAt: new Date().toISOString() };
  const firebaseId = await saveToFirebase(COLLECTIONS.places, placeData);
  
  if (firebaseId) {
    data.places.push({ firebaseId, ...placeData });
    clearPlaceForm(); renderPlaces(); populatePlaceSelects();
    showToast(`Delivery place ${name} added successfully!`);
  }
}

async function deletePlace(firebaseId) {
  if (confirm('Are you sure you want to delete this delivery place?')) {
    const success = await deleteFromFirebase(COLLECTIONS.places, firebaseId);
    if (success) {
      data.places = data.places.filter(p => p.firebaseId !== firebaseId);
      renderPlaces(); populatePlaceSelects(); showToast('Delivery place deleted');
    }
  }
}

function renderPlaces() {
  const tbody = document.getElementById('placesTableBody');
  tbody.innerHTML = data.places.map(p => `
    <tr>
      <td>${p.id}</td><td>${p.name}</td>
      <td><span class="badge badge-success">Active</span></td>
      <td><button class="btn btn-danger btn-small" onclick="deletePlace('${p.firebaseId}')">Delete</button></td>
    </tr>`).join('');
}

function clearPlaceForm(){ document.getElementById('placeId').value=''; document.getElementById('placeName').value=''; }

function populatePlaceSelects() {
  const opts = '<option>Select Location</option>' + data.places.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');
  document.getElementById('deliveryPlace').innerHTML = opts;
}

// ==================== OVERLOCK ====================
async function addOverlockEntry() {
  const date = document.getElementById('overlockDate').value;
  const workerId = document.getElementById('overlockWorker').value;
  const towelType = document.getElementById('overlockTowelType').value.trim();
  const price = parseFloat(document.getElementById('overlockPrice').value) || 0;
  const qty = parseInt(document.getElementById('overlockQty').value) || 0;
  const nextStep = document.getElementById('overlockNextStep').value;

  if (!date || workerId === 'Select Worker' || !towelType || price <= 0 || qty <= 0) {
    showToast('Please fill all fields correctly', 'error'); return;
  }
  
  const entryData = { date, workerId, towelType, qty, rate: price, nextStep, createdAt: new Date().toISOString() };
  const firebaseId = await saveToFirebase(COLLECTIONS.overlockEntries, entryData);
  
  if (firebaseId) {
    data.overlockEntries.push({ firebaseId, ...entryData });
    document.getElementById('overlockTowelType').value=''; document.getElementById('overlockPrice').value='0'; document.getElementById('overlockQty').value='0';
    renderOverlockEntries(); populateAvailableTowelsForTassel(); populateAvailableTowels(); updateDashboard();
    showToast('Overlock entry added successfully!');
  }
}

async function deleteOverlockEntry(firebaseId) {
  if (confirm('Delete this entry?')) {
    const success = await deleteFromFirebase(COLLECTIONS.overlockEntries, firebaseId);
    if (success) {
      data.overlockEntries = data.overlockEntries.filter(e => e.firebaseId !== firebaseId);
      renderOverlockEntries(); populateAvailableTowelsForTassel(); populateAvailableTowels(); updateDashboard(); showToast('Entry deleted');
    }
  }
}

function renderOverlockEntries() {
  const today = new Date().toISOString().split('T')[0];
  const tbody = document.getElementById('overlockTableBody');
  const todayEntries = data.overlockEntries.filter(e => e.date === today);
  tbody.innerHTML = todayEntries.map(e => {
    const worker = data.workers.find(w => w.id === e.workerId);
    const amount = e.qty * e.rate;
    let status = '';
    if (e.nextStep === 'Tassel') {
      const tasselQty = data.tasselEntries.filter(t => t.overlockEntryId === e.firebaseId).reduce((s,t)=>s+t.qty,0);
      status = tasselQty >= e.qty ? '<span class="badge badge-success">Completed</span>' : '<span class="badge badge-warning">Pending Tassel</span>';
    } else {
      const foldQty = data.foldEntries.filter(f => f.overlockEntryId === e.firebaseId).reduce((s,f)=>s+f.qty,0);
      status = foldQty >= e.qty ? '<span class="badge badge-success">Completed</span>' : '<span class="badge badge-warning">Pending Fold</span>';
    }
    return `
      <tr>
        <td>${worker ? worker.name : 'Unknown'}</td>
        <td>${e.towelType}</td><td>${e.qty}</td>
        <td>₹${e.rate.toFixed(2)}</td><td>₹${amount.toFixed(2)}</td>
        <td><span class="badge badge-info">${e.nextStep}</span></td>
        <td>${status}</td>
        <td><button class="btn btn-danger btn-small" onclick="deleteOverlockEntry('${e.firebaseId}')">Delete</button></td>
      </tr>`;
  }).join('');
}

// ==================== TASSEL ====================
function populateAvailableTowelsForTassel() {
  const date = document.getElementById('tasselDate').value;
  const sel = document.getElementById('tasselTowelSelect');
  const overlockForTassel = data.overlockEntries.filter(e => e.date === date && e.nextStep === 'Tassel');
  const available = [];
  overlockForTassel.forEach(overlock => {
    const worker = data.workers.find(w => w.id === overlock.workerId);
    const tasselQty = data.tasselEntries.filter(t => t.date === date && t.overlockEntryId === overlock.firebaseId).reduce((s,t)=>s+t.qty,0);
    const remaining = overlock.qty - tasselQty;
    if (remaining > 0) available.push({ id: overlock.firebaseId, towelType: overlock.towelType, remaining, workerName: worker ? worker.name : 'Unknown' });
  });
  sel.innerHTML = available.length === 0
    ? '<option value="">No overlock towels waiting for tassel</option>'
    : '<option value="">Select available towel</option>' +
      available.map(t => `<option value="${t.id}">${t.towelType} (${t.workerName} - ${t.remaining} pcs)</option>`).join('');
}

function updateTasselDetails() {
  const selectedId = document.getElementById('tasselTowelSelect').value;
  if (!selectedId) {
    document.getElementById('tasselTowelType').value=''; document.getElementById('tasselPreviousWorker').value='';
    document.getElementById('tasselAvailableQty').value=''; document.getElementById('tasselPrice').value='0'; document.getElementById('tasselQty').value='0';
    return;
  }
  const date = document.getElementById('tasselDate').value;
  const entry = data.overlockEntries.find(e => e.firebaseId === selectedId);
  if (entry) {
    const worker = data.workers.find(w => w.id === entry.workerId);
    const tasselQty = data.tasselEntries.filter(t => t.date === date && t.overlockEntryId === entry.firebaseId).reduce((s,t)=>s+t.qty,0);
    const remaining = entry.qty - tasselQty;
    document.getElementById('tasselTowelType').value = entry.towelType;
    document.getElementById('tasselPreviousWorker').value = worker ? worker.name : 'Unknown';
    document.getElementById('tasselAvailableQty').value = remaining;
    document.getElementById('tasselPrice').value = '0'; document.getElementById('tasselQty').value = '0';
  }
}

async function addTasselEntry() {
  const date = document.getElementById('tasselDate').value;
  const workerId = document.getElementById('tasselWorker').value;
  const selectedId = document.getElementById('tasselTowelSelect').value;
  const towelType = document.getElementById('tasselTowelType').value.trim();
  const price = parseFloat(document.getElementById('tasselPrice').value);
  const qty = parseInt(document.getElementById('tasselQty').value);
  const availableQty = parseInt(document.getElementById('tasselAvailableQty').value) || 0;

  if (!date || workerId === 'Select Worker' || !selectedId || !towelType || !price || price <= 0 || !qty || qty <= 0) {
    showToast('Please select a towel and fill all fields correctly', 'error'); return;
  }
  if (qty > availableQty) { showToast(`Only ${availableQty} pcs available for tassel!`, 'error'); return; }

  const entryData = { date, workerId, towelType, qty, rate: price, overlockEntryId: selectedId, createdAt: new Date().toISOString() };
  const firebaseId = await saveToFirebase(COLLECTIONS.tasselEntries, entryData);
  
  if (firebaseId) {
    data.tasselEntries.push({ firebaseId, ...entryData });
    document.getElementById('tasselTowelSelect').value=''; document.getElementById('tasselTowelType').value='';
    document.getElementById('tasselPrice').value='0'; document.getElementById('tasselPreviousWorker').value='';
    document.getElementById('tasselAvailableQty').value=''; document.getElementById('tasselQty').value='0';
    renderTasselEntries(); renderOverlockEntries(); populateAvailableTowelsForTassel(); populateAvailableTowels(); updateDashboard();
    showToast('Tassel entry added successfully!');
  }
}

async function deleteTasselEntry(firebaseId){
  if (confirm('Delete this entry?')) {
    const success = await deleteFromFirebase(COLLECTIONS.tasselEntries, firebaseId);
    if (success) {
      data.tasselEntries = data.tasselEntries.filter(e => e.firebaseId !== firebaseId);
      renderTasselEntries(); renderOverlockEntries(); populateAvailableTowelsForTassel(); populateAvailableTowels(); updateDashboard(); showToast('Entry deleted');
    }
  }
}

function renderTasselEntries() {
  const today = new Date().toISOString().split('T')[0];
  const tbody = document.getElementById('tasselTableBody');
  const entries = data.tasselEntries.filter(e => e.date === today);
  tbody.innerHTML = entries.map(e => {
    const worker = data.workers.find(w => w.id === e.workerId);
    const amount = e.qty * e.rate;
    const foldQty = data.foldEntries.filter(f => f.tasselEntryId === e.firebaseId).reduce((s,f)=>s+f.qty,0);
    const status = foldQty >= e.qty ? '<span class="badge badge-success">Completed</span>' : '<span class="badge badge-warning">Pending Fold</span>';
    return `
      <tr>
        <td>${worker ? worker.name : 'Unknown'}</td>
        <td>${e.towelType}</td><td>${e.qty}</td>
        <td>₹${e.rate.toFixed(2)}</td><td>₹${amount.toFixed(2)}</td>
        <td>${status}</td>
        <td><button class="btn btn-danger btn-small" onclick="deleteTasselEntry('${e.firebaseId}')">Delete</button></td>
      </tr>`;
  }).join('');
}

// ==================== FOLD ====================
function populateAvailableTowels() {
  const date = document.getElementById('foldDate').value;
  const sel = document.getElementById('foldTowelSelect');
  const available = [];

  const tasselEntries = data.tasselEntries.filter(e => e.date === date);
  tasselEntries.forEach(t => {
    const worker = data.workers.find(w => w.id === t.workerId);
    const foldedQty = data.foldEntries.filter(f => f.date === date && f.tasselEntryId === t.firebaseId).reduce((s,f)=>s+f.qty,0);
    const remaining = t.qty - foldedQty;
    if (remaining > 0) available.push({ type:'tassel', id:t.firebaseId, towelType:t.towelType, remaining, workerName: worker ? worker.name : 'Unknown', source:'Tassel' });
  });

  const overlockForFold = data.overlockEntries.filter(e => e.date === date && e.nextStep === 'Fold');
  overlockForFold.forEach(o => {
    const worker = data.workers.find(w => w.id === o.workerId);
    const foldedQty = data.foldEntries.filter(f => f.date === date && f.overlockEntryId === o.firebaseId).reduce((s,f)=>s+f.qty,0);
    const remaining = o.qty - foldedQty;
    if (remaining > 0) available.push({ type:'overlock', id:o.firebaseId, towelType:o.towelType, remaining, workerName: worker ? worker.name : 'Unknown', source:'Overlock' });
  });

  sel.innerHTML = available.length === 0
    ? '<option value="">No towels ready for folding</option>'
    : '<option value="">Select available towel</option>' +
      available.map(t => `<option value="${t.type}-${t.id}">${t.towelType} (${t.workerName} - ${t.remaining} pcs) [${t.source}]</option>`).join('');
}

function updateFoldDetails() {
  const selected = document.getElementById('foldTowelSelect').value;
  if (!selected) {
    document.getElementById('foldTowelType').value=''; document.getElementById('foldPreviousWorker').value='';
    document.getElementById('foldAvailableQty').value=''; document.getElementById('foldPrice').value='0'; document.getElementById('foldQty').value='0';
    return;
  }
  const [type, fid] = selected.split('-');
  const date = document.getElementById('foldDate').value;

  let entry, worker, foldedQty = 0, remaining = 0;
  if (type === 'tassel') {
    entry = data.tasselEntries.find(e => e.firebaseId === fid);
    if (entry) {
      worker = data.workers.find(w => w.id === entry.workerId);
      foldedQty = data.foldEntries.filter(f => f.date === date && f.tasselEntryId === entry.firebaseId).reduce((s,f)=>s+f.qty,0);
      remaining = entry.qty - foldedQty;
    }
  } else {
    entry = data.overlockEntries.find(e => e.firebaseId === fid);
    if (entry) {
      worker = data.workers.find(w => w.id === entry.workerId);
      foldedQty = data.foldEntries.filter(f => f.date === date && f.overlockEntryId === entry.firebaseId).reduce((s,f)=>s+f.qty,0);
      remaining = entry.qty - foldedQty;
    }
  }
  if (entry) {
    document.getElementById('foldTowelType').value = entry.towelType;
    document.getElementById('foldPreviousWorker').value = worker ? worker.name : 'Unknown';
    document.getElementById('foldAvailableQty').value = remaining;
    document.getElementById('foldPrice').value = '0'; document.getElementById('foldQty').value = '0';
  }
}

async function addFoldEntry() {
  const date = document.getElementById('foldDate').value;
  const workerId = document.getElementById('foldWorker').value;
  const selectedValue = document.getElementById('foldTowelSelect').value;
  const towelType = document.getElementById('foldTowelType').value.trim();
  const price = parseFloat(document.getElementById('foldPrice').value);
  const qty = parseInt(document.getElementById('foldQty').value);
  const availableQty = parseInt(document.getElementById('foldAvailableQty').value) || 0;

  if (!date || workerId === 'Select Worker' || !selectedValue || !towelType || !price || price <= 0 || !qty || qty <= 0) {
    showToast('Please select a towel and fill all fields correctly', 'error'); return;
  }
  if (qty > availableQty) { showToast(`Only ${availableQty} pcs available to fold!`, 'error'); return; }

  const [type, fid] = selectedValue.split('-');
  const foldData = { date, workerId, towelType, qty, rate: price, createdAt: new Date().toISOString() };
  if (type === 'tassel') foldData.tasselEntryId = fid; else foldData.overlockEntryId = fid;

  const firebaseId = await saveToFirebase(COLLECTIONS.foldEntries, foldData);
  
  if (firebaseId) {
    data.foldEntries.push({ firebaseId, ...foldData });
    document.getElementById('foldTowelSelect').value=''; document.getElementById('foldTowelType').value='';
    document.getElementById('foldPrice').value='0'; document.getElementById('foldPreviousWorker').value='';
    document.getElementById('foldAvailableQty').value=''; document.getElementById('foldQty').value='0';
    renderFoldEntries(); renderTasselEntries(); renderOverlockEntries(); populateAvailableTowels(); populateFoldedTowels(); updateDashboard();
    showToast('Fold entry added successfully!');
  }
}

async function deleteFoldEntry(firebaseId){
  if (confirm('Delete this entry?')) {
    const success = await deleteFromFirebase(COLLECTIONS.foldEntries, firebaseId);
    if (success) {
      data.foldEntries = data.foldEntries.filter(e => e.firebaseId !== firebaseId);
      renderFoldEntries(); renderTasselEntries(); renderOverlockEntries(); populateAvailableTowels(); populateFoldedTowels(); updateDashboard(); showToast('Entry deleted');
    }
  }
}

function renderFoldEntries(){
  const today = new Date().toISOString().split('T')[0];
  const tbody = document.getElementById('foldTableBody');
  const entries = data.foldEntries.filter(e => e.date === today);
  tbody.innerHTML = entries.map(e => {
    const worker = data.workers.find(w => w.id === e.workerId);
    const amount = e.qty * e.rate;
    return `
      <tr>
        <td>${worker ? worker.name : 'Unknown'}</td>
        <td>${e.towelType}</td><td>${e.qty}</td>
        <td>₹${e.rate.toFixed(2)}</td><td>₹${amount.toFixed(2)}</td>
        <td><button class="btn btn-danger btn-small" onclick="deleteFoldEntry('${e.firebaseId}')">Delete</button></td>
      </tr>`;
  }).join('');
}

// ==================== DELIVERY ====================
function populateFoldedTowels(){
  const date = document.getElementById('deliveryDate').value;
  const sel = document.getElementById('deliveryTowelSelect');
  const folded = data.foldEntries.filter(e => e.date === date);
  const map = {};
  folded.forEach(f => { map[f.towelType] = (map[f.towelType]||0) + f.qty; });
  const delivered = data.deliveryEntries.filter(e => e.date === date);
  delivered.forEach(d => { if (map[d.towelType]) map[d.towelType] -= d.qty; });
  const available = Object.entries(map).filter(([_,q]) => q>0).map(([type,q]) => ({towelType:type, remaining:q}));

  sel.innerHTML = available.length === 0
    ? '<option value="">No folded towels available for delivery</option>'
    : '<option value="">Select towel type</option>' +
      available.map(t => `<option value="${t.towelType}">${t.towelType} (${t.remaining} pcs available)</option>`).join('');
}

function updateDeliveryDetails(){
  const type = document.getElementById('deliveryTowelSelect').value;
  if (!type){ document.getElementById('deliveryAvailableQty').value=''; document.getElementById('deliveryQty').value='0'; return; }
  const date = document.getElementById('deliveryDate').value;
  const foldedQty = data.foldEntries.filter(e => e.date===date && e.towelType===type).reduce((s,e)=>s+e.qty,0);
  const deliveredQty = data.deliveryEntries.filter(e => e.date===date && e.towelType===type).reduce((s,e)=>s+e.qty,0);
  document.getElementById('deliveryAvailableQty').value = foldedQty - deliveredQty;
  document.getElementById('deliveryQty').value = '0';
}

async function addDeliveryEntry(){
  const date = document.getElementById('deliveryDate').value;
  const towelType = document.getElementById('deliveryTowelSelect').value;
  const qty = parseInt(document.getElementById('deliveryQty').value);
  const availableQty = parseInt(document.getElementById('deliveryAvailableQty').value) || 0;
  const placeId = document.getElementById('deliveryPlace').value;

  if (!date || !towelType || !qty || qty <= 0 || placeId === 'Select Location') {
    showToast('Please fill all fields correctly', 'error'); return;
  }
  if (qty > availableQty) { showToast(`Only ${availableQty} pcs available for delivery!`, 'error'); return; }

  const place = data.places.find(p => p.id === placeId);
  const deliveryData = { date, towelType, qty, placeId, placeName: place ? place.name : 'Unknown', createdAt: new Date().toISOString() };
  const firebaseId = await saveToFirebase(COLLECTIONS.deliveryEntries, deliveryData);
  
  if (firebaseId) {
    data.deliveryEntries.push({ firebaseId, ...deliveryData });
    document.getElementById('deliveryTowelSelect').value=''; document.getElementById('deliveryAvailableQty').value='';
    document.getElementById('deliveryQty').value='0'; document.getElementById('deliveryPlace').value='Select Location';
    renderDeliveryEntries(); populateFoldedTowels(); updateDashboard(); showToast('Delivery entry added successfully!');
  }
}

async function deleteDeliveryEntry(firebaseId){
  if (confirm('Delete this delivery entry?')) {
    const success = await deleteFromFirebase(COLLECTIONS.deliveryEntries, firebaseId);
    if (success) {
      data.deliveryEntries = data.deliveryEntries.filter(e => e.firebaseId !== firebaseId);
      renderDeliveryEntries(); populateFoldedTowels(); updateDashboard(); showToast('Delivery entry deleted');
    }
  }
}

function renderDeliveryEntries(){
  const today = new Date().toISOString().split('T')[0];
  const tbody = document.getElementById('deliveryTableBody');
  const entries = data.deliveryEntries.filter(e => e.date === today);
  tbody.innerHTML = entries.map(e => `
    <tr>
      <td>${e.towelType}</td><td>${e.qty}</td><td>${e.placeName}</td><td>${e.date}</td>
      <td><button class="btn btn-danger btn-small" onclick="deleteDeliveryEntry('${e.firebaseId}')">Delete</button></td>
    </tr>`).join('');
}

// ==================== DASHBOARD ====================
function updateDashboard(){
  const today = new Date().toISOString().split('T')[0];
  const workers = data.workers.length;
  
  document.getElementById('totalWorkers').textContent = workers;
  const mobileTotalWorkers = document.getElementById('mobileTotalWorkers');
  if (mobileTotalWorkers) mobileTotalWorkers.textContent = workers;

  const todayOverlock = data.overlockEntries.filter(e => e.date === today);
  const todayTassel   = data.tasselEntries.filter(e => e.date === today);
  const todayFold     = data.foldEntries.filter(e => e.date === today);

  let totalCompleted = 0;
  todayTassel.forEach(t => totalCompleted += data.foldEntries.filter(f => f.tasselEntryId === t.firebaseId).reduce((s,f)=>s+f.qty,0));
  todayOverlock.forEach(o => {
    if (o.nextStep === 'Fold') totalCompleted += data.foldEntries.filter(f => f.overlockEntryId === o.firebaseId).reduce((s,f)=>s+f.qty,0);
  });
  
  document.getElementById('todayProduction').textContent = totalCompleted;
  const mobileTodayProduction = document.getElementById('mobileTodayProduction');
  if (mobileTodayProduction) mobileTodayProduction.textContent = totalCompleted + ' pcs';

  const totalFolded = todayFold.reduce((s,e)=>s+e.qty,0);
  const totalDelivered = data.deliveryEntries.filter(e => e.date === today).reduce((s,e)=>s+e.qty,0);
  const ready = totalFolded - totalDelivered;
  
  document.getElementById('readyDelivery').textContent = ready;
  const mobileReadyDelivery = document.getElementById('mobileReadyDelivery');
  if (mobileReadyDelivery) mobileReadyDelivery.textContent = ready + ' pcs';

  const overlockE = todayOverlock.reduce((s,e)=>s+(e.qty*e.rate),0);
  const tasselE   = todayTassel.reduce((s,e)=>s+(e.qty*e.rate),0);
  const foldE     = todayFold.reduce((s,e)=>s+(e.qty*e.rate),0);
  const earnings = '₹' + (overlockE + tasselE + foldE).toFixed(2);
  
  document.getElementById('totalEarnings').textContent = earnings;
  const mobileTotalEarnings = document.getElementById('mobileTotalEarnings');
  if (mobileTotalEarnings) mobileTotalEarnings.textContent = earnings;
}
// ==================== REPORT TYPE UI - MONTH-BASED WEEK SELECTOR ====================
function updateReportTypeUI(){
  const reportType = document.getElementById('reportType').value;
  const dateSelector = document.getElementById('dateSelector');
  const weeklySelectors = document.getElementById('weeklySelectors');
  const monthSelector = document.getElementById('monthSelector');

  dateSelector.style.display = 'none';
  weeklySelectors.style.display = 'none';
  monthSelector.style.display = 'none';

  if (reportType === 'daily') {
    dateSelector.style.display = 'block';
  } else if (reportType === 'weekly') {
    weeklySelectors.style.display = 'block';
    generateMonthOptionsForWeek();
  } else if (reportType === 'monthly') {
    monthSelector.style.display = 'block';
    generateMonthOptions();
  }
}

function generateMonthOptionsForWeek(){
  const weekMonthSelect = document.getElementById('weekMonthSelect');
  const months = [];
  const currentYear = new Date().getFullYear();
  
  for (let month = 0; month < 12; month++) {
    const date = new Date(currentYear, month, 1);
    const monthStart = new Date(currentYear, month, 1).toISOString().split('T')[0];
    const monthEnd = new Date(currentYear, month + 1, 0).toISOString().split('T')[0];
    const monthLabel = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    months.push({monthStart, monthEnd, monthLabel});
  }
  
  weekMonthSelect.innerHTML = '<option value="">Choose month first...</option>' +
    months.map(m => `<option value="${m.monthStart}|${m.monthEnd}">${m.monthLabel}</option>`).join('');
  
  document.getElementById('weekSelect').innerHTML = '<option value="">Select month first...</option>';
}

function updateWeeksForMonth(){
  const weekMonthValue = document.getElementById('weekMonthSelect').value;
  const weekSelect = document.getElementById('weekSelect');
  
  if (!weekMonthValue) {
    weekSelect.innerHTML = '<option value="">Select month first...</option>';
    return;
  }
  
  const [monthStart, monthEnd] = weekMonthValue.split('|');
  const startDate = new Date(monthStart);
  const endDate = new Date(monthEnd);
  const weeks = [];
  
  let currentDate = new Date(startDate);
  const day = currentDate.getDay();
  const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
  currentDate.setDate(diff);
  
  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const weekLabel = `${weekStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} - ${weekEnd.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`;
    
    weeks.push({weekStart:weekStartStr,weekEnd:weekEndStr,weekLabel});
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  weekSelect.innerHTML = '<option value="">Select Week (வாரம்)</option>' +
    weeks.map(w => `<option value="${w.weekStart}|${w.weekEnd}">${w.weekLabel}</option>`).join('');
}

function generateMonthOptions(){
  const monthSelect = document.getElementById('monthSelect');
  const months = []; const today = new Date();
  for (let i=0;i<12;i++){
    const date = new Date(today.getFullYear(), today.getMonth()-i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd   = new Date(date.getFullYear(), date.getMonth()+1, 0).toISOString().split('T')[0];
    const monthLabel = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    months.push({monthStart,monthEnd,monthLabel});
  }
  monthSelect.innerHTML = '<option value="">Select Month (மாதம்)</option>' +
    months.map(m => `<option value="${m.monthStart}|${m.monthEnd}">${m.monthLabel}</option>`).join('');
}

// ==================== REPORT GENERATION ====================
function generateReport(){
  const reportType = document.getElementById('reportType').value;
  let startDate, endDate;
  if (reportType === 'daily') {
    const d = document.getElementById('reportDate').value; 
    if (!d){ showToast('Please select a date','error'); return; } 
    startDate = endDate = d;
  } else if (reportType === 'weekly') {
    const w = document.getElementById('weekSelect').value; 
    if (!w){ showToast('Please select a week','error'); return; } 
    [startDate,endDate] = w.split('|');
  } else {
    const m = document.getElementById('monthSelect').value; 
    if (!m){ showToast('Please select a month','error'); return; } 
    [startDate,endDate] = m.split('|');
  }
  showToast(`Generating ${reportType} report...`);
  const overlockData = data.overlockEntries.filter(e => e.date >= startDate && e.date <= endDate);
  const tasselData   = data.tasselEntries.filter(e => e.date >= startDate && e.date <= endDate);
  const foldData     = data.foldEntries.filter(e => e.date >= startDate && e.date <= endDate);
  const deliveryData = data.deliveryEntries.filter(e => e.date >= startDate && e.date <= endDate);
  const html = generateReportHTML(reportType, startDate, endDate, overlockData, tasselData, foldData, deliveryData);
  document.getElementById('reportOutput').innerHTML = html;
  showToast('Report generated successfully!');
}

// ==================== DAY-WISE WEEKLY REPORT GENERATION ====================
function generateReportHTML(reportType, startDate, endDate, overlockData, tasselData, foldData, deliveryData) {
  if (reportType === 'weekly') {
    return generateWeeklyDayWiseReport(startDate, endDate, overlockData, tasselData, foldData, deliveryData);
  } else {
    return generateStandardReport(reportType, startDate, endDate, overlockData, tasselData, foldData, deliveryData);
  }
}

function generateWeeklyDayWiseReport(startDate, endDate, overlockData, tasselData, foldData, deliveryData) {
  const dateRange = `${startDate} to ${endDate}`;
  const reportTitle = 'Weekly Report (Day-wise)';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  
  let grandTotal = 0;
  let daysHTML = '';
  
  days.forEach(day => {
    const dayStr = day.toISOString().split('T')[0];
    const dayName = day.toLocaleDateString('en-IN', { weekday: 'long' });
    const dayLabel = day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    const dayOverlock = overlockData.filter(e => e.date === dayStr);
    const dayTassel = tasselData.filter(e => e.date === dayStr);
    const dayFold = foldData.filter(e => e.date === dayStr);
    const dayDelivery = deliveryData.filter(e => e.date === dayStr);
    
    const workerGroups = {};
    
    [...dayOverlock, ...dayTassel].forEach(entry => {
      const worker = data.workers.find(w => w.id === entry.workerId);
      if (!worker) return;
      
      if (!workerGroups[worker.id]) {
        workerGroups[worker.id] = { name: worker.name, id: worker.id, entries: [] };
      }
      
      const stage = dayOverlock.includes(entry) ? 'Overlock' : 'Tassel';
      workerGroups[worker.id].entries.push({
        stage,
        towelType: entry.towelType,
        qty: entry.qty,
        rate: entry.rate,
        amount: entry.qty * entry.rate
      });
    });
    
    dayFold.forEach(foldEntry => {
      const foldWorker = data.workers.find(w => w.id === foldEntry.workerId);
      if (!foldWorker) return;
      
      let stitcherName = 'Unknown';
      if (foldEntry.tasselEntryId) {
        const tasselEntry = data.tasselEntries.find(t => t.firebaseId === foldEntry.tasselEntryId);
        if (tasselEntry) {
          const stitcher = data.workers.find(w => w.id === tasselEntry.workerId);
          stitcherName = stitcher ? stitcher.name : 'Unknown';
        }
      } else if (foldEntry.overlockEntryId) {
        const overlockEntry = data.overlockEntries.find(o => o.firebaseId === foldEntry.overlockEntryId);
        if (overlockEntry) {
          const stitcher = data.workers.find(w => w.id === overlockEntry.workerId);
          stitcherName = stitcher ? stitcher.name : 'Unknown';
        }
      }
      
      if (!workerGroups[foldWorker.id]) {
        workerGroups[foldWorker.id] = { name: foldWorker.name, id: foldWorker.id, entries: [] };
      }
      
      workerGroups[foldWorker.id].entries.push({
        stage: 'Fold',
        towelType: foldEntry.towelType,
        qty: foldEntry.qty,
        rate: foldEntry.rate,
        amount: foldEntry.qty * foldEntry.rate,
        stitcher: stitcherName
      });
    });
    
    let dayTotal = 0;
    let workersHTML = '';
    
    Object.values(workerGroups).forEach(worker => {
      let workerTotal = 0;
      let entriesHTML = '';
      
      worker.entries.forEach(e => {
        workerTotal += e.amount;
        entriesHTML += `
          <div style="font-size:14px;color:#666;margin-left:15px;padding:5px 0;border-bottom:1px solid #e0e0e0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span>${e.stage}: ${e.towelType} - ${e.qty} pcs × ₹${e.rate.toFixed(2)}${e.stitcher ? ` <span style="color:#888;font-size:12px;">(Stitched by: ${e.stitcher})</span>` : ''}</span>
              <span style="font-weight:bold;color:#28a745;">₹${e.amount.toFixed(2)}</span>
            </div>
          </div>`;
      });
      
      dayTotal += workerTotal;
      
      workersHTML += `
        <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:10px;border-left:4px solid #4facfe;">
          <div style="font-weight:bold;color:#2563eb;margin-bottom:8px;">👤 ${worker.name}</div>
          ${entriesHTML}
          <div style="text-align:right;margin-top:10px;padding-top:10px;border-top:2px solid #dee2e6;">
            <span style="font-weight:bold;">Total:</span>
            <span style="color:#28a745;font-weight:bold;margin-left:10px;">₹${workerTotal.toFixed(2)}</span>
          </div>
        </div>`;
    });
    
    let deliveriesHTML = '';
    if (dayDelivery.length > 0) {
      deliveriesHTML = `
        <div style="background:#fff5f5;padding:15px;border-radius:8px;margin-top:10px;border-left:4px solid #fa709a;">
          <div style="font-weight:bold;color:#fa709a;margin-bottom:8px;">📍 DELIVERIES</div>
          ${dayDelivery.map(d => `
            <div style="font-size:14px;color:#666;margin-left:15px;padding:5px 0;">
              → ${d.placeName}: ${d.towelType} - ${d.qty} pcs
            </div>`).join('')}
        </div>`;
    }
    
    grandTotal += dayTotal;
    
    if (Object.keys(workerGroups).length > 0 || dayDelivery.length > 0) {
      daysHTML += `
        <div class="day-section" style="background:white;padding:20px;border-radius:12px;margin-bottom:20px;border:2px solid #2563eb;">
          <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:15px;border-radius:8px;margin-bottom:15px;">
            <h3 style="margin:0;font-size:20px;">📅 ${dayName.toUpperCase()}</h3>
            <p style="margin:5px 0 0 0;font-size:14px;opacity:0.9;">${dayLabel}</p>
          </div>
          ${workersHTML || '<div style="text-align:center;color:#888;padding:20px;">No work entries for this day</div>'}
          ${deliveriesHTML}
          ${dayTotal > 0 ? `
            <div style="text-align:right;margin-top:15px;padding-top:15px;border-top:2px solid #dee2e6;">
              <span style="font-size:18px;font-weight:bold;">Day Total: </span>
              <span style="font-size:24px;font-weight:bold;color:#28a745;">₹${dayTotal.toFixed(2)}</span>
            </div>` : ''}
        </div>`;
    }
  });
  
  return `
    <div class="report-container" style="background:white;padding:30px;border-radius:12px;margin-top:20px;">
      <div class="report-header" style="text-align:center;margin-bottom:30px;border-bottom:2px solid #2563eb;padding-bottom:20px;">
        <h1 style="color:#2563eb;margin:0;font-size:28px;">Enga Veetu Company</h1>
        <h2 style="color:#111827;margin:10px 0;font-size:22px;">${reportTitle}</h2>
        <p style="color:#6b7280;margin:5px 0;font-size:16px;">📅 ${dateRange}</p>
        <p style="color:#6b7280;margin:5px 0;font-size:14px;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
      </div>
      ${daysHTML || '<div style="text-align:center;color:#888;padding:40px;">No work entries for this week</div>'}
      <div class="grand-total" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:12px;text-align:center;margin-top:20px;">
        <div style="font-size:18px;opacity:.9;margin-bottom:10px;">💰 WEEK GRAND TOTAL</div>
        <div style="font-size:36px;font-weight:bold;">₹${grandTotal.toFixed(2)}</div>
        <div style="font-size:14px;opacity:.8;margin-top:5px;">All Workers Combined (Monday to Sunday)</div>
      </div>
    </div>
    <style>
      @media print {
        @page { size: A4; margin: 1cm; }
        body { margin: 0; padding: 0; background: white !important; }
        body > *:not(.container) { display: none !important; }
        .container > *:not(#reports) { display: none !important; }
        #reports > *:not(#reportOutput) { display: none !important; }
        .top-bar, .dashboard-grid, .tabs, .form-card, .mobile-menu, .mobile-menu-overlay { display: none !important; }
        .report-container { display: block !important; visibility: visible !important; position: relative !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; background: white !important; box-shadow: none !important; }
        .report-container * { visibility: visible !important; page-break-inside: avoid; }
        .day-section { page-break-inside: avoid; margin-bottom: 20px; }
        .report-container, .day-section, .grand-total { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      }
    </style>`;
}

function generateStandardReport(reportType, startDate, endDate, overlockData, tasselData, foldData, deliveryData) {
  const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
  const reportTitle = reportType.charAt(0).toUpperCase() + reportType.slice(1) + ' Report';
  const workerGroups = {};
  
  [...overlockData, ...tasselData].forEach(entry => {
    const worker = data.workers.find(w => w.id === entry.workerId); if (!worker) return;
    if (!workerGroups[worker.id]) workerGroups[worker.id] = { name: worker.name, id: worker.id, towels: {} };
    const towelType = entry.towelType;
    if (!workerGroups[worker.id].towels[towelType]) workerGroups[worker.id].towels[towelType] = { type: towelType, qty: 0, totalAmount: 0, entries: [] };
    workerGroups[worker.id].towels[towelType].qty += entry.qty;
    workerGroups[worker.id].towels[towelType].totalAmount += (entry.qty * entry.rate);
    workerGroups[worker.id].towels[towelType].entries.push({
      qty: entry.qty, rate: entry.rate, amount: entry.qty * entry.rate,
      stage: overlockData.includes(entry) ? 'Overlock' : 'Tassel'
    });
  });

  foldData.forEach(foldEntry => {
    const foldWorker = data.workers.find(w => w.id === foldEntry.workerId); 
    if (!foldWorker) return;
    
    let stitcherName = 'Unknown';
    if (foldEntry.tasselEntryId) {
      const tasselEntry = data.tasselEntries.find(t => t.firebaseId === foldEntry.tasselEntryId);
      if (tasselEntry) {
        const stitcher = data.workers.find(w => w.id === tasselEntry.workerId);
        stitcherName = stitcher ? stitcher.name : 'Unknown';
      }
    } else if (foldEntry.overlockEntryId) {
      const overlockEntry = data.overlockEntries.find(o => o.firebaseId === foldEntry.overlockEntryId);
      if (overlockEntry) {
        const stitcher = data.workers.find(w => w.id === overlockEntry.workerId);
        stitcherName = stitcher ? stitcher.name : 'Unknown';
      }
    }
    
    if (!workerGroups[foldWorker.id]) workerGroups[foldWorker.id] = { name: foldWorker.name, id: foldWorker.id, towels: {} };
    const towelType = foldEntry.towelType;
    if (!workerGroups[foldWorker.id].towels[towelType]) workerGroups[foldWorker.id].towels[towelType] = { type: towelType, qty: 0, totalAmount: 0, entries: [] };
    workerGroups[foldWorker.id].towels[towelType].qty += foldEntry.qty;
    workerGroups[foldWorker.id].towels[towelType].totalAmount += (foldEntry.qty * foldEntry.rate);
    workerGroups[foldWorker.id].towels[towelType].entries.push({
      qty: foldEntry.qty, 
      rate: foldEntry.rate, 
      amount: foldEntry.qty * foldEntry.rate,
      stage: 'Fold',
      stitcher: stitcherName
    });
  });

  const deliveryGroups = {};
  deliveryData.forEach(d => {
    const key = `${d.towelType}-${d.placeId}`;
    if (!deliveryGroups[key]) deliveryGroups[key] = { towelType: d.towelType, placeName: d.placeName, date: d.date, qty: 0 };
    deliveryGroups[key].qty += d.qty;
  });

  let grandTotal = 0, workersHTML = '';
  Object.values(workerGroups).forEach(worker => {
    let workerTotal = 0, towelsHTML = '';
    Object.values(worker.towels).forEach(t => {
      towelsHTML += `
        <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:10px;border-left:4px solid #4facfe;">
          <div style="font-weight:bold;color:#4facfe;margin-bottom:8px;">📦 ${t.type}</div>
          ${t.entries.map(e => `
            <div style="font-size:14px;color:#666;margin-left:15px;padding:5px 0;border-bottom:1px solid #e0e0e0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span>${e.stage}: ${e.qty} pcs × ₹${e.rate.toFixed(2)}${e.stitcher ? ` <span style="color:#888;font-size:12px;">(Stitched by: ${e.stitcher})</span>` : ''}</span>
                <span style="font-weight:bold;color:#28a745;">₹${e.amount.toFixed(2)}</span>
              </div>
            </div>`).join('')}
          <div style="text-align:right;margin-top:10px;padding-top:10px;border-top:2px solid #dee2e6;">
            <span style="font-weight:bold;">Total ${t.type}:</span>
            <span style="color:#28a745;font-weight:bold;margin-left:10px;">₹${t.totalAmount.toFixed(2)}</span>
          </div>
        </div>`;
      workerTotal += t.totalAmount;
    });
    grandTotal += workerTotal;
    workersHTML += `
      <div class="worker-card" style="background:white;padding:20px;border-radius:12px;margin-bottom:20px;border:1px solid #e0e0e0;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding-bottom:15px;border-bottom:2px solid #2563eb;">
          <div><h3 style="margin:0;color:#2563eb;">👤 ${worker.name}</h3><span style="font-size:12px;color:#888;">ID: ${worker.id}</span></div>
          <div style="text-align:right;"><div style="font-size:24px;font-weight:bold;color:#28a745;">₹${workerTotal.toFixed(2)}</div><div style="font-size:12px;color:#888;">Total Earnings</div></div>
        </div>
        ${towelsHTML}
      </div>`;
  });

  let deliveriesHTML = '';
  if (Object.keys(deliveryGroups).length > 0) {
    deliveriesHTML = `
      <div class="delivery-card" style="background:white;padding:20px;border-radius:12px;margin-bottom:20px;border:1px solid #e0e0e0;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <h3 style="color:#2563eb;margin-bottom:15px;padding-bottom:15px;border-bottom:2px solid #2563eb;">📍 DELIVERIES</h3>
        ${Object.values(deliveryGroups).map(d => `
          <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:10px;border-left:4px solid #fa709a;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div><div style="font-weight:bold;color:#fa709a;">→ ${d.placeName}</div><div style="font-size:12px;color:#888;margin-top:3px;">${d.date}</div></div>
              <div style="text-align:right;"><div style="font-weight:bold;color:#333;">${d.towelType}</div><div style="font-size:14px;color:#666;">${d.qty} pcs</div></div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  return `
    <div class="report-container" style="background:white;padding:30px;border-radius:12px;margin-top:20px;">
      <div class="report-header" style="text-align:center;margin-bottom:30px;border-bottom:2px solid #2563eb;padding-bottom:20px;">
        <h1 style="color:#2563eb;margin:0;font-size:28px;">Enga Veetu Company</h1>
        <h2 style="color:#111827;margin:10px 0;font-size:22px;">${reportTitle}</h2>
        <p style="color:#6b7280;margin:5px 0;font-size:16px;">📅 ${dateRange}</p>
        <p style="color:#6b7280;margin:5px 0;font-size:14px;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
      </div>
      ${workersHTML}
      ${deliveriesHTML}
      <div class="grand-total" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:12px;text-align:center;margin-top:20px;">
        <div style="font-size:18px;opacity:.9;margin-bottom:10px;">💰 GRAND TOTAL</div>
        <div style="font-size:36px;font-weight:bold;">₹${grandTotal.toFixed(2)}</div>
        <div style="font-size:14px;opacity:.8;margin-top:5px;">All Workers Combined</div>
      </div>
    </div>
    <style>
      @media print {
        @page { size: A4; margin: 1cm; }
        body { margin: 0; padding: 0; background: white !important; }
        body > *:not(.container) { display: none !important; }
        .container > *:not(#reports) { display: none !important; }
        #reports > *:not(#reportOutput) { display: none !important; }
        .top-bar, .dashboard-grid, .tabs, .form-card, .mobile-menu, .mobile-menu-overlay { display: none !important; }
        .report-container { display: block !important; visibility: visible !important; position: relative !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; background: white !important; box-shadow: none !important; }
        .report-container * { visibility: visible !important; page-break-inside: avoid; }
        .worker-card, .delivery-card { page-break-inside: avoid; margin-bottom: 20px; }
        .report-container, .worker-card, .delivery-card, .grand-total { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      }
    </style>`;
}

// ==================== UTILITIES ====================
function showToast(msg){ try{
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.className = 'toast show'; setTimeout(()=>t.classList.remove('show'),3000);
} catch(e){ console.error('Toast error:', e); } }

async function clearAllData(){
  if (confirm('⚠️ WARNING: This will delete ALL data from Firebase!\n\nAre you absolutely sure?')) {
    if (confirm('Last chance! This cannot be undone. Delete everything?')) {
      try {
        showToast('Deleting all data...');
        
        const collections = Object.values(COLLECTIONS);
        for (const collectionName of collections) {
          const snapshot = await db.collection(collectionName).get();
          const batch = db.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
        
        data.workers = [];
        data.places = [];
        data.overlockEntries = [];
        data.tasselEntries = [];
        data.foldEntries = [];
        data.deliveryEntries = [];
        
        renderWorkers(); renderPlaces();
        renderOverlockEntries(); renderTasselEntries(); renderFoldEntries(); renderDeliveryEntries();
        populateWorkerSelects(); populatePlaceSelects();
        updateDashboard();
        
        showToast('All data cleared from cloud! ✅');
      } catch (error) {
        console.error('Error clearing data:', error);
        showToast('Error clearing data!', 'error');
      }
    }
  }
}

// ==================== MOBILE MENU ====================
let mobileMenuOpen = false;

function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const closeBtn = document.getElementById('mobileMenuClose');

    if (!toggle || !menu || !overlay) return;

    toggle.addEventListener('click', () => {
        mobileMenuOpen = !mobileMenuOpen;
        if (mobileMenuOpen) {
            openMobileMenu();
        } else {
            closeMobileMenu();
        }
    });

    closeBtn?.addEventListener('click', closeMobileMenu);
    overlay.addEventListener('click', closeMobileMenu);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenuOpen) {
            closeMobileMenu();
        }
    });
}

function openMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');

    mobileMenuOpen = true;
    toggle?.classList.add('active');
    menu?.classList.add('active');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');

    mobileMenuOpen = false;
    toggle?.classList.remove('active');
    menu?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
}

function switchTabMobile(event, link, tabName) {
    event.preventDefault();
    closeMobileMenu();
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName)?.classList.add('active');
    
    document.querySelectorAll('.mobile-menu-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    showToast(`Switched to ${link.querySelector('.menu-label').textContent}`);
}

// ==================== FIREBASE AUTH INITIALIZATION ====================
// ✅ Sign in anonymously before loading app
auth.signInAnonymously()
  .then(() => {
    console.log('✅ Signed in anonymously');
    initApp();
  })
  .catch((error) => {
    console.error('❌ Auth error:', error);
    const ls = document.getElementById('loadingScreen');
    if (ls) ls.innerHTML = '<p style="color: red;">Authentication failed. Please refresh the page.</p>';
  });

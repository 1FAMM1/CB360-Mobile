/* ===============================
       GRUPO CONSOLA DO PAINEL DIGITAL      
    =============================== */
    /* ---- CONTROLO DOS BOTÕES DA SIDEBAR ----*/
    function showPanelCard(cardId) {
      const allCards = document.querySelectorAll('.panel-card');
      allCards.forEach(card => {
        card.classList.remove('active');
      });
      const allButtons = document.querySelectorAll('.panel-menu-button');
      allButtons.forEach(button => {
        button.classList.remove('active');
      });
      document.getElementById('panel-' + cardId).classList.add('active');
      event.target.classList.add('active');
    }
    /* ---- ESTADOS DE PRONTIDÃO ESPECIAL ----*/
    /* --- Controlo de Cores EPE ---*/
    class EPEButtonColorManager {
      constructor(supabaseUrl, supabaseKey) {
        this.SUPABASE_URL = supabaseUrl;
        this.SUPABASE_ANON_KEY = supabaseKey;
        const epeColors = [{bg: 'green', text: 'white'},
                           {bg: 'blue', text: 'white'},
                           {bg: 'yellow', text: 'black'},
                           {bg: 'orange', text: 'black'},
                           {bg: 'red', text: 'white'},
                           {bg: 'lightgrey',text: 'black'}];
        const ppiAeroColors = [{bg: 'green', text: 'white'},
                               {bg: 'yellow', text: 'black'},
                               {bg: 'red', text: 'white'},
                               {bg: 'lightgrey', text: 'black'},
                               {bg: 'lightgrey', text: 'black'},
                               {bg: 'lightgrey', text: 'black'}];
        const ppiA22LinferColors = [{bg: 'green', text: 'white'},
                                    {bg: 'yellow', text: 'black'},
                                    {bg: 'orange', text: 'black'},
                                    {bg: 'red', text: 'white'},
                                    {bg: 'lightgrey', text: 'black'},
                                    {bg: 'lightgrey', text: 'black'}];
        this.buttonColors = {"epe-decir": epeColors, "epe-diops": epeColors, "epe-nrbq": epeColors, "ppi-aero": ppiAeroColors, "ppi-a22": ppiA22LinferColors, "ppi-linfer": ppiA22LinferColors};
        this.initializeButtons();
      }
      initializeButtons() {
        Object.keys(this.buttonColors).forEach(containerId => {
          const container = document.getElementById(containerId);
          if (!container) return;
          const buttons = container.querySelectorAll('.panel-btn');
          buttons.forEach((button, index) => {
            button.addEventListener('click', () => {
              this.toggleButton(containerId, button, index);
            });
          });
        });
      }
      toggleButton(containerId, button, index) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.panel-btn').forEach(btn => {
          btn.style.backgroundColor = 'lightgrey';
          btn.style.color = 'black';
          btn.dataset.active = 'false';
        });
        const colors = this.buttonColors[containerId][index];
        button.style.backgroundColor = colors.bg;
        button.style.color = colors.text;
        button.dataset.active = 'true';
        const epe_type = containerId;
        const epe_value = button.textContent.trim();
        this.saveToSupabase(epe_type, epe_value);
      }
      async saveToSupabase(epe_type, epe_value) {
        try {
          const body = {
            epe: epe_value
          };
          const resp = await fetch(`${this.SUPABASE_URL}/rest/v1/epe_status?epe_type=eq.${encodeURIComponent(epe_type)}`, {
            method: 'PATCH',
            headers: {
              'apikey': this.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(body)
          });
          if (!resp.ok) {
            console.error('Erro ao atualizar EPE no Supabase', resp.status, await resp.text());
          } else {
            console.log(`EPE atualizado: ${epe_type} = ${epe_value}`);
          }
        } catch (e) {
          console.error('Erro na requisição Supabase:', e);
        }
      }
      async loadFromSupabase() {
        try {
          const resp = await fetch(`${this.SUPABASE_URL}/rest/v1/epe_status`, {
            headers: getSupabaseHeaders()
          });
          if (!resp.ok) throw new Error(`Erro ao ler EPE: ${resp.status}`);
          const data = await resp.json();
          data.forEach(row => {
            const containerId = row.epe_type;
            const epeValue = row.epe;
            const container = document.getElementById(containerId);
            if (!container) return;
            const buttons = container.querySelectorAll('.panel-btn');
            buttons.forEach((btn, index) => {
              if (btn.textContent.trim() === epeValue) {
                const colors = this.buttonColors[containerId][index];
                btn.style.backgroundColor = colors.bg;
                btn.style.color = colors.text;
                btn.dataset.active = 'true';
              } else {
                btn.style.backgroundColor = 'lightgrey';
                btn.style.color = 'black';
                btn.dataset.active = 'false';
              }
            });
          });
        } catch (e) {
          console.error('Erro ao carregar estados do Supabase:', e);
        }
      }
    }
    document.addEventListener('DOMContentLoaded', () => {
      window.colorManager = new EPEButtonColorManager(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.colorManager.loadFromSupabase();
      document.querySelectorAll('.sidebar-menu-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const page = btn.dataset.page;
          if (page === 'page-utilities') {
            if (window.colorManager) {
              window.colorManager.loadFromSupabase();
            }
          }
        });
      });
    });
// ===============================
// CONFIGURAÇÃO GLOBAL
// ===============================
const API_URL = 'https://geostat-360-api.vercel.app/api/vehicle_control';
const TYPE_ORDER = {
  'VCOT': 1, 'VCOC': 2, 'VTTP': 3, 'VFCI': 4, 'VECI': 5, 'VRCI': 6, 'VUCI': 7,
  'VSAT': 8, 'VSAE': 9, 'VTTU': 10, 'VTTF': 11, 'VTTR': 12, 'VALE': 13, 'VOPE': 14,
  'VETA': 15, 'ABSC': 20, 'ABCI': 21, 'ABTM': 22, 'ABTD': 23, 'VDTD': 24
};

// Estado global
let vehicles = [];
let vehicleStatuses = {};
let vehicleINOP = {};
let selectedVehicleCode = null;

// Referências UI
const vehicleGrid = document.getElementById('vehicleGrid');
const vehicleStatusModal = document.getElementById('popup-vehicle-status');
const vehicleStatusTitle = document.getElementById('popup-vehicle-title');
const vehicleStatusSelect = document.getElementById('vehicle-status-select');
const vehicleStatusOkBtn = document.getElementById('popup-vehicle-ok-btn');
const vehicleStatusCancelBtn = document.getElementById('popup-vehicle-cancel-btn');
const vehicleSelect = document.getElementById('remove_vehicle');
const vehicleInput = document.getElementById('add_vehicle');
const btnAdd = document.getElementById('add_vehicle_btn');
const btnRemove = document.getElementById('remove_vehicle_btn');
const statusMessage = document.getElementById('vehicle_status_message');

// ===============================
// FUNÇÕES AUXILIARES
// ===============================
function getVehicleIcon(type) {
  const icons = {
    'VCOT':'🚒','VCOC':'🚒','VTTP':'🚒','VFCI':'🚒','VECI':'🚒','VRCI':'🚒','VUCI':'🚒',
    'VSAT':'🚒','VSAE':'🚒','VTTU':'🚒','VTTF':'🚒','VTTR':'🚒','VALE':'🚒','VOPE':'🚒',
    'VETA':'🚒','ABCI':'🚑','ABSC':'🚑','ABTM':'🚑','ABTD':'🚑','VDTD':'🚑'
  };
  return icons[type] || '🚗';
}

function sortVehicles(list) {
  return list.sort((a, b) => {
    const [typeA, numA] = a.split('-');
    const [typeB, numB] = b.split('-');
    const orderA = TYPE_ORDER[typeA] || 999;
    const orderB = TYPE_ORDER[typeB] || 999;
    if(orderA === orderB) return parseInt(numA) - parseInt(numB);
    return orderA - orderB;
  });
}

function showStatus(message, type='') {
  if(statusMessage){
    statusMessage.textContent = message;
    statusMessage.className = 'status ' + type;
  }
}

// ===============================
// FUNÇÕES DE API
// ===============================
async function loadVehiclesFromAPI() {
  try {
    const res = await fetch(API_URL);
    if(!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if(data.success && Array.isArray(data.vehicles)){
      vehicles = sortVehicles(data.vehicles);
      vehicleStatuses = data.vehicleStatuses || {};
      vehicleINOP = data.vehicleINOP || {};
      generateVehicleButtons();
      populateVehicleSelect();
      updateVehicleButtonColors();
    } else {
      throw new Error('Formato de resposta inválido');
    }
  } catch(e){
    console.error('Erro ao carregar veículos:', e);
    showStatus('❌ Erro ao carregar veículos', 'error');
  }
}

async function updateVehicleStatusAPI(vehicleCode, newStatus){
  const payload = newStatus === "Inop" ? {inop:true} :
                  newStatus === "Em Serviço" ? {inop:false, current_status:"Em Serviço"} :
                  {inop:false, current_status:"Disponível no Quartel"};
  try{
    const res = await fetch(API_URL,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({vehicle:vehicleCode,...payload})
    });
    const data = await res.json();
    if(data.success){
      vehicleINOP[vehicleCode] = payload.inop;
      vehicleStatuses[vehicleCode] = payload.inop ? "Inop" : payload.current_status;
      updateVehicleButtonColors();
    } else {
      alert('Erro ao atualizar status: ' + (data.error || 'Desconhecido'));
    }
  } catch(e){
    alert('Erro na requisição: ' + e.message);
  }
}

async function addVehicle(){
  const newVehicle = vehicleInput.value.trim().toUpperCase();
  if(!newVehicle) return showStatus('❌ Informe o código do veículo.', 'error');
  if(vehicles.includes(newVehicle)) return showStatus(`⚠️ Veículo "${newVehicle}" já existe.`, 'error');
  showStatus('➕ Adicionando veículo...', 'loading');
  btnAdd.disabled = btnRemove.disabled = true;
  try{
    const res = await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({vehicle:newVehicle,status:"Disponível no Quartel",action:"add"})
    });
    const data = await res.json();
    if(data.success){
      showStatus(`✅ Veículo "${newVehicle}" adicionado!`, 'success');
      vehicleInput.value = '';
      await loadVehiclesFromAPI();
    } else {
      showStatus('❌ Erro ao adicionar: ' + (data.error || 'Desconhecido'), 'error');
    }
  } catch(e){
    showStatus('❌ Erro ao adicionar veículo: ' + e.message, 'error');
  } finally{
    btnAdd.disabled = btnRemove.disabled = false;
  }
}

async function removeVehicle(){
  const selected = vehicleSelect.value;
  if(!selected) return showStatus('❌ Selecione um veículo para remover.', 'error');
  if(!confirm(`Remover veículo "${selected}"?`)) return;
  showStatus('❌ Removendo veículo...', 'loading');
  btnAdd.disabled = btnRemove.disabled = true;
  try{
    const res = await fetch(`${API_URL}?vehicle=${encodeURIComponent(selected)}`,{method:'DELETE'});
    const data = await res.json();
    if(data.success){
      showStatus(`✅ Veículo "${selected}" removido!`, 'success');
      await loadVehiclesFromAPI();
    } else {
      showStatus('❌ Erro ao remover: ' + (data.error || 'Desconhecido'), 'error');
    }
  } catch(e){
    showStatus('❌ Erro ao remover veículo: ' + e.message, 'error');
  } finally{
    btnAdd.disabled = btnRemove.disabled = false;
  }
}

// ===============================
// FUNÇÕES DE UI
// ===============================
function generateVehicleButtons(){
  vehicleGrid.innerHTML = '';
  vehicles.forEach(code=>{
    const type = code.split('-')[0];
    const btn = document.createElement('div');
    btn.className = `vehicle-btn ${type.toLowerCase()}`;
    btn.dataset.vehicle = code;
    btn.innerHTML = `<span class="vehicle-icon">${getVehicleIcon(type)}</span><div class="vehicle-code">${code}</div>`;
    btn.addEventListener('click',()=>openVehicleStatusModal(code));
    vehicleGrid.appendChild(btn);
  });
}

function populateVehicleSelect(){
  vehicleSelect.innerHTML = '';
  vehicles.forEach(vehicle=>{
    const opt = document.createElement('option');
    opt.value = vehicle;
    opt.textContent = vehicle;
    vehicleSelect.appendChild(opt);
  });
}

function updateVehicleButtonColors(){
  document.querySelectorAll('.vehicle-btn').forEach(btn=>{
    const code = btn.dataset.vehicle;
    btn.classList.remove('inop','em-servico');
    if(vehicleINOP[code]) btn.classList.add('inop');
    else if(vehicleStatuses[code]==='Em Serviço') btn.classList.add('em-servico');
  });
}

function openVehicleStatusModal(vehicleCode){
  selectedVehicleCode = vehicleCode;
  vehicleStatusTitle.textContent = vehicleCode;
  if(vehicleINOP[vehicleCode]) vehicleStatusSelect.value = "Inop";
  else vehicleStatusSelect.value = vehicleStatuses[vehicleCode] || "Disponível no Quartel";
  vehicleStatusModal.classList.add('show');
}

function closeVehicleStatusModal(){
  vehicleStatusModal.classList.remove('show');
  selectedVehicleCode = null;
}

// ===============================
// EVENTOS
// ===============================
vehicleStatusOkBtn.addEventListener('click', async ()=>{
  if(!selectedVehicleCode) return;
  await updateVehicleStatusAPI(selectedVehicleCode, vehicleStatusSelect.value);
  closeVehicleStatusModal();
});
vehicleStatusCancelBtn.addEventListener('click', closeVehicleStatusModal);
window.addEventListener('click', (e) => {
  if (e.target === vehicleStatusModal) closeVehicleStatusModal();
});

btnAdd.addEventListener('click', addVehicle);
btnRemove.addEventListener('click', removeVehicle);

// ===============================
// ATUALIZAÇÃO AUTOMÁTICA
// ===============================
let autoUpdateTimer = null;
const AUTO_UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutos

async function refreshVehicles() {
  await loadVehiclesFromAPI();
  restartAutoUpdateTimer();
}

function restartAutoUpdateTimer() {
  if (autoUpdateTimer) clearTimeout(autoUpdateTimer);
  autoUpdateTimer = setTimeout(refreshVehicles, AUTO_UPDATE_INTERVAL);
}

// Inicialização
window.addEventListener('load', async () => {
  await loadVehiclesFromAPI();
  restartAutoUpdateTimer();
});

// ===============================
// INTEGRAR ATUALIZAÇÃO IMEDIATA AO DETECTAR ALTERAÇÕES
// ===============================

// Aqui, sempre que addVehicle, removeVehicle ou updateVehicleStatusAPI for chamado
// chamamos refreshVehicles() no final para atualizar imediatamente
// Exemplo:

async function addVehicleWithRefresh() {
  await addVehicle();
  await refreshVehicles();
}

async function removeVehicleWithRefresh() {
  await removeVehicle();
  await refreshVehicles();
}

async function updateVehicleStatusWithRefresh(vehicleCode, newStatus) {
  await updateVehicleStatusAPI(vehicleCode, newStatus);
  await refreshVehicles();
}

// Substituir os event listeners originais por estas funções:
btnAdd.removeEventListener('click', addVehicle);
btnAdd.addEventListener('click', addVehicleWithRefresh);

btnRemove.removeEventListener('click', removeVehicle);
btnRemove.addEventListener('click', removeVehicleWithRefresh);

vehicleStatusOkBtn.removeEventListener('click', async ()=>{
  if(!selectedVehicleCode) return;
  await updateVehicleStatusAPI(selectedVehicleCode, vehicleStatusSelect.value);
  closeVehicleStatusModal();
});
vehicleStatusOkBtn.addEventListener('click', async ()=>{
  if(!selectedVehicleCode) return;
  await updateVehicleStatusWithRefresh(selectedVehicleCode, vehicleStatusSelect.value);
  closeVehicleStatusModal();
});

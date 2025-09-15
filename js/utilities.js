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
    // STATUS DE VEÍCULOS
    // ===============================
    const API_URL = 'https://geostat-360-api.vercel.app/api/vehicle_control';
    const TYPE_ORDER = {'VCOT': 1, 'VCOC': 2, 'VTTP': 3, 'VFCI': 4, 'VECI': 5, 'VRCI': 6, 'VUCI': 7, 'VSAT': 8, 'VSAE': 9, 'VTTU': 10, 'VTTF': 11,
                        'VTTR': 12, 'VALE': 13, 'VOPE': 14, 'VETA': 15, 'ABSC': 20, 'ABCI': 21, 'ABTM': 22, 'ABTD': 23, 'VDTD': 24};
    let vehicles = [];
    let vehicleStatuses = {};
    let vehicleINOP = {};
    let selectedVehicleCode = null;
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

    function getVehicleIcon(type) {
      const icons = {'VCOT': '🚒', 'VCOC': '🚒', 'VTTP': '🚒', 'VFCI': '🚒', 'VECI': '🚒', 'VRCI': '🚒', 'VUCI': '🚒', 'VSAT': '🚒', 'VSAE': '🚒',
                     'VTTU': '🚒', 'VTTF': '🚒', 'VTTR': '🚒', 'VALE': '🚒', 'VOPE': '🚒', 'VETA': '🚒', 'ABCI': '🚑', 'ABSC': '🚑', 'ABTM': '🚑',
                     'ABTD': '🚑', 'VDTD': '🚑'};
      return icons[type] || '🚗';
    }

    function sortVehicles(list) {
      return list.sort((a, b) => {
        const [typeA, numA] = a.split('-');
        const [typeB, numB] = b.split('-');
        const orderA = TYPE_ORDER[typeA] || 999;
        const orderB = TYPE_ORDER[typeB] || 999;
        if (orderA === orderB) return parseInt(numA) - parseInt(numB);
        return orderA - orderB;
      });
    }

    function showStatus(message, type = '') {
      statusMessage.textContent = message;
      statusMessage.className = 'status ' + type;
    }

    async function loadVehiclesFromAPI() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.vehicles)) {
          vehicles = sortVehicles(data.vehicles);
          vehicleStatuses = data.vehicleStatuses || {};
          vehicleINOP = data.vehicleINOP || {};
          generateVehicleButtons();
          populateVehicleSelect();
          updateVehicleButtonColors();
          updateVehicleCount();
          updateVehicleStats(); 
          document.getElementById('vehicleStatus').style.display = 'none';
        } else {
          throw new Error('Formato de resposta inválido');
        }
      } catch (e) {
        console.error('❌ Erro ao carregar veículos:', e);
      }
    }

    function updateVehicleCount() {
      const totalVehicles = vehicles.length;
      const sumVehiclesElement = document.getElementById('sum-vehicles');
      if (sumVehiclesElement) {
        sumVehiclesElement.textContent = totalVehicles;
      }
    }

    function updateVehicleCount() {
      const totalVehicles = vehicles.length;
      const sumVehiclesElement = document.getElementById('sum-vehicles');
      if (sumVehiclesElement) {
        sumVehiclesElement.textContent = totalVehicles;
      }
    }

    function updateVehicleStats() {
      let countQuartel = 0;
      let countServico = 0;
      let countInop = 0;

      vehicles.forEach(vehicleCode => {
      if (vehicleINOP[vehicleCode]) {
      countInop++;
      } else if (vehicleStatuses[vehicleCode] === 'Em Serviço') {
      countServico++;
      } else {
      countQuartel++;
      }
    });
           
    const quartelElement = document.getElementById('count-quartel');
    const servicoElement = document.getElementById('count-servico');
    const inopElement = document.getElementById('count-inop');
    if (quartelElement) quartelElement.textContent = countQuartel;
    if (servicoElement) servicoElement.textContent = countServico;
    if (inopElement) inopElement.textContent = countInop;
    }

    async function updateVehicleStatusAPI(vehicleCode, newStatus) {
      let dados = {};
      if (newStatus === "Inop") {
        dados.inop = true;
      } else if (newStatus === "Em Serviço") {
        dados.current_status = "Em Serviço";
        dados.inop = false;
      } else {
        dados.current_status = "Disponível no Quartel";
        dados.inop = false;
      }
      try {
        const response = await fetch(API_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vehicle: vehicleCode,
            ...dados
          })
        });
        const result = await response.json();
        if (result.success) {
          vehicleINOP[vehicleCode] = dados.inop;
          vehicleStatuses[vehicleCode] = dados.inop ? "Inop" : dados.current_status;
          updateVehicleButtonColors();
          updateVehicleStats();
        } else {
          alert('Erro ao atualizar status: ' + (result.error || 'Desconhecido'));
        }
      } catch (error) {
        alert('Erro na requisição: ' + error.message);
      }
    }
    async function addVehicle() {
      const novoVeiculo = vehicleInput.value.trim().toUpperCase();
      if (!novoVeiculo) return showStatus('❌ Informe o código do veículo.', 'error');
      if (vehicles.includes(novoVeiculo)) return showStatus(`⚠️ O veículo "${novoVeiculo}" já existe.`, 'error');
      showStatus('➕ Adicionando veículo...', 'loading');
      btnAdd.disabled = btnRemove.disabled = true;
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vehicle: novoVeiculo,
            status: "Disponível no Quartel",
            action: "add"
          }),
        });
        const data = await res.json();
        if (data.success) {
          showStatus(`✅ Veículo "${novoVeiculo}" adicionado!`, 'success');
          vehicleInput.value = '';
          await loadVehiclesFromAPI();
        } else {
          showStatus('❌ Erro ao adicionar: ' + (data.error || 'Desconhecido'), 'error');
        }
      } catch (error) {
        showStatus('❌ Erro ao adicionar veículo: ' + error.message, 'error');
      } finally {
        btnAdd.disabled = btnRemove.disabled = false;
      }
    }
    async function removeVehicle() {
      const veiculoSelecionado = vehicleSelect.value;
      if (!veiculoSelecionado) return showStatus('❌ Selecione um veículo para remover.', 'error');
      if (!confirm(`Remover veículo "${veiculoSelecionado}"?`)) return;
      showStatus('❌ Removendo veículo...', 'loading');
      btnAdd.disabled = btnRemove.disabled = true;
      try {
        const res = await fetch(`${API_URL}?vehicle=${encodeURIComponent(veiculoSelecionado)}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showStatus(`✅ Veículo "${veiculoSelecionado}" removido!`, 'success');
          await loadVehiclesFromAPI();
        } else {
          showStatus('❌ Erro ao remover: ' + (data.error || 'Desconhecido'), 'error');
        }
      } catch (error) {
        showStatus('❌ Erro ao remover veículo: ' + error.message, 'error');
      } finally {
        btnAdd.disabled = btnRemove.disabled = false;
      }
    }

    function generateVehicleButtons() {
      vehicleGrid.innerHTML = '';
      vehicles.forEach(vehicleCode => {
        const type = vehicleCode.split('-')[0];
        const btn = document.createElement('div');
        btn.className = `vehicle-btn ${type.toLowerCase()}`;
        btn.dataset.vehicle = vehicleCode;
        btn.innerHTML = `<span class="vehicle-icon">${getVehicleIcon(type)}</span><div class="vehicle-code">${vehicleCode}</div>`;
        btn.addEventListener('click', () => openVehicleStatusModal(vehicleCode));
        vehicleGrid.appendChild(btn);
      });
    }

    function populateVehicleSelect() {
      vehicleSelect.innerHTML = '';
      vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle;
        option.textContent = vehicle;
        vehicleSelect.appendChild(option);
      });
    }

    function updateVehicleButtonColors() {
      document.querySelectorAll('.vehicle-btn').forEach(btn => {
        const code = btn.dataset.vehicle;
        btn.classList.remove('inop', 'em-servico');
        if (vehicleINOP[code]) btn.classList.add('inop');
        else if (vehicleStatuses[code] === 'Em Serviço') btn.classList.add('em-servico');
      });
    }

    function openVehicleStatusModal(vehicleCode) {
      selectedVehicleCode = vehicleCode;
      vehicleStatusTitle.textContent = vehicleCode;
      if (vehicleINOP[vehicleCode]) vehicleStatusSelect.value = "Inop";
      else vehicleStatusSelect.value = vehicleStatuses[vehicleCode] || "Disponível no Quartel";
      vehicleStatusModal.classList.add('show');
    }

    function closeVehicleStatusModal() {
      vehicleStatusModal.classList.remove('show');
      selectedVehicleCode = null;
    }
    vehicleStatusOkBtn.addEventListener('click', async () => {
      if (!selectedVehicleCode) return;
      await updateVehicleStatusAPI(selectedVehicleCode, vehicleStatusSelect.value);
      closeVehicleStatusModal();
    });
    vehicleStatusCancelBtn.addEventListener('click', closeVehicleStatusModal);
    window.addEventListener('click', (e) => {
      if (e.target === vehicleStatusModal) closeVehicleStatusModal();
    });
    btnAdd.addEventListener('click', addVehicle);
    btnRemove.addEventListener('click', removeVehicle);
    window.addEventListener('load', loadVehiclesFromAPI);
    setInterval(loadVehiclesFromAPI, 10 * 60 * 1000);
    // ===============================
    // INFORMAÇÕES RELEVANTES
    // ===============================
    async function loadInfosFromSupabase() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/infos_select?select=id,from,destination,info&order=id.asc`, {
          method: 'GET',
          headers: getSupabaseHeaders(),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Erro HTTP ${res.status}: ${errText}`);
        }
        const rows = await res.json();
        console.log('✅ Rows recebidas:', rows);
        ['01', '02', '03', '04'].forEach(n => {
          const group = document.getElementById(`relev-info-${n}`);
          if (!group) return;
          group.dataset.rowId = '';
          const fromInput = document.getElementById(`from-${n}`);
          const toInput = document.getElementById(`to-${n}`);
          const infoTA = document.getElementById(`info-${n}`);
          if (fromInput) fromInput.value = '';
          if (toInput) toInput.value = '';
          if (infoTA) infoTA.value = '';
        });
        rows.forEach(row => {
          const n = String(row.id).padStart(2, '0'); // transforma 1 -> "01"
          const group = document.getElementById(`relev-info-${n}`);
          if (!group) return console.warn(`⚠️ Não existe grupo HTML para a row id=${row.id}`);
          group.dataset.rowId = row.id;
          const fromInput = document.getElementById(`from-${n}`);
          const toInput = document.getElementById(`to-${n}`);
          const infoTA = document.getElementById(`info-${n}`);
          if (fromInput) fromInput.value = row.from || '';
          if (toInput) toInput.value = row.destination || '';
          if (infoTA) infoTA.value = row.info || '';
        });
      } catch (e) {
        console.error('❌ Erro ao carregar infos:', e);
      }
    }
    async function saveInfoGroupFields(n) {
      const group = document.getElementById(`relev-info-${n}`);
      if (!group) return;
      const rowId = group.dataset.rowId;
      if (!rowId) return console.error(`⚠️ Grupo relev-info-${n} não tem rowId!`);
      const fromVal = document.getElementById(`from-${n}`)?.value || '';
      const toVal = document.getElementById(`to-${n}`)?.value || '';
      const infoVal = document.getElementById(`info-${n}`)?.value || '';
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/infos_select?id=eq.${rowId}`, {
          method: 'PATCH',
          headers: getSupabaseHeaders({
            returnRepresentation: true
          }),
          body: JSON.stringify({
            from: fromVal,
            destination: toVal,
            info: infoVal
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Erro HTTP ${res.status}: ${errText}`);
        }
        showPopupSuccess(`A informação ${n} foi atualizada com sucesso.`, false);
        console.log(`✅ Row ${rowId} atualizada no Supabase`);
      } catch (e) {
        console.error('❌ Erro ao atualizar Supabase:', e);
      }
    }
    async function clearInfoGroupFields(n) {
      const group = document.getElementById(`relev-info-${n}`);
      if (!group) return;
      group.querySelectorAll('input[type="text"]').forEach(i => i.value = '');
      group.querySelectorAll('textarea').forEach(t => t.value = '');
      const rowId = group.dataset.rowId;
      if (!rowId) return console.error(`⚠️ Nenhum rowId definido para relev-info-${n}`);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/infos_select?id=eq.${rowId}`, {
          method: 'PATCH',
          headers: getSupabaseHeaders({
            returnRepresentation: true
          }),
          body: JSON.stringify({
            from: '',
            destination: '',
            info: ''
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Erro HTTP ${res.status}: ${errText}`);
        }
        showPopupWarning(`Os campos da informação ${n} foram limpos com sucesso. Pode usar novamente o grupo de informação ${n}.`);
        console.log(`✅ Row ${rowId} limpa no Supabase`);
      } catch (e) {
        console.error('❌ Erro ao atualizar Supabase:', e);
      }
    }
    // ===============================
    // CORTES DE VIAS
    // ===============================
    async function loadRoutesFromSupabase() {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/street_cut?order=id.asc`, {
          method: "GET",
          headers: getSupabaseHeaders()
        });
        if (!response.ok) {
          throw new Error(`Erro Supabase: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        data.forEach((row, index) => {
        const n = String(row.id).padStart(2, '0');
        const nameInput = document.getElementById(`route-${n}-name`);
        const motiveInput = document.getElementById(`route-${n}-motive`);
        const untilInput = document.getElementById(`route-${n}-until`);
          if (nameInput) nameInput.value = row.street_name || "";
          if (motiveInput) motiveInput.value = row.cut_motive || "";
          if (untilInput) untilInput.value = row.cut_until || "";
        });
        console.log("✅ Dados carregados:", data);
        } catch (error) {
        console.error("❌ Erro ao carregar dados do Supabase:", error);
      }
    }
    document.addEventListener("DOMContentLoaded", loadRoutesFromSupabase);

    async function saveRoutesGroupFields() {
      try {
        for (let i = 1; i <= 12; i++) {
          const n = String(i).padStart(2, '0');
          const streetName = document.getElementById(`route-${n}-name`).value.trim();
          const cutMotive = document.getElementById(`route-${n}-motive`).value.trim();
          const cutUntil = document.getElementById(`route-${n}-until`).value.trim();
          const response = await fetch(
          `${SUPABASE_URL}/rest/v1/street_cut?id=eq.${i}`,
        {
          method: "PATCH",
          headers: getSupabaseHeaders({ returnRepresentation: true }),
          body: JSON.stringify({
            street_name: streetName || "",
            cut_motive: cutMotive || "",
            cut_until: cutUntil || ""
          })
         }
        );
        let data = null;
        if (response.headers.get("content-type")?.includes("application/json")) {
          data = await response.json();
        }
        if (!response.ok) {
          throw new Error(`Erro Supabase: ${response.status} - ${response.statusText} - ${JSON.stringify(data)}`);
        }      
      }
        showPopupSuccess("Todos os cortes de Vias/Arruamentos atualizados com sucesso!");
      } catch (error) {
        console.error("❌ Erro ao gravar no Supabase:", error);
    }
    }     
    // ===============================
    // CENTROS DE MEIOS AÉREOS
    // ===============================
    async function loadCMAsFromSupabase() {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/air_centers?order=id.asc`, {
          method: "GET",
          headers: getSupabaseHeaders()
          });
        if (!response.ok) throw new Error(`Erro Supabase: ${response.status}`);
        const data = await response.json();
        data.forEach(row => {
        const n = String(row.id).padStart(2, '0');
        const nameInput = document.getElementById(`cma_aero_type_${n}`);
        const typeSelect = document.getElementById(`cma_type_${n}`);
        const autoInput = document.getElementById(`cma_auto_${n}`);
        if (nameInput) nameInput.value = row.aero_name || "";
        if (typeSelect) typeSelect.value = row.aero_type || "";
        if (autoInput) autoInput.value = row.aero_autonomy || "";
      });
        console.log("✅ CMAs carregados:", data);
      } catch (error) {
        console.error("❌ Erro ao carregar CMAs:", error);
      }
    }
    document.addEventListener("DOMContentLoaded", loadCMAsFromSupabase); 
        
    async function saveCMAsGroupFields() {
      try {
        for (let i = 1; i <= 6; i++) {
          const n = String(i).padStart(2, '0');
          const aeroName = document.getElementById(`cma_aero_type_${n}`).value.trim();
          const aeroType = document.getElementById(`cma_type_${n}`).value;
          const aeroAutonomy = document.getElementById(`cma_auto_${n}`).value.trim();
          const response = await fetch(`${SUPABASE_URL}/rest/v1/air_centers?id=eq.${i}`, {
            method: "PATCH",
            headers: getSupabaseHeaders({ returnRepresentation: true }),
            body: JSON.stringify({
              aero_name: aeroName || "",
              aero_type: aeroType || "",
              aero_autonomy: aeroAutonomy || ""
          })
        });
        if (!response.ok) throw new Error(`Erro Supabase: ${response.status}`);
      }
        showPopupSuccess("Todos os CMAs foram atualizados com sucesso!");
      } catch (error) {
        console.error("❌ Erro ao gravar CMAs:", error);
      }
    }

    async function loadElemsButtons() {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/reg_elems?select=*`, {
          method: "GET",
          headers: getSupabaseHeaders()
        });
        if (!response.ok) throw new Error(`Erro Supabase: ${response.status}`);
        const data = await response.json();
        console.log("✅ Registos carregados:", data);
        data.sort((a, b) => {
          const aVal = a.n_int ?? "";
          const bVal = b.n_int ?? "";
          if (!isNaN(aVal) && !isNaN(bVal)) {
            return Number(aVal) - Number(bVal);
          }
          return aVal.toString().localeCompare(bVal.toString(), "pt", { numeric: true });
        });
        const container = document.getElementById("elems-container");
        container.innerHTML = "";
        data.forEach(row => {
          const btn = document.createElement("button");
          btn.classList.add("btn-elem");
          btn.textContent = row.n_int || row.id;
          btn.dataset.tooltip = row.abv_name || "";
          applyButtonStyle(btn, row.situation);
          btn.addEventListener("click", async () => {
            const newSituation = row.situation === "available" ? "unavailable" : "available";
            try {
              const updateResp = await fetch(
                `${SUPABASE_URL}/rest/v1/reg_elems?id=eq.${row.id}`, {
                  method: "PATCH",
                  headers: getSupabaseHeaders({returnRepresentation: true}),
                  body: JSON.stringify({ situation: newSituation })
                }
              );
              if (!updateResp.ok) throw new Error(`Erro Supabase: ${updateResp.status}`);
              row.situation = newSituation;
              applyButtonStyle(btn, newSituation);
            } catch (err) {
              console.error("❌ Erro ao atualizar situação:", err);
              alert("Erro ao atualizar situação.");
            }
          });

          container.appendChild(btn);
        });
      } catch (error) {
        console.error("❌ Erro ao carregar elementos:", error);
      }
    }

    function applyButtonStyle(btn, situation) {
      if (situation?.toLowerCase().includes("out")) {
        btn.style.backgroundColor = "red";
        btn.style.color = "white";
      } else if (situation === "available") {
        btn.style.backgroundColor = "green";
        btn.style.color = "white";
      } else {
        btn.style.backgroundColor = "rgb(158, 158, 158)";
        btn.style.color = "black";
      }
    }
    document.addEventListener("DOMContentLoaded", loadElemsButtons);

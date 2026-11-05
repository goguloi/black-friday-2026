// ==========================================
// VARIABILE GLOBALE & STARE
// ==========================================
let ALL_PRODUCTS = [];
let filteredItems = [];
let currentView = 'table';
let currentPage = 1;
const itemsPerPage = 30;

let debounceTimer = null;

// ==========================================
// REDIRECTIONARE DIRECTA & NORMALIZARE TEXT
// ==========================================
function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Redirectionare directa catre primul rezultat pe eMAG
function getEmagSearchUrl(name) {
  if (!name) return 'https://www.emag.ro';
  
  const cleanName = name
    .replace(/[,\/#!$%\^&\*;:{}=\_`~()\"\'\+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return `https://www.google.com/search?q=${encodeURIComponent('site:emag.ro/ ' + cleanName)}&btnI=1`;
}

// Auto-clasificare inteligenta pe baza denumirii
function getProductCategory(name) {
  if (!name) return 'Altele';
  const n = normalizeText(name);

  if (
    n.includes('telefon') || n.includes('iphone') || n.includes('smartwatch') ||
    n.includes('apple watch') || n.includes('bratara fitness') ||
    n.includes('ochelari smart') || n.includes('tableta')
  ) {
    return 'Telefoane & Smartwatch';
  }
  if (
    n.includes('laptop') || n.includes('desktop') || n.includes('pc gaming') ||
    n.includes('monitor') || n.includes('tastatura') || n.includes('mouse') ||
    n.includes('imprimanta') || n.includes('router') || n.includes('casti gaming') ||
    n.includes('placa video') || n.includes('cooler') || n.includes('sursa')
  ) {
    return 'IT, PC & Laptopuri';
  }
  if (
    n.includes('aspirator') || n.includes('robot de aspirare') ||
    n.includes('mop') || n.includes('curatat cu abur') || n.includes('geamuri')
  ) {
    return 'Aspiratoare & Curățenie';
  }
  if (
    n.includes('espressor') || n.includes('cafetiera') || n.includes('friteuza') ||
    n.includes('blender') || n.includes('mixer') || n.includes('robot de bucatarie') ||
    n.includes('sandwich') || n.includes('gratar') || n.includes('cuptor') ||
    n.includes('plita') || n.includes('hota') || n.includes('frigider') ||
    n.includes('combina frigorifica') || n.includes('side by side') ||
    n.includes('masina de spalat vase') || n.includes('masina de spalat rufe') ||
    n.includes('uscator de rufe') || n.includes('aragaz') || n.includes('multicooker')
  ) {
    return 'Electrocasnice Bucătărie';
  }
  if (
    n.includes('epilator') || n.includes('periuta') || n.includes('irigator bucal') ||
    n.includes('dus bucal') || n.includes('aparat de ras') || n.includes('aparat de tuns') ||
    n.includes('ondulator') || n.includes('placa de indreptat') ||
    n.includes('uscator de par') || n.includes('cantar de baie')
  ) {
    return 'Îngrijire Personală';
  }
  if (
    n.includes('aer conditionat') || n.includes('dezumidificator') ||
    n.includes('purificator') || n.includes('aeroterma') ||
    n.includes('convector') || n.includes('calcat')
  ) {
    return 'Climatizare & Casă';
  }

  return 'Altele';
}

// ==========================================
// INCARCARE DATE DIN GITHUB (RAW + CDN)
// ==========================================
async function loadProductsData() {
  const loadStatus = document.getElementById('loadStatus');
  if (loadStatus) loadStatus.textContent = '⏳ Se descarcă produsele din GitHub...';

  const urls = [
    'https://raw.githubusercontent.com/goguloi/black-friday-2026/main/products.json',
    'https://cdn.jsdelivr.net/gh/goguloi/black-friday-2026@main/products.json'
  ];

  let data = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
      if (Array.isArray(data) && data.length > 0) break;
    } catch (err) {
      console.warn(`Tentativă eșuată pentru ${url}:`, err);
    }
  }

  if (data) {
    initCatalog(data);
  } else {
    if (loadStatus) {
      loadStatus.innerHTML = '⚠️ Descărcarea automată a eșuat. Folosește butonul manual.';
    }
  }
}

// Fallback manual local
const jsonFileInput = document.getElementById('jsonFileInput');
if (jsonFileInput) {
  jsonFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        initCatalog(data);
      } catch (err) {
        alert('Fișierul JSON nu este valid.');
      }
    };
    reader.readAsText(file);
  });
}

// ==========================================
// INITIALIZARE CATALOG
// ==========================================
function initCatalog(data) {
  ALL_PRODUCTS = data;

  const totalDisplay = document.getElementById('totalDisplay');
  const loadStatus = document.getElementById('loadStatus');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const sortBy = document.getElementById('sortBy');

  if (totalDisplay) totalDisplay.textContent = ALL_PRODUCTS.length.toLocaleString('ro-RO');
  if (loadStatus) {
    loadStatus.innerHTML = `✅ <strong>${ALL_PRODUCTS.length.toLocaleString('ro-RO')}</strong> produse gata!`;
  }

  if (searchInput) searchInput.disabled = false;
  if (categoryFilter) categoryFilter.disabled = false;
  if (priceMin) priceMin.disabled = false;
  if (priceMax) priceMax.disabled = false;
  if (sortBy) sortBy.disabled = false;

  filterAndSortData();
}

// ==========================================
// FILTRARE & SORTARE
// ==========================================
function filterAndSortData() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const sortBy = document.getElementById('sortBy');

  const rawQuery = searchInput ? searchInput.value.trim() : '';
  const normalizedQuery = normalizeText(rawQuery);
  const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);

  const selectedCat = categoryFilter ? categoryFilter.value : 'ALL';
  const minP = priceMin ? parseFloat(priceMin.value) : NaN;
  const maxP = priceMax ? parseFloat(priceMax.value) : NaN;
  const sort = sortBy ? sortBy.value : 'price-asc';

  filteredItems = ALL_PRODUCTS.filter(item => {
    // 1. Cautare dupa ID catalog (#12 sau 12)
    if (searchTerms.length === 1 && String(item.nr) === searchTerms[0].replace('#', '')) {
      return true;
    }

    // 2. Filtrare text - TOATE cuvintele trebuie regasite
    const normalizedName = normalizeText(item.name);
    const matchesAllTerms = searchTerms.every(term => normalizedName.includes(term));

    // 3. Filtrare categorie
    let matchesCategory = true;
    if (selectedCat && selectedCat !== 'ALL') {
      const itemCat = item.cat || getProductCategory(item.name);
      matchesCategory = (itemCat === selectedCat);
    }

    // 4. Filtrare pret
    let matchesPrice = true;
    if (!isNaN(minP)) {
      matchesPrice = matchesPrice && (item.price !== null && item.price >= minP);
    }
    if (!isNaN(maxP)) {
      matchesPrice = matchesPrice && (item.price !== null && item.price <= maxP);
    }

    return matchesAllTerms && matchesCategory && matchesPrice;
  });

  // Sortare
  filteredItems.sort((a, b) => {
    if (sort === 'price-asc') {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    }
    if (sort === 'price-desc') {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return b.price - a.price;
    }
    if (sort === 'name-asc') {
      return (a.name || '').localeCompare(b.name || '', 'ro');
    }
    if (sort === 'nr-asc') {
      return a.nr - b.nr;
    }
    return 0;
  });

  currentPage = 1;
  render();
}

// ==========================================
// RANDARE UI (TABEL & CARDURI)
// ==========================================
function render() {
  const tableBody = document.getElementById('tableBody');
  const gridContainer = document.getElementById('gridContainer');
  const countDisplay = document.getElementById('countDisplay');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const firstBtn = document.getElementById('firstBtn');
  const lastBtn = document.getElementById('lastBtn');
  const pageInfo = document.getElementById('pageInfo');
  const searchInput = document.getElementById('searchInput');

  if (countDisplay) countDisplay.textContent = filteredItems.length.toLocaleString('ro-RO');

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const pagedItems = filteredItems.slice(startIdx, startIdx + itemsPerPage);
  const q = searchInput ? searchInput.value.trim() : '';

  // Randare Tabel
  if (tableBody) {
    if (pagedItems.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Niciun produs nu corespunde criteriilor de filtrare.</td></tr>';
    } else {
      tableBody.innerHTML = pagedItems.map(p => {
        const emagUrl = getEmagSearchUrl(p.name);
        return `
          <tr class="clickable-row">
            <td class="nr-badge">#${p.nr}</td>
            <td>
              <a href="${emagUrl}" target="_blank" rel="noopener noreferrer" class="prod-link" title="Deschide direct pe eMAG">
                ${highlight(p.name, q)}
              </a>
            </td>
            <td class="price-cell">
              ${p.price !== null ? `
                <span class="price-val">${formatPrice(p.price)}</span>
                <span class="currency">lei</span>
              ` : `
                <span class="price-val noprice">— fără preț —</span>
              `}
            </td>
            <td style="text-align: center;">
              <a href="${emagUrl}" target="_blank" rel="noopener noreferrer" class="btn-emag-external" title="Deschide direct produsul">
                ↗
              </a>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Randare Grid Carduri
  if (gridContainer) {
    if (pagedItems.length === 0) {
      gridContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Niciun produs găsit.</div>';
    } else {
      gridContainer.innerHTML = pagedItems.map(p => {
        const emagUrl = getEmagSearchUrl(p.name);
        return `
          <div class="prod-card">
            <div>
              <div class="card-top">
                <span class="nr-badge">#${p.nr}</span>
                <a href="${emagUrl}" target="_blank" rel="noopener noreferrer" class="card-link-badge">
                  eMAG ↗
                </a>
              </div>
              <div>
                <a href="${emagUrl}" target="_blank" rel="noopener noreferrer" class="card-title-link" title="Deschide direct pe eMAG">
                  ${highlight(p.name, q)}
                </a>
              </div>
            </div>
            <div class="card-price">
              <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Preț BF</span>
              <div>
                ${p.price !== null ? `
                  <span class="price-val">${formatPrice(p.price)}</span>
                  <span class="currency">lei</span>
                ` : `
                  <span class="price-val noprice">— fără preț —</span>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Paginare
  if (pageInfo) pageInfo.textContent = `Pagina ${currentPage.toLocaleString('ro-RO')} din ${totalPages.toLocaleString('ro-RO')}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (firstBtn) firstBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  if (lastBtn) lastBtn.disabled = currentPage >= totalPages;
}

function formatPrice(val) {
  return val.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function highlight(text, query) {
  if (!text) return '';
  if (!query) return text;
  const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return text;
  const escapedTerms = terms.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

// ==========================================
// FUNCTII EXPUSA PE WINDOW
// ==========================================
window.setView = function(view) {
  currentView = view;
  const tableContainer = document.getElementById('tableContainer');
  const gridContainer = document.getElementById('gridContainer');
  const btnTable = document.getElementById('btnTableView');
  const btnGrid = document.getElementById('btnGridView');

  if (view === 'table') {
    if (tableContainer) tableContainer.style.display = 'block';
    if (gridContainer) gridContainer.style.display = 'none';
    if (btnTable) btnTable.classList.add('active');
    if (btnGrid) btnGrid.classList.remove('active');
  } else {
    if (tableContainer) tableContainer.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'grid';
    if (btnGrid) btnGrid.classList.add('active');
    if (btnTable) btnTable.classList.remove('active');
  }
};

window.prevPage = function() {
  if (currentPage > 1) {
    currentPage--;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.nextPage = function() {
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.goToPage = function(page) {
  currentPage = page;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.goToLastPage = function() {
  currentPage = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.applyQuickFilter = function(keyword) {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = keyword;
    filterAndSortData();
  }
};

window.setPriceFilter = function(minVal, maxVal) {
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  if (priceMin) priceMin.value = minVal !== undefined && minVal > 0 ? minVal : '';
  if (priceMax) priceMax.value = maxVal !== undefined ? maxVal : '';
  filterAndSortData();
};

window.resetFilters = function() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const sortBy = document.getElementById('sortBy');

  if (searchInput) searchInput.value = '';
  if (categoryFilter) categoryFilter.value = 'ALL';
  if (priceMin) priceMin.value = '';
  if (priceMax) priceMax.value = '';
  if (sortBy) sortBy.value = 'price-asc';
  filterAndSortData();
};

// ==========================================
// EVENIMENTE DE TASTATURA & FILTRARE
// ==========================================
const sInput = document.getElementById('searchInput');
const catSelect = document.getElementById('categoryFilter');
const pMinInput = document.getElementById('priceMin');
const pMaxInput = document.getElementById('priceMax');
const sBySelect = document.getElementById('sortBy');

if (sInput) {
  sInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterAndSortData, 200);
  });
}

if (catSelect) catSelect.addEventListener('change', filterAndSortData);

if (pMinInput) {
  pMinInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterAndSortData, 200);
  });
}

if (pMaxInput) {
  pMaxInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterAndSortData, 200);
  });
}

if (sBySelect) sBySelect.addEventListener('change', filterAndSortData);

// ==========================================
// LANSARE INITIALA
// ==========================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProductsData);
} else {
  loadProductsData();
}
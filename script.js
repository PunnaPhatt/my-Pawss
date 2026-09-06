/* ==========================================================================
   My Paws — script.js
   ใช้ร่วมกันทุกหน้า: product.html / order.html / admin.html
   ========================================================================== */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxekBHKGWqGqLq-OHgbipRDbgVGEbjPxoSOsHJmirXTFcNpBz77F7MwQkLPo3-OwASHXA/exec';
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkTuh6AHnLQEYiQ-aVQtjsal11Vv_EJdZ64_av09-Y_RLty4kIEYCPWi_lXPt2QSifb4aPqAcEMK-f/pub?gid=0&single=true&output=csv';

const CATEGORY_FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'hygiene', label: 'ความสะอาด' },
  { key: 'feeding', label: 'อาหารและน้ำ' },
  { key: 'furniture', label: 'เฟอร์นิเจอร์และที่เล่น' },
  { key: 'grooming', label: 'ดูแลขนและของเล่น' },
  { key: 'accessory', label: 'อุปกรณ์เสริม' },
];

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});

/* ==========================================================================
   1) product.html — รายการสินค้า + ตัวกรองหมวดหมู่
   ========================================================================== */

function initProductPage() {
  const filterBar = document.getElementById('filter-bar');
  const productList = document.getElementById('product-list');

  fetch('products.json')
    .then((res) => res.json())
    .then((products) => {
      const params = new URLSearchParams(window.location.search);
      const initialCategory = params.get('category') || 'all';

      renderFilterBar(filterBar, initialCategory, (category) => {
        renderProductList(productList, products, category);
      });

      renderProductList(productList, products, initialCategory);
    })
    .catch((error) => {
      console.error(error);
      productList.innerHTML = '<p>ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>';
    });
}

function renderFilterBar(filterBar, activeCategory, onFilterChange) {
  filterBar.innerHTML = '';

  CATEGORY_FILTERS.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary filter-btn';
    button.textContent = filter.label;
    button.dataset.category = filter.key;

    if (filter.key === activeCategory) {
      button.classList.add('is-active');
    }

    button.addEventListener('click', () => {
      filterBar.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');
      onFilterChange(filter.key);
    });

    filterBar.appendChild(button);
  });
}

function renderProductList(productList, products, category) {
  const filtered = category === 'all'
    ? products
    : products.filter((product) => product.category === category);

  productList.innerHTML = '';

  if (filtered.length === 0) {
    productList.innerHTML = '<p>ยังไม่มีสินค้าในหมวดนี้</p>';
    return;
  }

  filtered.forEach((product) => {
    productList.appendChild(createProductCard(product));
  });
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const orderUrl = `order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}`;

  card.innerHTML = `
    <div class="product-card__image">
      <img src="${product.image}" alt="${product.name}" loading="lazy">
    </div>
    <div class="product-card__body">
      <span class="product-card__category">${product.categoryLabel}</span>
      <h3 class="product-card__name">${product.name}</h3>
      <p class="product-card__desc">${product.description}</p>
      <div class="product-card__footer">
        <span class="product-card__price">${formatNumber(product.price)}</span>
        <a class="btn btn-primary" href="${orderUrl}">สั่งซื้อ</a>
      </div>
    </div>
  `;

  return card;
}

function formatNumber(value) {
  return Number(value).toLocaleString('th-TH');
}

/* ==========================================================================
   2) order.html — ฟอร์มสั่งซื้อ
   ========================================================================== */

function initOrderPage() {
  const form = document.getElementById('orderForm');
  const itemsField = document.getElementById('items');
  const totalField = document.getElementById('total');

  const params = new URLSearchParams(window.location.search);
  const item = params.get('item');
  const price = params.get('price');

  if (item !== null) itemsField.value = item;
  if (price !== null) totalField.value = price;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: itemsField.value,
      total: totalField.value,
      note: document.getElementById('note').value,
    };

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch((error) => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
  });
}

/* ==========================================================================
   3) admin.html — ตารางออเดอร์จาก Google Sheet (CSV)
   ========================================================================== */

function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');

  fetch(GOOGLE_SHEET_CSV_URL)
    .then((res) => res.text())
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length <= 1) {
        tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีข้อมูลออเดอร์</td></tr>';
        return;
      }

      // แถวแรกคือหัวตาราง (วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ)
      const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== ''));

      const sortedRows = sortRowsByDateDescending(dataRows);

      tbody.innerHTML = '';
      sortedRows.forEach((row) => {
        const tr = document.createElement('tr');
        row.forEach((cell) => {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    })
    .catch((error) => {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลออเดอร์ได้ในขณะนี้</td></tr>';
    });
}

function sortRowsByDateDescending(rows) {
  return rows.slice().sort((a, b) => {
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);

    const validA = !isNaN(dateA.getTime());
    const validB = !isNaN(dateB.getTime());

    if (validA && validB) return dateB - dateA;
    return 0;
  });
}

/**
 * Parse CSV text (RFC 4180 style) โดยไม่ใช้ library ภายนอก
 * รองรับ: ค่าที่ครอบด้วย double quote, comma ในค่าที่ครอบด้วย quote,
 * quote สองตัวติดกัน ("") หมายถึง quote ตัวเดียว, และ newline ในค่าที่ครอบด้วย quote
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let insideQuotes = false;

  // ตัด BOM ถ้ามี และ normalize line ending
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      insideQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ============================================================
// PRODUCT FORM
// ============================================================
const CATEGORIES = ['🪥 Self Care','🌸 Fragrance','💊 Supplement','🏃 Movement & Exercise','🔧 Tool & Appliance'];
const BODY_AREAS = ['🦱 Hair','🫧 Face','🧔 Facial Hair','👄 Lips','🦷 Oral','🫁 Body','🪒 Body Hair','🤲 Hands','💅 Nails','🦶 Feet'];
const PRODUCT_TYPES = {
  '🪥 Self Care': ['Cleanser','Toner','Serum','Face Moisturizer','Body Moisturizer','Lip Moisturizer','Sunscreen','Eye Cream','Face Mask','Exfoliator','Oil','Treatment','Scrub','Body Wash','Shampoo','Conditioner','Deodorant','Mouthwash','Toothpaste'],
  '🌸 Fragrance': ['EDP','EDT','Parfum','EDC','Extrait','Body Mist','Hair Mist'],
  '💊 Supplement': ['Vitamin','Mineral','Protein','Capsule','Powder','Tablet','Liquid'],
  '🏃 Movement & Exercise': ['Resistance Band','Weight','Mat','Clothing','Shoes','Equipment','Accessory'],
  '🔧 Tool & Appliance': ['Hair Tool','Skin Tool','Nail Tool','Oral Tool','Body Tool','Electric','Manual']
};
// Finer level — keyed by Product Type. Falls back to no subcategory chips if a type has none defined.
const SUBCATEGORIES_BY_TYPE = {
  'Cleanser': ['Foaming Cleanser','Gel Cleanser','Oil Cleanser','Micellar Water','Balm Cleanser','Powder Cleanser'],
  'Toner': ['Hydrating Toner','Exfoliating Toner','Balancing Toner'],
  'Serum': ['Vitamin C Serum','Hyaluronic Acid Serum','Niacinamide Serum','Retinol Serum','Peptide Serum'],
  'Face Moisturizer': ['Gel Moisturizer','Cream Moisturizer','Lotion Moisturizer','Oil-Free Moisturizer'],
  'Body Moisturizer': ['Body Lotion','Body Butter','Body Cream','Body Oil'],
  'Lip Moisturizer': ['Lip Balm','Lip Mask','Lip Oil'],
  'Sunscreen': ['Chemical Sunscreen','Mineral Sunscreen','Tinted Sunscreen'],
  'Eye Cream': ['Hydrating Eye Cream','Brightening Eye Cream','Anti-Aging Eye Cream'],
  'Face Mask': ['Hydrating Sheet Mask','Clay Mask','Peel-Off Mask','Sleeping Mask','Exfoliating Mask','Cream Mask'],
  'Exfoliator': ['Physical Scrub','Chemical Exfoliant (AHA/BHA)','Exfoliating Pads'],
  'Shampoo': ['Daily Shampoo','Clarifying Shampoo','Dry Scalp Shampoo','Volumizing Shampoo'],
  'Conditioner': ['Daily Conditioner','Deep Conditioner','Leave-In Conditioner'],
  'Deodorant': ['Stick Deodorant','Spray Deodorant','Roll-On Deodorant','Antiperspirant'],
};

const STATUSES = ['Owned','Not Owned'];
const STOCKS = ['Full','Low','Empty'];
const CONCENTRATIONS = ['Parfum','EDP','EDT','EDC','Body Mist','Hair Mist'];
const SCENT_FAMILIES = ['Floral','Woody','Oriental','Fresh','Citrus','Gourmand','Aquatic','Fougère','Chypre','Leather','Spicy','Herbal'];
const SEASONS = ['Spring','Summer','Fall','Winter'];
const OCCASIONS = ['Casual','Work','Evening','Sport','Special','Date'];
const GENDERS = ['Feminine','Neutral','Masculine'];

let formStep = 0;
let formData = {};
let formPrices = [];
let formRating = 0;
let coverImageB64 = null;
let productImageB64 = null;
let totalSteps = 6;

function getSteps() {
  const isFragrance = (formData.category||'').includes('Fragrance');
  return isFragrance ? 5 : 4;
}

function openProductForm() {
  formStep = 0;
  // Don't reset formData if it was prefilled from barcode scan
  if(!formData._prefilled && !formData._editId) {
    formData = {};
  }
  formPrices = [];
  formRating = formData.rating || 0;
  coverImageB64 = null;
  productImageB64 = null;
  renderFormStep();
  openOverlay('formOverlay');

  // If we have an image URL from barcode, try to load it
  if(formData._imageUrl) {
    fetchRemoteImage(formData._imageUrl);
  }
}

async function fetchRemoteImage(url) {
  try {
    // Upload remote image to our Supabase Storage
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const filename = `product-remote-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${filename}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': blob.type,
        'x-upsert': 'true'
      },
      body: blob
    });

    if(uploadRes.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;
      productImageB64 = publicUrl;
      coverImageB64 = publicUrl;
      showToast('✓ Product image loaded');
    }
  } catch(e) {
    console.warn('Could not load remote image:', e);
  }
}

function closeProductForm() {
  closeOverlay('formOverlay');
}

function formNext() {
  if(!validateStep()) return;
  collectStep();
  const total = getSteps();
  if(formStep >= total - 1) {
    submitProduct();
    return;
  }
  formStep++;
  renderFormStep();
}

function formPrev() {
  if(formStep === 0) { closeProductForm(); return; }
  collectStep();
  formStep--;
  renderFormStep();
}

function validateStep() {
  if(formStep === 0) {
    const name = document.getElementById('f_name')?.value.trim();
    const brand = document.getElementById('f_brand')?.value.trim();
    const cat = formData.category;
    if(!name) { showToast('Product name is required'); return false; }
    if(!brand) { showToast('Brand is required'); return false; }
    if(!cat) { showToast('Please select a category'); return false; }
  }
  return true;
}

function collectStep() {
  if(formStep === 0) {
    formData.name = document.getElementById('f_name')?.value.trim();
    formData.brand = document.getElementById('f_brand')?.value.trim();
    const manualBarcode = document.getElementById('f_barcode_manual')?.value.trim();
    if(manualBarcode) formData._barcode = manualBarcode;
  }
  if(formStep === 1) {
    formData.description = document.getElementById('f_desc')?.value.trim();
    formData.ingredients = document.getElementById('f_ingredients')?.value.trim();
  }
  if(formStep === 3) {
    formPrices = formPrices; // already updated live
  }
}

function renderFormStep() {
  const total = getSteps();
  // Step dots
  document.getElementById('formStepIndicator').innerHTML =
    Array.from({length:total},(_,i) =>
      `<div class="form-step-dot${i===formStep?' active':''}"></div>`
    ).join('');

  document.getElementById('formBack').style.opacity = formStep===0?'0.3':'1';

  const steps = [
    { label: 'Step 1 of '+total, title: 'The Basics' },
    { label: 'Step 2 of '+total, title: 'Details' },
    { label: 'Step 3 of '+total, title: 'Image' },
    { label: 'Step 4 of '+total, title: 'Pricing' },
    { label: 'Step 5 of '+total, title: 'Fragrance Profile' },
  ];

  document.getElementById('formStepLabel').textContent = steps[formStep].label;
  document.getElementById('formStepTitle').textContent = steps[formStep].title;

  const isLast = formStep === total - 1;
  const btn = document.getElementById('formNextBtn');
  btn.textContent = isLast ? 'Add to Library' : 'Continue';

  const body = document.getElementById('formBody');

  if(formStep === 0) {
    body.innerHTML = `
      <div class="form-field">
        <div class="form-label">Barcode <span style="font-size:10px;color:var(--text3);text-transform:none;letter-spacing:0">(optional — scan or type)</span></div>
        <div style="display:flex;gap:8px">
          <input class="form-input" id="f_barcode_manual" type="number" placeholder="e.g. 4066447579673" value="${formData._barcode||''}" style="flex:1">
          <button onclick="openBarcodeScannerFromForm()" style="background:var(--bg2);border:0.5px solid var(--border2);color:var(--text2);font-size:18px;width:46px;height:46px;border-radius:10px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">📷</button>
        </div>
        <div class="form-note">Saved so future scans of this product are recognized instantly</div>
      </div>
      <div class="form-field">
        <div class="form-label">Product Name <span class="form-required">*</span></div>
        <input class="form-input" id="f_name" placeholder="e.g. Moisturizing Cream" value="${formData.name||''}">
      </div>
      <div class="form-field">
        <div class="form-label">Brand <span class="form-required">*</span></div>
        <input class="form-input" id="f_brand" placeholder="e.g. La Roche-Posay" value="${formData.brand||''}">
      </div>
      <div class="form-field">
        <div class="form-label">Category <span class="form-required">*</span></div>
        <div class="form-chips-wrap" id="catChips">
          ${CATEGORIES.map(c => `<button class="form-chip${formData.category===c?' selected':''}" onclick="selectCategory('${c}')">${c}</button>`).join('')}
        </div>
      </div>

      ${formData._barcode ? `<div class="form-field">
        <div class="form-label">Barcode</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="padding:8px 14px;background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;font-size:13px;color:var(--text2);font-family:monospace;letter-spacing:0.05em">${formData._barcode}</div>
          <span style="font-size:11px;color:var(--text3)">saved for future scans</span>
        </div>
      </div>` : ''}

`;
  }

  else if(formStep === 1) {
    body.innerHTML = `
      <div class="form-field">
        <div class="form-label">Product Type</div>
        <div class="form-chips-wrap" id="typeChips">
          ${getAllTypes(formData.category).map(t => `<button class="form-chip${formData.product_type===t?' selected':''}" onclick="selectType('${t}')">${t}</button>`).join('')}
          <button class="form-chip" onclick="addCustomType()" style="border-style:dashed">+ Custom</button>
        </div>
      </div>
      <div class="form-field" id="subcatField" style="${formData.product_type ? '' : 'display:none'}">
        <div class="form-label">Subcategory</div>
        <div class="form-chips-wrap" id="subcatChips">
          ${getAllSubcats(formData.product_type).map(s => `<button class="form-chip${formData.subcategory===s?' selected':''}" onclick="selectSubcat('${s}')">${s}</button>`).join('')}
          <button class="form-chip" onclick="addCustomSubcat()" style="border-style:dashed">+ Custom</button>
        </div>
      </div>
      <div class="form-field">
        <div class="form-label">Description</div>
        <textarea class="form-textarea" id="f_desc" placeholder="What is this product? What does it do?">${formData.description||''}</textarea>
      </div>
      <div class="form-field">
        <div class="form-label">Ingredients</div>
        <textarea class="form-textarea" id="f_ingredients" placeholder="Paste ingredient list (optional)" style="min-height:70px">${formData.ingredients||''}</textarea>
      </div>`;
  }

  else if(formStep === 2) {
    body.innerHTML = `
      <div class="form-field">
        <div class="form-label">Product Image</div>
        <div class="form-image-zone" id="coverZone">
          <input type="file" accept="image/*" onchange="handleImage(event,'cover')">
          ${coverImageB64
            ? `<img class="form-image-preview" src="${coverImageB64}" style="display:block;width:100%">`
            : `<div class="form-image-placeholder">🖼</div><div class="form-image-label">Tap to upload product image</div>`}
        </div>
      </div>`;
  }

  else if(formStep === 3) {
    body.innerHTML = `
      <div class="form-field">
        <div class="form-label">Where to Buy</div>
        <div id="priceEntries">${renderPriceEntries()}</div>
        <button class="form-add-price-btn" onclick="addPriceEntry()">+ Add source</button>
      </div>`;
  }

  else if(formStep === 4) {
    body.innerHTML = `
      <div class="form-field">
        <div class="form-label">Concentration</div>
        <div class="form-chips-wrap">
          ${CONCENTRATIONS.map(c => `<button class="form-chip${formData.concentration===c?' selected':''}" onclick="selectChip('concentration','${c}',this,'concChips')">${c}</button>`).join('')}
        </div>
      </div>
      <div class="form-field">
        <div class="form-label">Scent Family</div>
        <div class="form-chips-wrap">
          ${SCENT_FAMILIES.map(c => `<button class="form-chip${formData.scent_family===c?' selected':''}" onclick="selectChip('scent_family','${c}',this,'scentChips')">${c}</button>`).join('')}
        </div>
      </div>
      <div class="form-field">
        <div class="form-label">Top Notes</div>
        <input class="form-input" id="f_top" placeholder="e.g. Bergamot, Lemon, Pink Pepper" value="${formData.top_notes||''}">
        <div class="form-note">Separate with commas</div>
      </div>
      <div class="form-field">
        <div class="form-label">Heart Notes</div>
        <input class="form-input" id="f_heart" placeholder="e.g. Rose, Jasmine, Iris" value="${formData.heart_notes||''}">
      </div>
      <div class="form-field">
        <div class="form-label">Base Notes</div>
        <input class="form-input" id="f_base" placeholder="e.g. Sandalwood, Musk, Amber" value="${formData.base_notes||''}">
      </div>
      <div class="form-row-2" style="margin-bottom:16px">
        <div class="form-field" style="margin-bottom:0">
          <div class="form-label">Longevity</div>
          <input type="range" class="form-slider" id="f_longevity" min="1" max="10" value="${formData.longevity||5}" oninput="document.getElementById('longevityVal').textContent=this.value+'/10'">
          <div class="form-slider-val" id="longevityVal">${formData.longevity||5}/10</div>
        </div>
        <div class="form-field" style="margin-bottom:0">
          <div class="form-label">Sillage</div>
          <input type="range" class="form-slider" id="f_sillage" min="1" max="10" value="${formData.sillage||5}" oninput="document.getElementById('sillageVal').textContent=this.value+'/10'">
          <div class="form-slider-val" id="sillageVal">${formData.sillage||5}/10</div>
        </div>
      </div>
      <div class="form-field">
        <div class="form-label">Season</div>
        <div class="form-chips-wrap">
          ${SEASONS.map(s => `<button class="form-chip${(formData.season||[]).includes(s)?' selected':''}" onclick="toggleMultiChip('season','${s}',this)">${s}</button>`).join('')}
        </div>
      </div>
      <div class="form-field">
        <div class="form-label">Occasion</div>
        <div class="form-chips-wrap">
          ${OCCASIONS.map(s => `<button class="form-chip${(formData.occasion||[]).includes(s)?' selected':''}" onclick="toggleMultiChip('occasion','${s}',this)">${s}</button>`).join('')}
        </div>
      </div>
      <div class="form-field">
        <div class="form-label">Character</div>
        <div class="form-chips-wrap">
          ${GENDERS.map(g => `<button class="form-chip${formData.gender_impression===g?' selected':''}" onclick="selectChip('gender_impression','${g}',this,'genderChips')">${g}</button>`).join('')}
        </div>
      </div>`;
  }
}

function selectCategory(cat) {
  // Save any typed values before re-rendering
  const name = document.getElementById('f_name')?.value.trim();
  const brand = document.getElementById('f_brand')?.value.trim();
  const barcode = document.getElementById('f_barcode_manual')?.value.trim();
  if(name) formData.name = name;
  if(brand) formData.brand = brand;
  if(barcode) formData._barcode = barcode;
  formData.category = cat;
  renderFormStep();
}

function selectChip(field, val, btn, groupId) {
  formData[field] = val;
  // Deselect siblings
  btn.closest('.form-chips-wrap').querySelectorAll('.form-chip').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function toggleMultiChip(field, val, btn) {
  if(!formData[field]) formData[field] = [];
  const idx = formData[field].indexOf(val);
  if(idx > -1) { formData[field].splice(idx,1); btn.classList.remove('selected'); }
  else { formData[field].push(val); btn.classList.add('selected'); }
}

function setRating(val) {
  formRating = val;
  document.querySelectorAll('.form-rating-star').forEach((s,i) => s.classList.toggle('filled', i<val));
  const el = document.querySelector('[style*="Tap to rate"]');
  if(el) el.textContent = val+'/10';
}

function renderPriceEntries() {
  if(!formPrices.length) return '';
  return formPrices.map((p,i) => `
    <div class="form-price-entry">
      <button class="form-price-remove" onclick="removePriceEntry(${i})">✕</button>
      <div class="form-row-2" style="margin-bottom:8px">
        <div>
          <div class="form-label">Retailer</div>
          <input class="form-input" placeholder="e.g. Douglas" value="${p.source_name||''}" oninput="formPrices[${i}].source_name=this.value" style="padding:9px 12px">
        </div>
        <div>
          <div class="form-label">Price (€)</div>
          <input class="form-input" type="number" placeholder="0.00" value="${p.price||''}" oninput="formPrices[${i}].price=parseFloat(this.value)" style="padding:9px 12px">
        </div>
      </div>
      <div class="form-row-2" style="margin-bottom:8px">
        <div>
          <div class="form-label">Amount in pack</div>
          <input class="form-input" type="number" placeholder="e.g. 2" value="${p.pack_amount||1}" oninput="formPrices[${i}].pack_amount=parseInt(this.value)||1" style="padding:9px 12px">
          <div class="form-note">How many items in this listing</div>
        </div>
        <div>
          <div class="form-label">Size per item</div>
          <div style="display:flex;gap:4px">
            <input class="form-input" type="number" placeholder="200" value="${p.size_amount||''}" oninput="formPrices[${i}].size_amount=parseFloat(this.value)" style="padding:9px 12px;flex:1">
            <div class="form-chips-wrap" style="flex-shrink:0">
              ${['ml','g','pcs'].map(u=>`<button class="form-chip${(p.size_unit||'ml')===u?' selected':''}" onclick="setPriceSizeUnit(${i},'${u}')">${u}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="form-field" style="margin-bottom:8px">
        <div class="form-label">URL</div>
        <input class="form-input" placeholder="https://..." value="${p.url||''}" oninput="formPrices[${i}].url=this.value" style="padding:9px 12px">
      </div>

    </div>`).join('');
}

function setPriceSizeUnit(i, unit) {
  formPrices[i].size_unit = unit;
  document.getElementById('priceEntries').innerHTML = renderPriceEntries();
}

function updatePriceSizeUnit(i) {
  // just update value, no re-render needed
}

function addPriceEntry() {
  formPrices.push({source_name:'',price:null,url:''});
  document.getElementById('priceEntries').innerHTML = renderPriceEntries();
}

function removePriceEntry(i) {
  formPrices.splice(i,1);
  document.getElementById('priceEntries').innerHTML = renderPriceEntries();
}

// IMAGE RESIZER
async function handleImage(event, type) {
  const file = event.target.files[0];
  if(!file) return;

  // Show instant preview
  const objectUrl = URL.createObjectURL(file);
  const zoneId = type==='cover' ? 'coverZone' : 'productZone';
  const zone = document.getElementById(zoneId);
  if(zone) {
    zone.querySelector('.form-image-placeholder')?.remove();
    zone.querySelector('.form-image-label')?.remove();
    let preview = zone.querySelector('.form-image-preview');
    if(!preview) {
      preview = document.createElement('img');
      preview.className = 'form-image-preview';
      zone.appendChild(preview);
    }
    preview.src = objectUrl;
    preview.style.display = 'block';
  }

  // Upload directly to Supabase Storage
  showToast('Uploading image...');
  const ext = file.name.split('.').pop() || 'png';
  const filename = `${type}-${Date.now()}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${filename}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true'
    },
    body: file
  });

  if(!res.ok) {
    showToast('Upload failed — try again');
    console.error('Storage upload failed:', await res.text());
    return;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${filename}`;

  if(type === 'cover') coverImageB64 = publicUrl;
  else productImageB64 = publicUrl;

  showToast('✓ Image uploaded');
  URL.revokeObjectURL(objectUrl);
}

async function submitProduct() {
  // Collect last step
  if(formStep===1) {
    formData.ingredients = document.getElementById('f_ingredients')?.value.trim();
  }
  if(formStep===4) {
    formData.top_notes = document.getElementById('f_top')?.value.trim();
    formData.heart_notes = document.getElementById('f_heart')?.value.trim();
    formData.base_notes = document.getElementById('f_base')?.value.trim();
    formData.longevity = parseInt(document.getElementById('f_longevity')?.value)||null;
    formData.sillage = parseInt(document.getElementById('f_sillage')?.value)||null;
  }

  const btn = document.getElementById('formNextBtn');
  btn.disabled=true; btn.textContent='Saving...';

  const productPayload = {
    name: formData.name,
    brand: formData.brand,
    category: formData.category,
    product_type: formData.product_type||null,
    subcategory: formData.subcategory||null,
    description: formData.description||null,
    personal_notes: formData.personal_notes||null,
    ingredients: formData.ingredients||null,
    rating: formData.rating||null,
    cover_image_url: coverImageB64||null,
    concentration: formData.concentration||null,
    scent_family: formData.scent_family||null,
    top_notes: formData.top_notes||null,
    heart_notes: formData.heart_notes||null,
    base_notes: formData.base_notes||null,
    longevity: formData.longevity||null,
    sillage: formData.sillage||null,
    season: formData.season||null,
    occasion: formData.occasion||null,
    gender_impression: formData.gender_impression||null,
    barcode: formData._barcode || null
  };

  const isEdit = !!formData._editId;

  if(isEdit) {
    // UPDATE existing product
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${formData._editId}`, {
      method:'PATCH',
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify(productPayload)
    });
    if(!res.ok) { showToast('Error updating product'); btn.disabled=false; btn.textContent='Save Changes'; return; }
    const [updated] = await res.json();
    const idx = allProducts.findIndex(p=>p.id===formData._editId);
    if(idx>-1) allProducts[idx] = updated;
    showToast('✓ Product updated');
    closeProductForm();
    filterLibrary();
    btn.disabled=false; btn.textContent='Save Changes';
  } else {
    // INSERT new product
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify(productPayload)
    });
    if(!res.ok) { showToast('Error saving product'); btn.disabled=false; btn.textContent='Add to Library'; return; }
    const [newProduct] = await res.json();

    // Insert prices
    if(formPrices.length && newProduct) {
      const priceRows = formPrices.filter(p=>p.price||p.source_name).map(p=>({source_name:p.source_name||null,price:p.price||null,url:p.url||null,size_amount:p.size_amount||null,size_unit:p.size_unit||'ml',pack_amount:p.pack_amount||1,ml_per_piece:p.ml_per_piece||null,g_per_piece:p.g_per_piece||null,product_id:newProduct.id,currency:'EUR'}));
      if(priceRows.length) await apiPost('product_prices',priceRows);
    }

    showToast('✓ Product added to Library');
    closeProductForm();
    allProducts.push(newProduct);
    filterLibrary();
    btn.disabled=false; btn.textContent='Add to Library';
  }
}

// ============================================================
// LIBRARY
// ============================================================
let allProducts = [];
let allLists = [];
let productListMembership = {}; // productId -> [listId, ...]
let productPrices = {}; // productId -> [price rows]
let activeListFilter = 'all';
let currentDetailProduct = null;

async function initLibrary() {
  // Load lists
  const listsData = await api('product_lists', '?order=sort_order.asc');
  allLists = listsData || [];

  // Load all products
  const prodsData = await api('products', '?order=name.asc');
  allProducts = prodsData || [];

  // Load list memberships
  const memberData = await api('product_list_items', '?select=list_id,product_id');
  productListMembership = {};
  (memberData || []).forEach(m => {
    if(!productListMembership[m.product_id]) productListMembership[m.product_id] = [];
    productListMembership[m.product_id].push(m.list_id);
  });

  // Preload all prices so cards can show them
  const allPrices = await api('product_prices', '?order=price.asc');
  productPrices = {};
  (allPrices||[]).forEach(pr => {
    if(!productPrices[pr.product_id]) productPrices[pr.product_id] = [];
    productPrices[pr.product_id].push(pr);
  });

  renderListTabs();
  renderTypeGrid();
}

// ============================================================
// PRODUCT TYPE GRID (Library home view)
// ============================================================
let currentTypeFilter = null; // null = grid view; set = inside a type
const UNCATEGORIZED_KEY = '__uncategorized__';

function renderTypeGrid() {
  const grid = document.getElementById('typeGrid');
  if (!allProducts.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-glyph">∅</div><div class="empty-title">Nothing here yet</div><div class="empty-sub">Tap + to add your first product</div></div>`;
    document.getElementById('azRailTypes').innerHTML = '';
    return;
  }

  // Group products by product_type
  const groups = {};
  const uncategorized = [];
  allProducts.forEach(p => {
    if (!p.product_type) { uncategorized.push(p); return; }
    if (!groups[p.product_type]) groups[p.product_type] = [];
    groups[p.product_type].push(p);
  });

  const typeNames = Object.keys(groups).sort((a,b) => a.localeCompare(b));

  const tileHTML = (typeName, products) => {
    const first = products[0];
    const thumb = first.cover_image_url || first.image_url;
    return `<div class="type-tile" data-letter="${typeName[0].toUpperCase()}" onclick="openTypeDetail('${typeName.replace(/'/g,"\\'")}')">
      <div class="type-tile-thumb">${thumb ? `<img src="${thumb}" alt="">` : '🧴'}</div>
      <div class="type-tile-info">
        <div class="type-tile-name">${escHtml(typeName)}</div>
        <div class="type-tile-count">${products.length} product${products.length===1?'':'s'}</div>
      </div>
      <div class="type-tile-chevron">›</div>
    </div>`;
  };

  let html = typeNames.map(t => tileHTML(t, groups[t])).join('');

  if (uncategorized.length) {
    html += `<div class="type-section-label">Uncategorized</div>`;
    html += `<div class="type-tile" data-letter="#" onclick="openTypeDetail('${UNCATEGORIZED_KEY}')">
      <div class="type-tile-thumb">${(uncategorized[0].cover_image_url||uncategorized[0].image_url) ? `<img src="${uncategorized[0].cover_image_url||uncategorized[0].image_url}" alt="">` : '❓'}</div>
      <div class="type-tile-info">
        <div class="type-tile-name">No product type</div>
        <div class="type-tile-count">${uncategorized.length} product${uncategorized.length===1?'':'s'}</div>
      </div>
      <div class="type-tile-chevron">›</div>
    </div>`;
  }

  grid.innerHTML = html;
  renderAZRail('azRailTypes', typeNames, 'typeGridScroll', '.type-tile');
}

function openTypeDetail(typeName) {
  currentTypeFilter = typeName;
  document.getElementById('typeGridView').classList.add('hidden');
  document.getElementById('typeDetailView').classList.add('active');

  const isUncat = typeName === UNCATEGORIZED_KEY;
  document.getElementById('typeDetailLabel').textContent = 'Self Care · Library';
  document.getElementById('typeDetailTitle').textContent = isUncat ? 'No product type' : typeName;

  renderSubcatFilters(typeName);
  renderListTabs();
  filterLibrary();
}

function closeTypeDetail() {
  currentTypeFilter = null;
  document.getElementById('typeDetailView').classList.remove('active');
  document.getElementById('typeGridView').classList.remove('hidden');
  document.getElementById('libSearch').value = '';
  activeSubcatFilter = 'All';
  renderTypeGrid();
}

let activeSubcatFilter = 'All';
function renderSubcatFilters(typeName) {
  const row = document.getElementById('libFilterRow');
  if (typeName === UNCATEGORIZED_KEY) { row.innerHTML = ''; return; }
  const productsOfType = allProducts.filter(p => p.product_type === typeName);
  const subcats = ['All', ...new Set(productsOfType.map(p => p.subcategory).filter(Boolean))];
  if (subcats.length <= 1) { row.innerHTML = ''; return; }
  activeSubcatFilter = 'All';
  row.innerHTML = subcats.map(s =>
    `<button class="lib-filter-btn${s===activeSubcatFilter?' active':''}" onclick="setSubcatFilter('${s.replace(/'/g,"\\'")}')">${escHtml(s)}</button>`
  ).join('');
}

function setSubcatFilter(s) {
  activeSubcatFilter = s;
  document.querySelectorAll('#libFilterRow .lib-filter-btn').forEach(b => b.classList.toggle('active', b.textContent.trim()===s.trim()));
  filterLibrary();
}

// ── A-Z RAIL (shared by type grid and product list) ─────────────────────────
function renderAZRail(railId, names, scrollId, tileSelector) {
  const rail = document.getElementById(railId);
  if (!rail) return;
  const present = new Set(names.map(n => (n[0]||'#').toUpperCase()));
  const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  rail.innerHTML = alphabet.map(letter =>
    `<div class="az-rail-letter${present.has(letter)?'':' dim'}" data-letter="${letter}">${letter}</div>`
  ).join('');

  let touching = false;
  const jumpTo = (letter) => {
    const scroll = document.getElementById(scrollId);
    if (!scroll) return;
    const target = scroll.querySelector(`[data-letter="${letter}"]`);
    if (target) target.scrollIntoView({block:'start'});
    rail.querySelectorAll('.az-rail-letter').forEach(el => el.classList.toggle('active', el.dataset.letter===letter));
  };

  const handleTouch = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.classList.contains('az-rail-letter') && !el.classList.contains('dim')) {
      jumpTo(el.dataset.letter);
      if (navigator.vibrate) navigator.vibrate(3);
    }
  };

  rail.ontouchstart = (e) => { touching = true; handleTouch(e); };
  rail.ontouchmove = (e) => { if (touching) { e.preventDefault(); handleTouch(e); } };
  rail.ontouchend = () => { touching = false; };
  rail.onclick = (e) => {
    if (e.target.classList.contains('az-rail-letter') && !e.target.classList.contains('dim')) {
      jumpTo(e.target.dataset.letter);
    }
  };
}

function renderListTabs() {
  const container = document.getElementById('libLists');
  const allBtn = `<button class="lib-list-btn${activeListFilter==='all'?' active':''}" onclick="setListFilter('all')">All</button>`;
  const listBtns = allLists.map(l =>
    `<button class="lib-list-btn${activeListFilter===l.id?' active':''}" onclick="setListFilter('${l.id}')">
      <span class="list-icon">${l.icon||''}</span>${l.name}
    </button>`
  ).join('');
  container.innerHTML = allBtn + listBtns;
}

function setListFilter(id) {
  activeListFilter = id;
  renderListTabs();
  filterLibrary();
}

function filterLibrary() {
  const query = document.getElementById('libSearch').value.toLowerCase();
  const sort = document.getElementById('libSort').value;

  let filtered = allProducts.filter(p => {
    const matchType = currentTypeFilter === UNCATEGORIZED_KEY
      ? !p.product_type
      : p.product_type === currentTypeFilter;
    const matchSearch = !query ||
      p.name?.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.product_type?.toLowerCase().includes(query) ||
      p.subcategory?.toLowerCase().includes(query);
    const matchSubcat = activeSubcatFilter === 'All' || p.subcategory === activeSubcatFilter;
    const matchList = activeListFilter === 'all' ||
      (productListMembership[p.id]||[]).includes(activeListFilter);
    return matchType && matchSearch && matchSubcat && matchList;
  });

  // Sort
  filtered.sort((a,b) => {
    if(sort==='name') return (a.name||'').localeCompare(b.name||'');
    if(sort==='brand') return (a.brand||'').localeCompare(b.brand||'');
    if(sort==='rating') return (b.rating||0)-(a.rating||0);
    if(sort==='newest') return new Date(b.created_at)-new Date(a.created_at);
    return 0;
  });

  renderLibraryGrid(filtered);
  renderAZRail('azRailProducts', filtered.map(p=>p.name||''), 'libScroll', '.lib-card');
}

function renderLibraryGrid(products) {
  const grid = document.getElementById('libGrid');
  if(!products.length) {
    grid.innerHTML = `<div style="grid-column:span 3"><div class="empty-state"><div class="empty-glyph">∅</div><div class="empty-title">Nothing here yet</div><div class="empty-sub">Tap + to add your first product, or try a different filter</div></div></div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const stockClass = p.stock==='Low'?'stock-low':p.stock==='Empty'?'stock-empty':'stock-full';
    const lists = (productListMembership[p.id]||[]);
    const listIcons = lists.map(lid => {
      const l = allLists.find(x=>x.id===lid);
      return l ? `<span class="lib-card-list-dot">${l.icon||''}</span>` : '';
    }).join('');
    const stars = p.rating ? Math.round(p.rating/2) : 0;

    // Get cheapest price for this product from cached prices
    const prices = productPrices[p.id] || [];
    const cheapest = prices.length ? prices.reduce((a,b) => (a.price||999)<(b.price||999)?a:b) : null;
    const priceDisplay = cheapest ? `<span class="lib-card-price">€${Number(cheapest.price).toFixed(2)}</span>${cheapest.url ? `<span class="lib-card-link">${cheapest.url.replace(/^https?:\/\//,'').replace(/\/.*$/,'')}</span>` : ''}` : '';

    return `<div class="lib-card" data-pid="${p.id}" data-letter="${(p.name?.[0]||'#').toUpperCase()}" onclick="handleCardClick('${p.id}')">
      <div class="lib-card-cover">
        ${p.cover_image_url||p.image_url
          ? `<img src="${p.cover_image_url||p.image_url}" alt="${p.name}">`
          : `<div class="lib-card-cover-placeholder">🧴</div>`}
        <div class="lib-card-status ${stockClass}"></div>
        ${p.rating ? `<div class="lib-card-rating">★ ${p.rating}</div>` : ''}
        ${listIcons ? `<div class="lib-card-lists">${listIcons}</div>` : ''}
      </div>
      <div class="lib-card-info">
        <div class="lib-card-name">${p.name}</div>
        <div class="lib-card-brand">${p.brand||''}</div>
        ${priceDisplay ? `<div class="lib-card-price-row">${priceDisplay}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// DETAIL
async function openDetail(productId) {
  const p = allProducts.find(x=>x.id===productId);
  if(!p) return;
  currentDetailProduct = p;

  // Load prices
  const prices = await api('product_prices', `?product_id=eq.${productId}&order=price.asc`);
  productPrices[productId] = prices||[];

  // Load list memberships for this product
  const membership = (productListMembership[productId]||[]);

  // Build detail
  const stockClass = p.stock==='Low'?'stock-pill-low':p.stock==='Empty'?'stock-pill-empty':'stock-pill-full';
  const isFragrance = p.category === 'Fragrance' || p.category === '🌸 Fragrance';

  // Stars (out of 10, show 10 stars)
  const starsHtml = Array.from({length:10},(_,i)=>
    `<span class="detail-star${p.rating&&i<Math.round(p.rating)?' filled':''}">★</span>`
  ).join('');

  // List chips
  const listChips = allLists.map(l => {
    const inList = membership.includes(l.id);
    return `<button class="detail-list-chip${inList?' in-list':''}" onclick="toggleListMembership('${productId}','${l.id}',this)">
      ${l.icon||''} ${l.name}
    </button>`;
  }).join('');

  // Prices
  const priceHtml = productPrices[productId].length
    ? productPrices[productId].map(pr => {
        const packAmt = pr.pack_amount||1;
        const sizePerItem = pr.size_amount||0;
        const totalSize = packAmt * sizePerItem;
        const unit = pr.size_unit||'ml';
        const pricePerUnit = totalSize > 0 && pr.price ? (pr.price/totalSize).toFixed(2) : null;
        const totalStr = packAmt > 1 ? `${packAmt} × ${sizePerItem}${unit} = ${totalSize}${unit}` : sizePerItem ? `${sizePerItem}${unit}` : '';
        return `<div class="detail-price-row">
          <div>
            <div class="detail-price-source">${pr.source_name||'Source'}</div>
            ${totalStr ? `<div style="font-size:11px;color:var(--text3)">${totalStr}</div>` : ''}
            ${pr.url ? `<a class="detail-price-link" href="${pr.url}" target="_blank">View →</a>` : ''}
          </div>
          <div style="text-align:right">
            <div class="detail-price-val">${pr.currency||'€'}${Number(pr.price).toFixed(2)}</div>
            ${pricePerUnit ? `<div style="font-size:10px;color:var(--text3)">€${pricePerUnit}/${unit}</div>` : ''}
          </div>
        </div>`;
      }).join('')
    : `<div style="font-size:13px;color:var(--text3);font-style:italic">No prices added yet</div>`;

  // Fragrance section
  const fragranceHtml = isFragrance ? `
    <div class="detail-section">
      <div class="detail-section-title">Fragrance Profile</div>
      ${p.concentration ? `<div class="detail-grid-2" style="margin-bottom:8px"><div class="detail-stat"><div class="detail-stat-label">Concentration</div><div class="detail-stat-val">${p.concentration}</div></div>${p.gender_impression?`<div class="detail-stat"><div class="detail-stat-label">Character</div><div class="detail-stat-val">${p.gender_impression}</div></div>`:''}</div>` : ''}
      ${p.top_notes ? `<div class="detail-stat" style="margin-bottom:8px"><div class="detail-stat-label">Top Notes</div><div class="detail-tag-row">${p.top_notes.split(',').map(n=>`<span class="notes-chip">${n.trim()}</span>`).join('')}</div></div>` : ''}
      ${p.heart_notes ? `<div class="detail-stat" style="margin-bottom:8px"><div class="detail-stat-label">Heart Notes</div><div class="detail-tag-row">${p.heart_notes.split(',').map(n=>`<span class="notes-chip">${n.trim()}</span>`).join('')}</div></div>` : ''}
      ${p.base_notes ? `<div class="detail-stat" style="margin-bottom:8px"><div class="detail-stat-label">Base Notes</div><div class="detail-tag-row">${p.base_notes.split(',').map(n=>`<span class="notes-chip">${n.trim()}</span>`).join('')}</div></div>` : ''}
      ${p.longevity||p.sillage ? `<div class="detail-grid-2" style="margin-bottom:8px">
        ${p.longevity?`<div class="detail-stat"><div class="detail-stat-label">Longevity</div><div class="detail-stat-val">${p.longevity}/10</div><div class="detail-meter"><div class="detail-meter-fill" style="width:${p.longevity*10}%"></div></div></div>`:''}
        ${p.sillage?`<div class="detail-stat"><div class="detail-stat-label">Sillage</div><div class="detail-stat-val">${p.sillage}/10</div><div class="detail-meter"><div class="detail-meter-fill" style="width:${p.sillage*10}%"></div></div></div>`:''}
      </div>` : ''}
      ${p.season?.length ? `<div class="detail-stat"><div class="detail-stat-label">Season</div><div class="detail-tag-row">${p.season.map(s=>`<span class="notes-chip">${s}</span>`).join('')}</div></div>` : ''}
      ${p.occasion?.length ? `<div class="detail-stat" style="margin-top:8px"><div class="detail-stat-label">Occasion</div><div class="detail-tag-row">${p.occasion.map(s=>`<span class="notes-chip">${s}</span>`).join('')}</div></div>` : ''}
    </div>` : '';

  const heroImg = p.cover_image_url
    ? `<img src="${p.cover_image_url}" alt="${p.name}">`
    : `<div class="detail-hero-img-placeholder">🧴</div>`;

  const pid = p.id;
  const heroStars = Array.from({length:10},(_,i)=>
    `<span class="detail-hero-star${p.rating&&i<Math.round(p.rating)?' filled':''}" ontouchend="event.stopPropagation();window._rate('${p.id}',${i+1})" onclick="window._rate('${p.id}',${i+1})">★</span>`
  ).join('');

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-img">${heroImg}</div>
      <div class="detail-hero-info">
        <div class="detail-hero-category">${p.category||''}${p.product_type?' · '+p.product_type:''}${p.subcategory?' · '+p.subcategory:''}</div>
        <div class="detail-hero-name">${p.name}</div>
        <div class="detail-hero-brand">${p.brand||''}</div>
        <div class="detail-hero-rating" id="detailRatingInline-${p.id}">
          ${heroStars}

        </div>
      </div>
    </div>

    <div class="detail-body-pad">
      <div class="detail-section">
        <div class="detail-section-title">Lists</div>
        <div class="detail-lists-row">${listChips}</div>
      </div>

      <div class="detail-section">
        <button class="add-to-kit-btn" onclick="openAddToKit('${p.id}')">+ Add to My Kit</button>
        <div id="kitInstancesFor-${p.id}" style="margin-top:10px"></div>
      </div>

      ${p.description ? `<div class="detail-section"><div class="detail-section-title">Description</div><div class="detail-text">${formatDescription(p.description)}</div></div>` : ''}

      <div class="detail-section">
        <div class="detail-section-title">Personal Notes</div>
        <textarea class="detail-notes-edit" id="detailNotes-${p.id}" placeholder="Your thoughts, observations..." onblur="saveNotes('${p.id}')">${p.personal_notes||''}</textarea>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Where to Buy</div>
        <div class="detail-prices">${priceHtml}</div>
      </div>

      ${fragranceHtml}

      ${p.ingredients ? `<div class="detail-section"><div class="detail-section-title">Ingredients</div><div class="detail-text" style="font-size:11px;line-height:1.7">${p.ingredients}</div></div>` : ''}
    </div>
  `;

  openOverlay('detailOverlay');
  loadKitInstances(productId);


}

function closeDetail() {
  closeOverlay('detailOverlay');
  currentDetailProduct = null;
}

async function toggleListMembership(productId, listId, btn) {
  const inList = btn.classList.contains('in-list');
  if(inList) {
    // Remove
    await fetch(`${SUPABASE_URL}/rest/v1/product_list_items?product_id=eq.${productId}&list_id=eq.${listId}`, {
      method:'DELETE',
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
    });
    btn.classList.remove('in-list');
    if(!productListMembership[productId]) productListMembership[productId]=[];
    productListMembership[productId] = productListMembership[productId].filter(id=>id!==listId);
  } else {
    // Add
    await apiPost('product_list_items', {product_id:productId, list_id:listId});
    btn.classList.add('in-list');
    if(!productListMembership[productId]) productListMembership[productId]=[];
    productListMembership[productId].push(listId);
  }
}

// Close detail on overlay backdrop click
document.getElementById('detailOverlay').addEventListener('click', function(e) {
  if(e.target === this) closeDetail();
});

// ============================================================
// HOME ALERTS
// ============================================================
async function loadHomeAlerts() {
  const today = new Date();
  const data = await api('products', '?status=eq.Owned&order=name.asc');
  const alerts = [];

  (data||[]).forEach(p => {
    // Low/Empty stock alerts
    if(p.stock === 'Empty') {
      alerts.push({type:'empty', icon:'🔴', title: p.name, sub: `${p.brand||''} · Out of stock`, id: p.id});
    } else if(p.stock === 'Low') {
      alerts.push({type:'low', icon:'🟡', title: p.name, sub: `${p.brand||''} · Running low`, id: p.id});
    }
  });

  const alertsEl = document.getElementById('homeAlerts');
  if(!alertsEl) return;
  if(!alerts.length) { alertsEl.innerHTML = ''; return; }

  alertsEl.innerHTML = `<div class="home-alerts">` +
    alerts.slice(0,4).map(a => `
      <div class="alert-card" onclick="navigate('library')">
        <span class="alert-icon">${a.icon}</span>
        <div class="alert-text">
          <div class="alert-title">${a.title}</div>
          <div class="alert-sub">${a.sub}</div>
        </div>
        <div class="alert-dot ${a.type==='empty'?'alert-dot-empty':'alert-dot-low'}"></div>
      </div>`).join('') +
  `</div>`;
}

// ============================================================
// EXPIRY TRACKER
// ============================================================
async function getExpiryEstimate(product) {
  // Get cycle history for this product
  const cycles = await api('product_cycles', `?product_id=eq.${product.id}&order=created_at.desc`);
  if(!cycles || !cycles.length) return null;

  const avgDaysPerMl = cycles.reduce((s,c) => s + (c.days_per_ml||0), 0) / cycles.length;
  const avgMlPerUse = cycles.reduce((s,c) => s + (c.ml_per_use||0), 0) / cycles.length;

  if(!product.container_size || !avgDaysPerMl) return null;

  // Get how many times logged so far this cycle
  const logCount = await api('daily_log', `?product_used=eq.${product.id}&select=id`);
  const usesLogged = (logCount||[]).length;

  const mlUsed = usesLogged * avgMlPerUse;
  const mlRemaining = Math.max(0, product.container_size - mlUsed);
  const daysLeft = Math.round(mlRemaining * avgDaysPerMl);
  const usesLeft = avgMlPerUse > 0 ? Math.round(mlRemaining / avgMlPerUse) : null;

  return { daysLeft, usesLeft, mlRemaining: Math.round(mlRemaining*10)/10, unit: product.container_unit||'ml' };
}

async function markProductEmpty(productId) {
  const p = allProducts.find(x=>x.id===productId);
  if(!p || !p.container_size) return;

  const today = new Date().toISOString().split('T')[0];
  const logCount = await api('daily_log', `?product_used=eq.${productId}&select=id`);
  const totalUses = (logCount||[]).length;

  // Calculate first use date
  const firstLog = await api('daily_log', `?product_used=eq.${productId}&order=date.asc&limit=1`);
  const firstDate = firstLog?.[0]?.date || p.opened_date || today;
  const daysDiff = Math.max(1, Math.round((new Date(today)-new Date(firstDate))/(1000*60*60*24)));

  const daysPerMl = p.container_size > 0 ? daysDiff/p.container_size : null;
  const mlPerUse = totalUses > 0 ? p.container_size/totalUses : null;

  // Save cycle
  await apiPost('product_cycles', {
    product_id: productId,
    container_size: p.container_size,
    container_unit: p.container_unit,
    first_use_date: firstDate,
    empty_date: today,
    total_days: daysDiff,
    total_uses: totalUses,
    days_per_ml: daysPerMl,
    ml_per_use: mlPerUse
  });

  // Update product
  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
    method:'PATCH',
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({stock:'Empty', empty_date:today, estimated_days_per_ml:daysPerMl})
  });

  showToast('Cycle saved — data learned ✓');
  await initLibrary();
}

// ============================================================
// QUICK ADD TO ROUTINE
// ============================================================
async function loadRoutineStepsForProduct(productId) {
  const container = document.getElementById(`detailRoutineSteps-${productId}`);
  if(!container) return;

  // Get all steps
  const steps = await api('routine_tasks', '?order=time_of_day.asc,order.asc');
  // Get current links (stored in products.routine_steps as array of step IDs if we had it)
  // We'll use daily_log to infer, but for quick-add we just show all steps as toggleable
  const loggedWith = await api('daily_log', `?product_used=eq.${productId}&select=step_name&limit=50`);
  const linkedStepNames = new Set((loggedWith||[]).map(l=>l.step_name));

  if(!steps || !steps.length) {
    container.innerHTML = '<span style="font-size:11px;color:var(--text3)">No routine steps found</span>';
    return;
  }

  // Group by session
  const am = steps.filter(s=>s.time_of_day==='Morning');
  const pm = steps.filter(s=>s.time_of_day==='Evening');

  container.innerHTML = `
    <div style="width:100%">
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">Morning</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">
        ${am.map(s=>`<button class="routine-step-chip${linkedStepNames.has(s.name)?' linked':''}" onclick="quickLinkStep('${productId}','${s.name}',this)">${s.name}</button>`).join('')}
      </div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">Evening</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">
        ${pm.map(s=>`<button class="routine-step-chip${linkedStepNames.has(s.name)?' linked':''}" onclick="quickLinkStep('${productId}','${s.name}',this)">${s.name}</button>`).join('')}
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.5">Highlighted steps have used this product before. Tap any step to mark this as your go-to product for it.</div>
    </div>`;
}

function quickLinkStep(productId, stepName, btn) {
  btn.classList.toggle('linked');
  showToast(btn.classList.contains('linked') ? `Linked to ${stepName}` : `Unlinked from ${stepName}`);
}

// ============================================================
// EDIT PRODUCT
// ============================================================
function editProduct() {
  if(!currentDetailProduct) return;
  const p = currentDetailProduct;
  // Pre-fill formData from existing product
  formData = {
    name: p.name,
    brand: p.brand,
    category: p.category,
    product_type: p.product_type,
    subcategory: p.subcategory,
    status: p.status,
    stock: p.stock,
    description: p.description,
    personal_notes: p.personal_notes,
    ingredients: p.ingredients,
    rating: p.rating,
    container_size: p.container_size,
    container_unit: p.container_unit||'ml',
    concentration: p.concentration,
    scent_family: p.scent_family,
    top_notes: p.top_notes,
    heart_notes: p.heart_notes,
    base_notes: p.base_notes,
    longevity: p.longevity,
    sillage: p.sillage,
    season: p.season||[],
    occasion: p.occasion||[],
    gender_impression: p.gender_impression,
    body_areas: p.body_areas||[],
    _editId: p.id
  };
  formRating = p.rating||0;
  coverImageB64 = p.cover_image_url||null;
  productImageB64 = p.image_url||null;
  formPrices = productPrices[p.id]||[];
  formStep = 0;
  closeDetail();
  renderFormStep();
  openOverlay('formOverlay');
  // Change submit button label
  document.getElementById('formNextBtn').textContent = formStep === getSteps()-1 ? 'Save Changes' : 'Continue';
}

async function deleteProduct() {
  if(!currentDetailProduct) return;
  if(!confirm(`Delete "${currentDetailProduct.name}"? This cannot be undone.`)) return;

  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${currentDetailProduct.id}`, {
    method:'DELETE',
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}
  });

  allProducts = allProducts.filter(p=>p.id!==currentDetailProduct.id);
  closeDetail();
  filterLibrary();
  showToast('Product deleted');
}

// ============================================================
// BARCODE SCANNER (ZXing — works on Safari)
// ============================================================
let zxingReader = null;
let barcodeScanning = false;
let manualVisible = false;

async function openBarcodeScannerFromForm() {
  // Close form temporarily, scan, then reopen with prefilled data
  closeOverlay('formOverlay');
  await openBarcodeScanner(true);
}

async function openBarcodeScanner(fromForm = false) {
  manualVisible = false;
  openOverlay('barcodeOverlay');
  document.getElementById('manualWrap').style.display = 'none';
  document.getElementById('manualToggleBtn').textContent = 'Enter barcode manually';
  setBarcodeStatus('🔍 Starting camera...', 'dim');

  try {
    if(typeof ZXing === 'undefined') {
      setBarcodeStatus('⚠️ Scanner not loaded — use manual entry', 'warn');
      toggleManualEntry(); return;
    }

    // Request camera stream directly — works on Safari
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    const video = document.getElementById('barcodeVideo');
    video.srcObject = stream;
    await video.play();
    setBarcodeStatus('📷 Point at barcode', 'ok');

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.CODE_128,
    ]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    zxingReader = new ZXing.BrowserMultiFormatReader(hints, 300);
    barcodeScanning = true;

    // Store stream reference for cleanup
    zxingReader._stream = stream;

    await zxingReader.decodeFromStream(stream, video, async (result, err) => {
      if(result && barcodeScanning) {
        barcodeScanning = false;
        const barcode = result.getText();
        setBarcodeStatus(`✓ Got it: ${barcode}`, 'ok');
        if(navigator.vibrate) navigator.vibrate([30,50,80]);
        await new Promise(r=>setTimeout(r,500));
        closeBarcodeScanner();
        await lookupBarcode(barcode, fromForm);
        return;
      }
      // NotFoundException is normal — fires every frame until detected, ignore it
      if(err && err.name !== 'NotFoundException') {
        console.warn('Scan err:', err.name);
      }
    });

  } catch(e) {
    console.error('Scanner error:', e);
    if(e.name === 'NotAllowedError') {
      setBarcodeStatus('🚫 Camera permission denied — allow in Settings', 'warn');
    } else if(e.name === 'NotFoundError') {
      setBarcodeStatus('📷 No camera found', 'warn');
    } else if(e.name === 'NotReadableError') {
      setBarcodeStatus('📷 Camera in use by another app', 'warn');
    } else {
      setBarcodeStatus('⚠️ ' + (e.message||'Camera error'), 'warn');
    }
    setTimeout(toggleManualEntry, 1000);
  }
}

function setBarcodeStatus(msg, type) {
  const el = document.getElementById('barcodeStatus');
  if(!el) return;
  el.textContent = msg;
  el.style.color = type==='ok' ? 'rgba(200,184,154,0.9)' : type==='warn' ? 'rgba(255,180,100,0.9)' : 'rgba(255,255,255,0.5)';
}

function closeBarcodeScanner() {
  barcodeScanning = false;
  if(zxingReader) {
    try {
      // Stop all video tracks
      if(zxingReader._stream) {
        zxingReader._stream.getTracks().forEach(t => t.stop());
      }
      zxingReader.reset();
    } catch(e) { console.warn('Close error:', e); }
    zxingReader = null;
  }
  const video = document.getElementById('barcodeVideo');
  if(video) { video.srcObject = null; }
  closeOverlay('barcodeOverlay');
}

function toggleManualEntry() {
  manualVisible = !manualVisible;
  const wrap = document.getElementById('manualWrap');
  const btn = document.getElementById('manualToggleBtn');
  wrap.style.display = manualVisible ? 'flex' : 'none';
  btn.textContent = manualVisible ? 'Use camera instead' : 'Enter barcode manually';
  if(manualVisible) setTimeout(()=>document.getElementById('manualBarcodeInput')?.focus(), 100);
}

async function submitManualBarcode() {
  const val = document.getElementById('manualBarcodeInput')?.value.trim();
  if(!val) { showToast('Enter a barcode number'); return; }
  if(!/^[0-9]{6,14}$/.test(val)) { showToast('Barcodes are 6-14 digits'); return; }
  closeBarcodeScanner();
  await lookupBarcode(val, _scanFromForm);
}

let _scanFromForm = false;

async function lookupBarcode(barcode, fromForm = false) {
  _scanFromForm = fromForm;
  showToast('🔍 Searching...');

  // Check local Supabase database first
  try {
    const local = await api('products', `?barcode=eq.${barcode}&limit=1`);
    if(local && local.length) {
      const p = local[0];
      showBarcodeSuccess('Your Library', p.name);
      if(fromForm) {
        // Product exists — ask if they want to open it or create new
        setTimeout(async () => {
          if(confirm(`"${p.name}" already exists in your library.\n\nOpen existing entry?`)) {
            await initLibrary();
            openDetail(p.id);
          } else {
            formData._barcode = barcode;
            openProductForm();
          }
        }, 400);
      } else {
        await initLibrary();
        setTimeout(() => openDetail(p.id), 300);
      }
      return;
    }
  } catch(e) { console.warn('Local lookup failed:', e); }

  const sources = [
    {
      name: 'Open Beauty Facts',
      url: `https://world.openbeautyfacts.org/api/v2/product/${barcode}?fields=product_name,brands,ingredients_text,categories_tags,image_url`,
      type: 'beauty'
    },
    {
      name: 'Open Food Facts',
      url: `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,ingredients_text,categories_tags,image_url`,
      type: 'food'
    },
    {
      name: 'Open Product Data',
      url: `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      type: 'upc'
    }
  ];

  for(const source of sources) {
    try {
      showToast(`🔍 Checking ${source.name}...`);
      const r = await fetch(source.url, {
        headers: {'User-Agent': 'LeoOS/1.0'},
        signal: AbortSignal.timeout(5000)
      });
      const d = await r.json();

      // Open Beauty/Food Facts format
      if(source.type !== 'upc' && d.status === 1 && d.product?.product_name) {
        prefillFormFromBarcode(d.product, source.type, barcode);
        showBarcodeSuccess(source.name, formData.name);
        openProductForm();
        return;
      }

      // UPC Item DB format
      if(source.type === 'upc' && d.code === 'OK' && d.items?.length) {
        const item = d.items[0];
        formData = {
          name: item.title || '',
          brand: item.brand || '',
          description: item.description || '',
          _imageUrl: item.images?.[0] || null,
          _prefilled: true,
          _barcode: barcode
        };
        showBarcodeSuccess('UPC Database', formData.name);
        openProductForm();
        return;
      }
    } catch(e) {
      console.warn(`${source.name} failed:`, e.message);
    }
  }

  // Nothing found anywhere
  showToast(`⚠️ Not found in any database`);
  setTimeout(() => {
    const msg = fromForm
      ? `Barcode ${barcode} not found in databases.\n\nFill in manually? It'll be saved for next time.`
      : `Barcode ${barcode} not found.\n\nOpen blank form? The barcode will be saved so next time you scan this product it's recognized instantly.`;
    if(confirm(msg)) {
      if(!formData._prefilled) formData = {};
      formData._barcode = barcode;
      openProductForm();
    }
  }, 400);
}

function prefillFormFromBarcode(p, source, barcode) {
  // Clean brand — sometimes comes as "Brand1, Brand2" take first
  const brand = (p.brands || p.brand || '').split(/,|;/)[0].trim();
  // Clean name — sometimes has brand prepended, strip it
  let name = (p.product_name || p.title || '').trim();
  if(brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    name = name.slice(brand.length).trim().replace(/^[-–—·\s]+/, '');
  }

  // Guess category from tags
  const cats = (p.categories_tags || p.categories || []);
  const catsStr = (Array.isArray(cats) ? cats.join(' ') : cats).toLowerCase();
  let category = '🪥 Self Care'; // default
  if(/supplement|vitamin|mineral|protein|zinc|biotin|capsule/.test(catsStr)) category = '💊 Supplement';
  else if(/fragrance|perfume|cologne|parfum/.test(catsStr)) category = '🌸 Fragrance';
  else if(source === 'food') category = '💊 Supplement';

  formData = {
    name,
    brand,
    category,
    ingredients: p.ingredients_text || p.ingredients || '',
    description: p.description || '',
    _imageUrl: p.image_url || p.images_url_front || (p.images && p.images[0]) || null,
    _prefilled: true,
    _barcode: barcode || null
  };

  console.log('Prefilled formData:', JSON.stringify(formData));
}

// ============================================================
// COMPARE PRODUCTS
// ============================================================
let compareMode = false;
let compareSelected = [];

function toggleCompareMode() {
  compareMode = !compareMode;
  compareSelected = [];
  const btn = document.getElementById('compareToggle');
  btn.style.background = compareMode ? 'var(--accent)' : 'var(--bg2)';
  btn.style.color = compareMode ? 'var(--bg)' : 'var(--text3)';
  btn.style.borderColor = compareMode ? 'var(--accent)' : 'var(--border2)';

  // Show hint
  const existing = document.getElementById('compareHint');
  if(compareMode) {
    if(!existing) {
      const hint = document.createElement('div');
      hint.id = 'compareHint';
      hint.className = 'compare-select-hint';
      hint.textContent = 'Select 2 products to compare';
      document.getElementById('libGrid').before(hint);
    }
  } else {
    existing?.remove();
    // Remove selection styles
    document.querySelectorAll('.lib-card').forEach(c=>c.classList.remove('compare-selected'));
  }
}

function handleCardClick(productId) {
  if(!compareMode) { openDetail(productId); return; }

  const idx = compareSelected.indexOf(productId);
  const card = document.querySelector(`[data-pid="${productId}"]`);
  if(idx > -1) {
    compareSelected.splice(idx,1);
    card?.classList.remove('compare-selected');
  } else {
    if(compareSelected.length >= 2) { showToast('Only 2 products at a time'); return; }
    compareSelected.push(productId);
    card?.classList.add('compare-selected');
  }
  if(compareSelected.length === 2) openCompare();
}

async function openCompare() {
  const [p1, p2] = compareSelected.map(id => allProducts.find(p=>p.id===id));
  if(!p1||!p2) return;

  const fields = [
    {label:'Category', key:'category'},
    {label:'Brand', key:'brand'},
    {label:'Status', key:'status'},
    {label:'Stock', key:'stock'},
    {label:'Rating', key:'rating', suffix:'/10'},
    {label:'Container', fn: p => p.container_size ? `${p.container_size}${p.container_unit||'ml'}` : '—'},
    {label:'Description', key:'description'},
  ];

  const fragFields = [
    {label:'Concentration', key:'concentration'},
    {label:'Scent Family', key:'scent_family'},
    {label:'Top Notes', key:'top_notes'},
    {label:'Heart Notes', key:'heart_notes'},
    {label:'Base Notes', key:'base_notes'},
    {label:'Longevity', key:'longevity', suffix:'/10'},
    {label:'Sillage', key:'sillage', suffix:'/10'},
  ];

  const isFragrance = p1.category?.includes('Fragrance') || p2.category?.includes('Fragrance');
  const allFields = isFragrance ? [...fields, ...fragFields] : fields;

  const cover = p => `<div class="compare-cover">${p.cover_image_url||p.image_url?`<img src="${p.cover_image_url||p.image_url}">`:'🧴'}</div>`;
  const val = (p, f) => {
    if(f.fn) return f.fn(p)||'—';
    const v = p[f.key];
    return v ? v+(f.suffix||'') : '—';
  };

  document.getElementById('compareBody').innerHTML = `
    <div class="compare-grid">
      <div>${cover(p1)}<div class="compare-product-name">${p1.name}<br><span style="font-size:11px;color:var(--text3)">${p1.brand||''}</span></div></div>
      <div>${cover(p2)}<div class="compare-product-name">${p2.name}<br><span style="font-size:11px;color:var(--text3)">${p2.brand||''}</span></div></div>
      ${allFields.map(f => `
        <div style="grid-column:span 2;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;padding-top:10px;border-top:0.5px solid var(--border)">${f.label}</div>
        <div class="compare-val">${val(p1,f)}</div>
        <div class="compare-val">${val(p2,f)}</div>
      `).join('')}
    </div>`;

  openOverlay('compareOverlay');
}

function closeCompare() {
  closeOverlay('compareOverlay');
  compareMode = false;
  compareSelected = [];
  const btn = document.getElementById('compareToggle');
  if(btn) { btn.style.background='var(--bg2)';btn.style.color='var(--text3)';btn.style.borderColor='var(--border2)'; }
  document.getElementById('compareHint')?.remove();
  document.querySelectorAll('.lib-card').forEach(c=>c.classList.remove('compare-selected'));
}

// ============================================================
// ADD TO KIT FLOW
// ============================================================
const BODY_AREAS_KIT = ['🦱 Hair','🫧 Face','🧔 Facial Hair','👄 Lips','🦷 Oral','🫁 Body','🪒 Body Hair','🤲 Hands','💅 Nails','🦶 Feet'];
const KIT_STATES = ['Active','Backup','Passive'];
let kitFlowProductId = null;
let kitFlowData = { state:'Active', container_size:null, container_unit:'ml', current_amount:null, body_areas:[], opened_date: new Date().toISOString().split('T')[0] };
let kitFlowSteps = [];
let kitFlowLinkedSteps = [];

async function openAddToKit(productId) {
  kitFlowProductId = productId;
  kitFlowData = { state:'Active', container_size:null, container_unit:'ml', current_amount:null, body_areas:[], opened_date: new Date().toISOString().split('T')[0], price_paid:null, purchased_from:null, piece_amount:null, piece_unit:'ml' };
  kitFlowLinkedSteps = [];

  // Load routine steps + prices for this product
  const [am, pm, prices] = await Promise.all([
    api('routine_tasks','?time_of_day=eq.Morning&order=order.asc'),
    api('routine_tasks','?time_of_day=eq.Evening&order=order.asc'),
    api('product_prices',`?product_id=eq.${productId}&order=price.asc`)
  ]);
  kitFlowSteps = [...(am||[]), ...(pm||[])];
  kitFlowPrices = prices||[];

  // If prices exist — show purchase question first
  if(kitFlowPrices.length) {
    renderKitPurchaseQuestion();
  } else {
    renderKitFlow();
  }
  openOverlay('kitFlowOverlay');
}

let kitFlowPrices = [];

function renderKitPurchaseQuestion() {
  // Open the kit flow overlay first (empty body), then slide up the purchase overlay on top
  renderKitFlow();
  document.getElementById('purchaseBody').innerHTML =
    kitFlowPrices.map((pr,i) => `
      <button onclick="selectPurchaseSource(${i})" style="background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:14px 16px;text-align:left;cursor:pointer;font-family:var(--sans);transition:background 0.2s;width:100%;margin-bottom:10px;display:block">
        <div style="font-size:13px;color:var(--text);font-weight:500">${pr.source_name||'Source'}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">€${Number(pr.price).toFixed(2)} · ${pr.size_amount||'?'}${pr.size_unit||'ml'}</div>
      </button>`).join('') +
    `<button onclick="skipPurchaseSource()" style="background:transparent;border:0.5px solid var(--border2);border-radius:12px;padding:12px 16px;text-align:center;cursor:pointer;font-family:var(--sans);color:var(--text3);font-size:13px;width:100%;margin-top:4px">
      Not from these sources / fill in manually
    </button>`;
  // Small delay so kitFlowOverlay opens first, then purchaseOverlay slides up over it
  setTimeout(() => openOverlay('purchaseOverlay'), 80);
}

function closePurchaseOverlay() {
  closeOverlay('purchaseOverlay');
}

function selectPurchaseSource(idx) {
  const pr = kitFlowPrices[idx];
  kitFlowData.container_size = pr.size_amount || null;
  kitFlowData.container_unit = pr.size_unit || 'ml';
  kitFlowData.current_amount = pr.size_amount || null;
  kitFlowData.price_paid = pr.price || null;
  kitFlowData.purchased_from = pr.source_name || null;
  closeOverlay('purchaseOverlay', renderKitFlow);
}

function skipPurchaseSource() {
  closeOverlay('purchaseOverlay', renderKitFlow);
}

function closeKitFlow() {
  closeOverlay('kitFlowOverlay');
}

function renderKitFlow() {
  const pct = kitFlowData.container_size > 0 ? Math.round((kitFlowData.current_amount/kitFlowData.container_size)*100) : 100;

  document.getElementById('kitFlowBody').innerHTML = `
    <div class="form-field">
      <div class="form-label">Status</div>
      <div class="form-chips-wrap">
        ${KIT_STATES.map(s => `<button class="form-chip${kitFlowData.state===s?' selected':''}" onclick="setKitState('${s}')">${s==='Active'?'🟢':s==='Backup'?'📦':'💤'} ${s}</button>`).join('')}
      </div>
    </div>

    <div class="form-field">
      <div class="form-label">Container Size</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-input" type="number" placeholder="e.g. 200" id="kitContainerSize" value="${kitFlowData.container_size||''}" oninput="kitFlowData.container_size=parseFloat(this.value)||0;updateSliderMax()" style="flex:1">
        <div class="form-chips-wrap">
          ${['ml','g','pcs'].map(u=>`<button class="form-chip${kitFlowData.container_unit===u?' selected':''}" onclick="setKitUnit('${u}')">${u}</button>`).join('')}
        </div>
      </div>
      ${kitFlowData.container_unit==='pcs' ? `<div style="margin-top:8px">
        <div class="form-label" style="font-size:10px;margin-bottom:6px">Amount per piece (optional)</div>
        <div style="display:flex;gap:8px;align-items:center">
          <input class="form-input" type="number" placeholder="e.g. 25" value="${kitFlowData.piece_amount||''}" oninput="kitFlowData.piece_amount=parseFloat(this.value)" style="flex:1;padding:9px 12px">
          <div class="form-chips-wrap">
            <button class="form-chip${(kitFlowData.piece_unit||'ml')==='ml'?' selected':''}" onclick="kitFlowData.piece_unit='ml';renderKitFlow()">ml</button>
            <button class="form-chip${(kitFlowData.piece_unit||'ml')==='g'?' selected':''}" onclick="kitFlowData.piece_unit='g';renderKitFlow()">g</button>
          </div>
        </div>
      </div>` : ''}
    </div>

    <div class="form-field">
      <div class="form-label">Price Paid (€) <span style="font-size:10px;color:var(--text3);text-transform:none;letter-spacing:0">optional</span></div>
      <div style="display:flex;gap:8px">
        <input class="form-input" type="number" placeholder="0.00" value="${kitFlowData.price_paid||''}" oninput="kitFlowData.price_paid=parseFloat(this.value)" style="flex:1">
        <input class="form-input" placeholder="Where" value="${kitFlowData.purchased_from||''}" oninput="kitFlowData.purchased_from=this.value" style="flex:1">
      </div>
    </div>

    <div class="form-field">
      <div class="form-label">How much is left?</div>
      <div class="amount-display">
        <span class="amount-big">${kitFlowData.container_size ? (kitFlowData.current_amount||kitFlowData.container_size) : '—'}</span>
        <span class="amount-total"> / ${kitFlowData.container_size||'?'} ${kitFlowData.container_unit}</span>
      </div>
      <div class="amount-visual" id="amountVisual" style="${!kitFlowData.container_size ? 'opacity:0.3' : ''}">
        <div class="amount-fill-vis" style="width:${kitFlowData.container_size ? pct : 50}%"></div>
        <div class="amount-label">${kitFlowData.container_size ? pct+'% remaining' : 'Enter size first'}</div>
      </div>
      <input type="range" class="form-slider" id="kitAmountSlider"
        min="0" max="${kitFlowData.container_size||100}"
        value="${kitFlowData.container_size ? (kitFlowData.current_amount!==null?kitFlowData.current_amount:kitFlowData.container_size) : 50}"
        ${!kitFlowData.container_size ? 'disabled' : ''}
        style="${!kitFlowData.container_size ? 'opacity:0.3' : ''}"
        oninput="kitFlowData.current_amount=parseFloat(this.value);document.querySelector('.amount-big').textContent=this.value;const p=Math.round(parseFloat(this.value)/parseFloat(this.max)*100);document.querySelector('.amount-fill-vis').style.width=p+'%';document.querySelector('.amount-label').textContent=p+'% remaining'">
    </div>

    <div class="form-field">
      <div class="form-label">Body Area <span style="font-size:10px;color:var(--text3);text-transform:none;letter-spacing:0">(optional)</span></div>
      <div class="form-chips-wrap">
        ${BODY_AREAS_KIT.map(a=>`<button class="form-chip${kitFlowData.body_areas.includes(a)?' selected':''}" onclick="toggleKitBodyArea('${a}',this)">${a}</button>`).join('')}
      </div>
    </div>

    <div class="form-field">
      <div class="form-label">Link to Routine Steps <span style="font-size:10px;color:var(--text3);text-transform:none;letter-spacing:0">(optional)</span></div>
      <div style="display:flex;gap:8px">
        <button class="kit-session-btn${kitFlowLinkedSteps.some(id=>kitFlowSteps.find(s=>s.id===id&&s.time_of_day==='Morning'))?' kit-session-active':''}" onclick="openStepPicker('Morning')">
          🌅 Morning ${kitFlowLinkedSteps.filter(id=>kitFlowSteps.find(s=>s.id===id&&s.time_of_day==='Morning')).length > 0 ? `<span class="kit-step-count">${kitFlowLinkedSteps.filter(id=>kitFlowSteps.find(s=>s.id===id&&s.time_of_day==='Morning')).length}</span>` : ''}
        </button>
        <button class="kit-session-btn${kitFlowLinkedSteps.some(id=>kitFlowSteps.find(s=>s.id===id&&s.time_of_day==='Evening'))?' kit-session-active':''}" onclick="openStepPicker('Evening')">
          🌙 Evening ${kitFlowLinkedSteps.filter(id=>kitFlowSteps.find(s=>s.id===id&&s.time_of_day==='Evening')).length > 0 ? `<span class="kit-step-count">${kitFlowLinkedSteps.filter(id=>kitFlowSteps.find(s=>s.id===id&&s.time_of_day==='Evening')).length}</span>` : ''}
        </button>
      </div>
    </div>

    <div class="form-field">
      <div class="form-label">Opened Date</div>
      <input class="form-input" type="date" value="${kitFlowData.opened_date}" onchange="kitFlowData.opened_date=this.value" style="width:100%;box-sizing:border-box;-webkit-appearance:none;color:var(--text2)">
    </div>`;

  // Step picker popup lives outside the kit flow body so it doesn't break the template
  let popup = document.getElementById('stepPickerPopup');
  if(!popup) {
    popup = document.createElement('div');
    popup.id = 'stepPickerPopup';
    popup.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:999;align-items:flex-end;backdrop-filter:blur(4px)';
    popup.innerHTML = `<div style="background:var(--bg);border-radius:20px 20px 0 0;position:fixed;bottom:0;left:0;right:0;width:100%;height:70vh;display:flex;flex-direction:column;overflow:hidden;padding-bottom:env(safe-area-inset-bottom,16px)">
      
    </div>`;
    document.body.appendChild(popup);
  }
}

function setKitState(state) {
  kitFlowData.state = state;
  renderKitFlow();
}

function toggleKitBodyArea(area, btn) {
  const idx = kitFlowData.body_areas.indexOf(area);
  if(idx>-1) { kitFlowData.body_areas.splice(idx,1); btn.classList.remove('selected'); }
  else { kitFlowData.body_areas.push(area); btn.classList.add('selected'); }
}

function toggleKitStep(stepId, btn) {
  const idx = kitFlowLinkedSteps.indexOf(stepId);
  if(idx>-1) { kitFlowLinkedSteps.splice(idx,1); btn.classList.remove('selected'); }
  else { kitFlowLinkedSteps.push(stepId); btn.classList.add('selected'); }
}

async function saveKitItem() {
  const btn = document.querySelector('.kit-save-btn');
  btn.disabled=true; btn.textContent='Saving...';

  // Create kit item
  const res = await fetch(`${SUPABASE_URL}/rest/v1/kit_items`, {
    method:'POST',
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=representation'},
    body: JSON.stringify({
      product_id: kitFlowProductId,
      state: kitFlowData.state,
      container_size: kitFlowData.container_size||null,
      container_unit: kitFlowData.container_unit,
      current_amount: kitFlowData.current_amount||null,
      body_areas: kitFlowData.body_areas.length ? kitFlowData.body_areas : null,
      opened_date: kitFlowData.opened_date,
      added_date: new Date().toISOString().split('T')[0],
      price_paid: kitFlowData.price_paid||null,
      purchased_from: kitFlowData.purchased_from||null,
      ml_per_piece: kitFlowData.piece_unit==='ml' ? kitFlowData.piece_amount||null : null,
      g_per_piece: kitFlowData.piece_unit==='g' ? kitFlowData.piece_amount||null : null
    })
  });

  if(!res.ok) { showToast('Error saving'); btn.disabled=false; btn.textContent='Add to Kit'; return; }
  const [kitItem] = await res.json();

  // Link routine steps
  if(kitFlowLinkedSteps.length && kitItem) {
    await apiPost('kit_item_steps', kitFlowLinkedSteps.map(sid=>({
      kit_item_id: kitItem.id,
      routine_task_id: sid
    })));
  }

  showToast('✓ Added to My Kit');
  closeKitFlow();
  btn.disabled=false; btn.textContent='Add to Kit';

  // Refresh kit instances shown in detail
  loadKitInstances(kitFlowProductId);
}

async function loadKitInstances(productId) {
  const items = await api('kit_items', `?product_id=eq.${productId}&order=created_at.desc`);
  const container = document.getElementById(`kitInstancesFor-${productId}`);
  if(!container || !items?.length) return;

  container.innerHTML = items.map(item => {
    const pct = item.container_size > 0 ? Math.round((item.current_amount/item.container_size)*100) : 100;
    const stateClass = item.state==='Active'?'state-active':item.state==='Backup'?'state-backup':'state-passive';
    const stateIcon = item.state==='Active'?'🟢':item.state==='Backup'?'📦':'💤';
    return `<div class="kit-instance-card">
      <div class="kit-instance-state ${stateClass}">${stateIcon} ${item.state}</div>
      ${item.container_size ? `
        <div class="kit-instance-amount">${item.current_amount||0} <span style="font-size:13px;color:var(--text3)">/ ${item.container_size} ${item.container_unit||'ml'}</span></div>
        <div class="kit-amount-bar"><div class="kit-amount-fill" style="width:${pct}%"></div></div>
      ` : ''}
      <div class="kit-instance-info">
        ${item.opened_date ? `Opened ${item.opened_date}` : ''}
        ${item.body_areas?.length ? ` · ${item.body_areas.join(', ')}` : ''}
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// INLINE RATING + NOTES SAVE
// ============================================================
window._rate = function(productId, rating) { rateProduct(productId, rating); };

async function rateProduct(productId, rating) {
  // Update stars visually — use all visible hero stars since there's only one detail open at a time
  document.querySelectorAll('.detail-hero-star').forEach((s,i) => {
    s.classList.toggle('filled', i < rating);
  });

  // Save to DB
  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
    method:'PATCH',
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'},
    body: JSON.stringify({rating})
  });

  const p = allProducts.find(x=>x.id===productId);
  if(p) p.rating = rating;
  showToast(`★ ${rating}/10 saved`);
}

async function saveNotes(productId) {
  const notes = document.getElementById(`detailNotes-${productId}`)?.value;
  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
    method:'PATCH',
    headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'},
    body: JSON.stringify({personal_notes: notes})
  });
  const p = allProducts.find(x=>x.id===productId);
  if(p) p.personal_notes = notes;
  showToast('Notes saved');
}

// ============================================================
// CUSTOM PRODUCT TYPES & SUBCATEGORIES
// ============================================================
let customTypes = JSON.parse(localStorage.getItem('customTypes')||'{}');
let customSubcats = JSON.parse(localStorage.getItem('customSubcats')||'{}');

function getAllTypes(category) {
  const defaults = PRODUCT_TYPES[category] || [];
  const custom = customTypes[category] || [];
  return [...new Set([...defaults, ...custom])];
}

function getAllSubcats(productType) {
  if(!productType) return [];
  const defaults = SUBCATEGORIES_BY_TYPE[productType] || [];
  const custom = customSubcats[productType] || [];
  return [...new Set([...defaults, ...custom])];
}

function selectType(t) {
  formData.product_type = t;
  formData.subcategory = null; // reset finer level when type changes
  document.querySelectorAll('#typeChips .form-chip').forEach(b => {
    b.classList.toggle('selected', b.textContent === t);
  });
  const field = document.getElementById('subcatField');
  const wrap = document.getElementById('subcatChips');
  if(field && wrap) {
    field.style.display = '';
    wrap.innerHTML = getAllSubcats(t).map(s =>
      `<button class="form-chip" onclick="selectSubcat('${s}')">${s}</button>`
    ).join('') + `<button class="form-chip" onclick="addCustomSubcat()" style="border-style:dashed">+ Custom</button>`;
  }
}

function addCustomType() {
  const val = prompt('Enter custom product type:');
  if(!val || !val.trim()) return;
  const cat = formData.category;
  if(!customTypes[cat]) customTypes[cat] = [];
  if(!customTypes[cat].includes(val.trim())) {
    customTypes[cat].push(val.trim());
    localStorage.setItem('customTypes', JSON.stringify(customTypes));
  }
  selectType(val.trim());
  const wrap = document.getElementById('typeChips');
  if(wrap) {
    wrap.innerHTML = getAllTypes(cat).map(t =>
      `<button class="form-chip${formData.product_type===t?' selected':''}" onclick="selectType('${t}')">${t}</button>`
    ).join('') + `<button class="form-chip" onclick="addCustomType()" style="border-style:dashed">+ Custom</button>`;
  }
}

function selectSubcat(s) {
  formData.subcategory = s;
  document.querySelectorAll('#subcatChips .form-chip').forEach(b => {
    b.classList.toggle('selected', b.textContent === s);
  });
}

function addCustomSubcat() {
  const val = prompt('Enter custom subcategory name:');
  if(!val || !val.trim()) return;
  const type = formData.product_type;
  if(!type) { showToast('Pick a product type first'); return; }
  if(!customSubcats[type]) customSubcats[type] = [];
  if(!customSubcats[type].includes(val.trim())) {
    customSubcats[type].push(val.trim());
    localStorage.setItem('customSubcats', JSON.stringify(customSubcats));
  }
  formData.subcategory = val.trim();
  const wrap = document.getElementById('subcatChips');
  if(wrap) {
    wrap.innerHTML = getAllSubcats(type).map(s =>
      `<button class="form-chip${formData.subcategory===s?' selected':''}" onclick="selectSubcat('${s}')">${s}</button>`
    ).join('') + `<button class="form-chip" onclick="addCustomSubcat()" style="border-style:dashed">+ Custom</button>`;
  }
}

// ============================================================
// KIT FLOW HELPERS — fix keyboard + slider
// ============================================================
function setKitUnit(unit) {
  kitFlowData.container_unit = unit;
  // Preserve typed value before re-render
  const val = document.getElementById('kitContainerSize')?.value;
  if(val) kitFlowData.container_size = parseFloat(val)||0;
  renderKitFlow();
}

function updateSliderMax() {
  // Read current typed value directly from input
  const input = document.getElementById('kitContainerSize');
  const size = parseFloat(input?.value) || 0;
  kitFlowData.container_size = size;

  const slider = document.getElementById('kitAmountSlider');
  const big = document.querySelector('.amount-big');
  const fill = document.querySelector('.amount-fill-vis');
  const label = document.querySelector('.amount-label');
  const total = document.querySelector('.amount-total');

  if(slider) {
    if(size > 0) {
      slider.disabled = false;
      slider.style.opacity = '1';
      slider.max = size;
      slider.value = size;
      kitFlowData.current_amount = size;
      const pct = 100;
      if(big) big.textContent = size;
      if(fill) fill.style.width = '100%';
      if(label) label.textContent = '100% remaining';
      if(total) total.textContent = ' / ' + size + ' ' + kitFlowData.container_unit;
      const visual = document.getElementById('amountVisual');
      if(visual) visual.style.opacity = '1';
    } else {
      slider.disabled = true;
      slider.style.opacity = '0.3';
      slider.max = 100;
      slider.value = 50;
      if(big) big.textContent = '—';
      if(total) total.textContent = ' / ? ' + kitFlowData.container_unit;
      if(fill) fill.style.width = '50%';
      if(label) label.textContent = 'Enter size first';
      const visual = document.getElementById('amountVisual');
      if(visual) visual.style.opacity = '0.3';
    }
  }
}

// ============================================================
// STEP PICKER
// ============================================================
let stepPickerSession = 'Morning';

function openStepPicker(session) {
  stepPickerSession = session;
  const overlay = document.getElementById('stepPickerOverlay');
  const title = document.getElementById('stepPickerTitle');
  const list = document.getElementById('stepPickerList');
  if(!overlay || !title || !list) return;

  title.textContent = session === 'Morning' ? '🌅 Morning Steps' : '🌙 Evening Steps';
  // Deduplicate by name
  const seen = new Set();
  const steps = kitFlowSteps.filter(s => {
    if(s.time_of_day !== session) return false;
    if(seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  list.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start">` +
    steps.map(s => `
    <button class="form-chip${kitFlowLinkedSteps.includes(s.id)?' selected':''}"
      onclick="toggleKitStep('${s.id}', this)" style="padding:8px 14px;font-size:12px">
      ${s.name}
    </button>`).join('') + `</div>`;

  openOverlay('stepPickerOverlay');
}

function closeStepPicker() {
  closeOverlay('stepPickerOverlay');
  // Clean up orphan popup div if it exists (legacy)
  const orphan = document.getElementById('stepPickerPopup');
  if(orphan) orphan.remove();
  // Re-render kit flow to update button counts
  const size = document.getElementById('kitContainerSize')?.value;
  if(size) kitFlowData.container_size = parseFloat(size)||0;
  renderKitFlow();
}


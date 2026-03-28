/* ═══════════════════════════════════════════════════════════════════════════
   Flavourly — app.js
   SPA router, API client, state management, and all UI renderers
═══════════════════════════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────────────────────────
const API = '';   // same origin; Flask serves frontend

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
  user: null,
  cart: [],          // [{id, recipe_id, quantity, recipe}]
  favouriteIds: [],  // [recipe_id, …]
  categories: [],
  recipesFilter: { q: '', category_id: '', is_veg: '', cuisine: '', sort: 'newest' },
  orderCategoryFilter: null,
  currentPage: 'home',
  adminTab: 'dashboard',
};

// ── UTILS ────────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function fmt(price) { return `₹${Number(price).toFixed(0)}`; }

function renderStars(rating, max = 5) {
  let html = '<span class="stars">';
  for (let i = 1; i <= max; i++)
    html += `<span class="star${i <= Math.round(rating) ? ' filled' : ''}">★</span>`;
  return html + '</span>';
}

function timeAgo(iso) {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getBadgeClass(status) {
  return `badge badge-status-${status}`;
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success', duration = 3200) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => { el.style.animation = 'none'; el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 350); }, duration);
}

// ── API CLIENT ────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'include',
    ...opts,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── ROUTER / PAGE NAV ─────────────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  const navEl = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  state.currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // close mobile menu
  document.getElementById('nav-links').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');

  if (page === 'recipes') loadRecipes();
  if (page === 'order') loadOrderMenu();
  if (page === 'favourites') loadFavourites();
  if (page === 'orders-history') loadOrderHistory();
  if (page === 'admin') { if (state.user?.role === 'admin') loadAdminDashboard(); else { toast('Admin access required','error'); navigateTo('home'); } }
}

// ── MOBILE MENU ───────────────────────────────────────────────────────────────
function toggleMobileMenu() {
  document.getElementById('nav-links').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open');
}

// ── NAVBAR SCROLL ─────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
});

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.body.style.overflow = ''; }
function handleOverlayClick(evt, id) { if (evt.target.classList.contains('modal-overlay')) closeModal(id); }

// ── AUTH ──────────────────────────────────────────────────────────────────────
function openAuthModal() { openModal('auth-modal'); switchAuthTab('login'); }

function switchAuthTab(tab) {
  ['login','register'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t===tab);
    document.getElementById(`auth-${t}-form`).classList.toggle('hidden', t!==tab);
  });
}

async function doLogin(evt) {
  evt.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-password').value }) });
    setUser(data.user);
    closeModal('auth-modal');
    toast(`Welcome back, ${data.user.username}! 👋`);
    await refreshCartFromServer();
    await refreshFavourites();
  } catch(e) { toast(e.message,'error'); }
  finally { btn.disabled = false; btn.textContent = 'Sign In'; }
}

async function doRegister(evt) {
  evt.preventDefault();
  const btn = document.getElementById('register-btn');
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: document.getElementById('reg-username').value, email: document.getElementById('reg-email').value, password: document.getElementById('reg-password').value }) });
    setUser(data.user);
    closeModal('auth-modal');
    toast(`Welcome to Flavourly, ${data.user.username}! 🎉`);
  } catch(e) { toast(e.message,'error'); }
  finally { btn.disabled = false; btn.textContent = 'Create Account'; }
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  setUser(null);
  state.cart = [];
  state.favouriteIds = [];
  updateCartUI();
  closeUserMenu();
  navigateTo('home');
  toast('Logged out successfully','info');
}

function setUser(user) {
  state.user = user;
  const authBtn = document.getElementById('auth-btn');
  const avatarWrapper = document.getElementById('user-avatar-btn');
  const adminNav = document.getElementById('admin-nav-link');
  if (user) {
    authBtn.classList.add('hidden');
    avatarWrapper.classList.remove('hidden');
    document.getElementById('user-avatar').textContent = user.username[0].toUpperCase();
    document.getElementById('user-menu-name').textContent = user.username;
    document.getElementById('user-menu-email').textContent = user.email;
    if (user.role === 'admin') adminNav.classList.remove('hidden');
    else adminNav.classList.add('hidden');
  } else {
    authBtn.classList.remove('hidden');
    avatarWrapper.classList.add('hidden');
    adminNav.classList.add('hidden');
  }
}

function toggleUserMenu() {
  document.getElementById('user-menu').classList.toggle('hidden');
}
function closeUserMenu() { document.getElementById('user-menu').classList.add('hidden'); }
document.addEventListener('click', e => {
  if (!e.target.closest('#user-avatar-btn')) closeUserMenu();
});

// ── CATEGORIES ─────────────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    state.categories = await api('/api/categories');
    populateCategoryFilters();
  } catch {}
}

function populateCategoryFilters() {
  const pills = [
    { id: 'home-categories', fn: 'filterHomeCategory' },
    { id: 'order-categories', fn: 'filterOrderCategory' },
  ];
  pills.forEach(({ id, fn }) => {
    const container = document.getElementById(id);
    if (!container) return;
    // keep "All" pill
    container.innerHTML = `<button class="category-pill active" onclick="${fn}(null,this)">🍽️ All</button>`;
    state.categories.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'category-pill';
      btn.textContent = `${c.icon} ${c.name}`;
      btn.onclick = function() { window[fn](c.id, this); };
      container.appendChild(btn);
    });
  });

  // Populate recipe filter select
  const sel = document.getElementById('recipe-category');
  if (sel) {
    sel.innerHTML = '<option value="">All Categories</option>';
    state.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = `${c.icon} ${c.name}`;
      sel.appendChild(opt);
    });
  }
  // Admin recipe form category select
  const rSel = document.getElementById('r-category');
  if (rSel) {
    rSel.innerHTML = '';
    state.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = `${c.icon} ${c.name}`;
      rSel.appendChild(opt);
    });
  }
}

// ── HOME PAGE ──────────────────────────────────────────────────────────────────
let _homeCategory = null;

function filterHomeCategory(catId, btn) {
  _homeCategory = catId;
  document.querySelectorAll('#home-categories .category-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadHomeRecipes();
}

async function loadHomeRecipes() {
  const grid = document.getElementById('home-recipes-grid');
  grid.innerHTML = renderSkeletonCards(8);
  try {
    let url = '/api/recipes?sort=newest';
    if (_homeCategory) url += `&category_id=${_homeCategory}`;
    const recipes = await api(url);
    document.getElementById('hero-recipe-count').textContent = `${recipes.length}+`;
    grid.innerHTML = recipes.slice(0,8).map(r => renderRecipeCard(r)).join('');
  } catch { grid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1">Failed to load recipes.</p>'; }
}

// ── RECIPES PAGE ───────────────────────────────────────────────────────────────
let _dietFilter = '';

function setDietFilter(val, btn) {
  _dietFilter = val || '';
  document.querySelectorAll('.filter-toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadRecipes();
}

async function loadRecipes() {
  const grid = document.getElementById('recipes-grid');
  const empty = document.getElementById('recipes-empty');
  grid.innerHTML = renderSkeletonCards(8);
  empty.classList.add('hidden');

  const q = document.getElementById('recipe-search')?.value || '';
  const catId = document.getElementById('recipe-category')?.value || '';
  const cuisine = document.getElementById('recipe-cuisine')?.value || '';
  const sort = document.getElementById('recipe-sort')?.value || 'newest';
  let url = `/api/recipes?q=${encodeURIComponent(q)}&sort=${sort}`;
  if (catId) url += `&category_id=${catId}`;
  if (cuisine) url += `&cuisine=${encodeURIComponent(cuisine)}`;
  if (_dietFilter !== '') url += `&is_veg=${_dietFilter}`;

  try {
    const recipes = await api(url);
    if (!recipes.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
    grid.innerHTML = recipes.map(r => renderRecipeCard(r)).join('');
  } catch { grid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1">Failed to load recipes.</p>'; }
}

function handleNavSearch(val) {
  if (state.currentPage !== 'recipes') navigateTo('recipes');
  const inp = document.getElementById('recipe-search');
  if (inp) { inp.value = val; loadRecipes(); }
}

// ── RECIPE CARD RENDERER ───────────────────────────────────────────────────────
function renderRecipeCard(r) {
  const isFav = state.favouriteIds.includes(r.id);
  return `
  <div class="recipe-card card">
    <div class="recipe-img">
      <img src="${r.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}" alt="${r.title}" loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'" />
      <div class="recipe-badge">
        <span class="badge ${r.is_veg ? 'badge-veg' : 'badge-nonveg'}">${r.is_veg ? '🌿 Veg' : '🍗 Non-Veg'}</span>
      </div>
      <button class="recipe-fav-btn ${isFav?'active':''}" onclick="toggleFavourite(${r.id},this)" title="Favourite">
        ${isFav ? '❤️' : '🤍'}
      </button>
    </div>
    <div class="recipe-body">
      <div class="recipe-meta">
        ${renderStars(r.avg_rating)}
        <span class="text-xs text-muted">(${r.review_count})</span>
        <span class="recipe-cuisine">${r.cuisine}</span>
      </div>
      <div class="recipe-title">${r.title}</div>
      <div class="recipe-desc">${r.description}</div>
      <div class="recipe-footer">
        <div class="recipe-price">${fmt(r.price)}</div>
        <div class="recipe-time">⏱ ${r.cook_time}min</div>
      </div>
      <div class="recipe-actions" style="margin-top:.75rem;">
        <button class="btn btn-secondary btn-sm" onclick="openRecipeDetail(${r.id})">View Recipe</button>
        <button class="btn btn-primary btn-sm" onclick="addToCart(${r.id})">+ Cart</button>
      </div>
    </div>
  </div>`;
}

function renderSkeletonCards(n = 6) {
  return Array(n).fill(0).map(() => `
    <div class="card" style="overflow:hidden;">
      <div class="skeleton" style="height:200px;border-radius:0;"></div>
      <div style="padding:1rem;">
        <div class="skeleton" style="height:12px;width:40%;margin-bottom:.6rem;"></div>
        <div class="skeleton" style="height:16px;width:80%;margin-bottom:.5rem;"></div>
        <div class="skeleton" style="height:12px;width:100%;margin-bottom:.3rem;"></div>
        <div class="skeleton" style="height:12px;width:65%;"></div>
      </div>
    </div>`).join('');
}

// ── RECIPE DETAIL ──────────────────────────────────────────────────────────────
async function openRecipeDetail(id) {
  openModal('recipe-modal');
  document.getElementById('recipe-modal-body').innerHTML = '<div class="flex-center" style="padding:3rem;"><div class="spinner"></div></div>';
  try {
    const r = await api(`/api/recipes/${id}`);
    document.getElementById('recipe-modal-title').textContent = r.title;
    const ingredients = r.ingredients.split(',').map(i => `<span class="ingredient-chip">${i.trim()}</span>`).join('');
    const steps = r.steps.split(';').filter(Boolean).map((s,i) =>
      `<div class="step-item"><div class="step-num">${i+1}</div><div>${s.trim()}</div></div>`
    ).join('');
    const reviews = r.reviews?.length
      ? r.reviews.map(rv => `
          <div class="review-card">
            <div class="flex-between"><span class="user font-600">${rv.username}</span><span class="text-xs text-muted">${timeAgo(rv.created_at)}</span></div>
            ${renderStars(rv.rating)}
            <p style="font-size:.85rem;color:var(--text-secondary);margin-top:.35rem;">${rv.comment}</p>
          </div>`).join('')
      : '<p class="text-muted">No reviews yet. Be the first!</p>';

    document.getElementById('recipe-modal-body').innerHTML = `
      <img src="${r.image_url}" class="recipe-detail-img" alt="${r.title}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'" />
      <div class="flex-between" style="flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;">
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <span class="badge ${r.is_veg?'badge-veg':'badge-nonveg'}">${r.is_veg?'🌿 Veg':'🍗 Non-Veg'}</span>
          <span class="badge badge-orange">🍽️ ${r.category_name}</span>
          <span class="badge badge-orange">🌍 ${r.cuisine}</span>
        </div>
        <div style="display:flex;gap:1rem;align-items:center;">
          <span class="text-sm text-muted">⏱ ${r.cook_time} min</span>
          <span class="text-sm text-muted">👥 ${r.servings} servings</span>
          <span class="font-700 text-orange">${fmt(r.price)}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;">
        ${renderStars(r.avg_rating)} <span class="text-sm font-600">${r.avg_rating}</span> <span class="text-xs text-muted">(${r.review_count} reviews)</span>
      </div>
      <p style="color:var(--text-secondary);margin-bottom:1.5rem;">${r.description}</p>
      <h4 style="margin-bottom:.6rem;">🧂 Ingredients</h4>
      <div class="ingredient-list">${ingredients}</div>
      <h4 style="margin:.1rem 0 .6rem;">📋 Steps</h4>
      <div class="steps-list">${steps}</div>
      <h4 style="margin:1.5rem 0 .75rem;">💬 Reviews</h4>
      <div>${reviews}</div>
      ${state.user ? `<button class="btn btn-secondary btn-sm mt-2" onclick="openReviewModal(${r.id});closeModal('recipe-modal')">Write a Review</button>` : ''}
      <div class="flex-between mt-4" style="flex-wrap:wrap;gap:.75rem;">
        <button class="btn btn-secondary" onclick="toggleFavourite(${r.id},null)">❤️ Favourite</button>
        <button class="btn btn-primary btn-lg" onclick="addToCart(${r.id});closeModal('recipe-modal')">🛒 Add to Cart — ${fmt(r.price)}</button>
      </div>`;
  } catch { document.getElementById('recipe-modal-body').innerHTML = '<p class="text-center text-muted">Failed to load recipe.</p>'; }
}

// ── ORDER MENU ─────────────────────────────────────────────────────────────────
async function loadOrderMenu() {
  const grid = document.getElementById('order-menu-grid');
  grid.innerHTML = renderSkeletonCards(8);
  try {
    let url = '/api/recipes?sort=newest';
    if (state.orderCategoryFilter) url += `&category_id=${state.orderCategoryFilter}`;
    const recipes = await api(url);
    grid.innerHTML = recipes.map(r => `
      <div class="menu-card">
        <img src="${r.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}" class="menu-card-img" alt="${r.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'" />
        <div class="menu-card-body">
          <div class="menu-card-title">${r.title}</div>
          <div class="menu-card-desc">${r.description}</div>
          <div style="display:flex;gap:.4rem;align-items:center;margin-bottom:.75rem;">
            ${renderStars(r.avg_rating)} <span class="text-xs text-muted">${r.avg_rating} (${r.review_count})</span>
          </div>
          <div class="menu-card-footer">
            <div class="menu-card-price">${fmt(r.price)}</div>
            <button class="add-to-cart-btn" onclick="addToCart(${r.id})">+ Add</button>
          </div>
        </div>
      </div>`).join('');
  } catch { grid.innerHTML = '<p class="text-center text-muted">Failed to load menu.</p>'; }
}

function filterOrderCategory(catId, btn) {
  state.orderCategoryFilter = catId;
  document.querySelectorAll('#order-categories .category-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadOrderMenu();
}

// ── CART ──────────────────────────────────────────────────────────────────────
function toggleCart() {
  document.getElementById('cart-sidebar').classList.toggle('open');
  document.getElementById('cart-overlay').classList.toggle('show');
}
function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('show');
}

async function addToCart(recipeId) {
  if (!state.user) { toast('Please sign in to add items to cart','info'); openAuthModal(); return; }
  try {
    const item = await api('/api/cart', { method: 'POST', body: JSON.stringify({ recipe_id: recipeId, quantity: 1 }) });
    const existing = state.cart.find(i => i.recipe_id === recipeId);
    if (existing) existing.quantity++;
    else state.cart.push(item);
    updateCartUI();
    toast(`Added to cart! 🛒`);
  } catch(e) { toast(e.message,'error'); }
}

async function refreshCartFromServer() {
  if (!state.user) return;
  try { state.cart = await api('/api/cart'); updateCartUI(); } catch {}
}

function updateCartUI() {
  const count = state.cart.reduce((s, i) => s + i.quantity, 0);
  const countEl = document.getElementById('cart-count');
  countEl.textContent = count;
  countEl.classList.toggle('hidden', count === 0);

  const body = document.getElementById('cart-body');
  const footer = document.getElementById('cart-footer');

  if (!state.cart.length) {
    body.innerHTML = '<div class="cart-empty"><div class="icon">🛒</div><p>Your cart is empty</p></div>';
    footer.style.display = 'none'; return;
  }

  const subtotal = state.cart.reduce((s,i) => s + (i.recipe?.price || 0) * i.quantity, 0);
  body.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.recipe?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}" alt="${item.recipe?.title}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'" />
      <div class="cart-item-info">
        <h4>${item.recipe?.title || 'Item'}</h4>
        <div class="cart-item-price">${fmt((item.recipe?.price||0) * item.quantity)}</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity - 1})">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity + 1})">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeCartItem(${item.id})" title="Remove">✕</button>
    </div>`).join('');

  document.getElementById('cart-subtotal').textContent = fmt(subtotal);
  document.getElementById('cart-total-val').textContent = fmt(subtotal + 49);
  footer.style.display = 'block';
}

async function changeQty(itemId, newQty) {
  try {
    if (newQty <= 0) { await removeCartItem(itemId); return; }
    const updated = await api(`/api/cart/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity: newQty }) });
    const idx = state.cart.findIndex(i => i.id === itemId);
    if (idx >= 0) state.cart[idx].quantity = newQty;
    updateCartUI();
  } catch(e) { toast(e.message,'error'); }
}

async function removeCartItem(itemId) {
  try {
    await api(`/api/cart/${itemId}`, { method: 'DELETE' });
    state.cart = state.cart.filter(i => i.id !== itemId);
    updateCartUI();
  } catch(e) { toast(e.message,'error'); }
}

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
function openCheckout() {
  if (!state.user) { toast('Please sign in first','info'); openAuthModal(); return; }
  if (!state.cart.length) { toast('Cart is empty','error'); return; }
  closeCart();
  const subtotal = state.cart.reduce((s,i) => s + (i.recipe?.price||0)*i.quantity, 0);
  const items = state.cart.map(i => `<div class="checkout-item"><span>${i.recipe?.title} × ${i.quantity}</span><span>${fmt((i.recipe?.price||0)*i.quantity)}</span></div>`).join('');
  document.getElementById('checkout-items-list').innerHTML = items;
  document.getElementById('checkout-total-display').innerHTML = `
    <div class="checkout-item"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="checkout-item"><span>Delivery</span><span>₹49</span></div>
    <div class="checkout-total"><span>Total</span><span>${fmt(subtotal+49)}</span></div>`;
  openModal('checkout-modal');
}

async function placeOrder() {
  const address = document.getElementById('checkout-address').value.trim();
  if (!address) { toast('Please enter delivery address','error'); return; }
  try {
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify({ address }) });
    state.cart = [];
    updateCartUI();
    closeModal('checkout-modal');
    toast(`Order #${order.id} placed successfully! 🎉`);
    navigateTo('orders-history');
  } catch(e) { toast(e.message,'error'); }
}

// ── FAVOURITES ────────────────────────────────────────────────────────────────
async function refreshFavourites() {
  if (!state.user) return;
  try { state.favouriteIds = await api('/api/favourites/ids'); } catch {}
}

async function loadFavourites() {
  if (!state.user) {
    document.getElementById('favourites-grid').innerHTML = '';
    document.getElementById('favourites-empty').classList.remove('hidden');
    document.getElementById('favourites-empty').innerHTML = `<div class="icon">🔒</div><h3>Sign in to see favourites</h3><button class="btn btn-primary mt-2" onclick="openAuthModal()">Sign In</button>`;
    return;
  }
  const grid = document.getElementById('favourites-grid');
  const empty = document.getElementById('favourites-empty');
  grid.innerHTML = renderSkeletonCards(4);
  try {
    const favs = await api('/api/favourites');
    state.favouriteIds = favs.map(f => f.recipe_id);
    if (!favs.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    grid.innerHTML = favs.map(f => renderRecipeCard(f.recipe)).join('');
  } catch { grid.innerHTML = ''; empty.classList.remove('hidden'); }
}

async function toggleFavourite(recipeId, btn) {
  if (!state.user) { toast('Sign in to save favourites','info'); openAuthModal(); return; }
  const isFav = state.favouriteIds.includes(recipeId);
  try {
    if (isFav) {
      await api(`/api/favourites/${recipeId}`, { method: 'DELETE' });
      state.favouriteIds = state.favouriteIds.filter(id => id !== recipeId);
      toast('Removed from favourites');
    } else {
      await api(`/api/favourites/${recipeId}`, { method: 'POST' });
      state.favouriteIds.push(recipeId);
      toast('Added to favourites ❤️');
    }
    // update all fav buttons
    document.querySelectorAll(`.recipe-fav-btn`).forEach(b => {});
    if (btn) { btn.classList.toggle('active', !isFav); btn.textContent = !isFav ? '❤️' : '🤍'; }
    // reload grid if on favourites page
    if (state.currentPage === 'favourites') loadFavourites();
    // reload home/recipe cards to update heart icons
    if (state.currentPage === 'home') loadHomeRecipes();
    if (state.currentPage === 'recipes') loadRecipes();
  } catch(e) { toast(e.message,'error'); }
}

// ── ORDER HISTORY ─────────────────────────────────────────────────────────────
async function loadOrderHistory() {
  if (!state.user) {
    document.getElementById('orders-list').innerHTML = '';
    document.getElementById('orders-empty').innerHTML = `<div class="icon">🔒</div><h3>Sign in to view orders</h3><button class="btn btn-primary mt-2" onclick="openAuthModal()">Sign In</button>`;
    document.getElementById('orders-empty').classList.remove('hidden');
    return;
  }
  const list = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');
  list.innerHTML = '<div class="flex-center" style="padding:3rem;"><div class="spinner"></div></div>';
  try {
    const orders = await api('/api/orders');
    if (!orders.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    list.innerHTML = orders.map(o => `
      <div class="order-card" style="margin-bottom:1rem;">
        <div style="flex:1;min-width:200px;">
          <div class="order-id">Order #${o.id}</div>
          <div class="order-items-preview">${o.items.map(i=>`${i.recipe_title} ×${i.quantity}`).join(', ')}</div>
          <div class="order-date mt-1">📅 ${new Date(o.created_at).toLocaleString('en-IN')}</div>
        </div>
        <div style="text-align:right;">
          <div class="order-total">${fmt(o.total + 49)}</div>
          <span class="${getBadgeClass(o.status)}" style="margin-top:.5rem;">${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span>
          <div class="text-xs text-muted mt-1">${o.address || 'No address'}</div>
        </div>
      </div>`).join('');
  } catch { list.innerHTML = '<p class="text-muted text-center">Failed to load orders.</p>'; }
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
function openReviewModal(recipeId) {
  if (!state.user) { toast('Sign in to write a review','info'); openAuthModal(); return; }
  document.getElementById('review-recipe-id').value = recipeId;
  document.getElementById('review-rating').value = 5;
  initStarPicker();
  openModal('review-modal');
}

function initStarPicker() {
  const picker = document.getElementById('star-picker');
  let selected = 5;
  picker.querySelectorAll('span').forEach(star => {
    star.style.filter = 'none';
    star.addEventListener('click', () => {
      selected = +star.dataset.val;
      document.getElementById('review-rating').value = selected;
      picker.querySelectorAll('span').forEach((s,i) => { s.style.filter = i < selected ? 'none' : 'grayscale(1)'; });
    });
    star.addEventListener('mouseover', () => { picker.querySelectorAll('span').forEach((s,i) => { s.style.filter = i < +star.dataset.val ? 'none' : 'grayscale(1)'; }); });
    star.addEventListener('mouseout', () => { picker.querySelectorAll('span').forEach((s,i) => { s.style.filter = i < selected ? 'none' : 'grayscale(1)'; }); });
  });
}

async function submitReview(evt) {
  evt.preventDefault();
  const recipeId = document.getElementById('review-recipe-id').value;
  const rating = +document.getElementById('review-rating').value;
  const comment = document.getElementById('review-comment').value;
  try {
    await api(`/api/reviews/${recipeId}`, { method: 'POST', body: JSON.stringify({ rating, comment }) });
    toast('Review submitted! ⭐');
    closeModal('review-modal');
  } catch(e) { toast(e.message,'error'); }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById(`admin-tab-${tab}`);
  if (panel) panel.classList.add('active');
  if (tab === 'dashboard') loadAdminDashboard();
  if (tab === 'recipes-admin') loadAdminRecipes();
  if (tab === 'orders-admin') loadAdminOrders();
  if (tab === 'users-admin') loadAdminUsers();
}

async function loadAdminDashboard() {
  const statsEl = document.getElementById('admin-stats');
  try {
    const d = await api('/api/admin/dashboard');
    statsEl.innerHTML = [
      { icon:'👥', val: d.total_users, label:'Total Users' },
      { icon:'🍳', val: d.total_recipes, label:'Total Recipes' },
      { icon:'📦', val: d.total_orders, label:'Total Orders' },
      { icon:'💰', val: fmt(d.total_revenue), label:'Revenue' },
      { icon:'⏳', val: d.pending_orders, label:'Pending Orders' },
      { icon:'✅', val: d.confirmed_orders, label:'Confirmed Orders' },
    ].map(s => `<div class="stat-card"><div class="icon">${s.icon}</div><div class="val">${s.val}</div><div class="label">${s.label}</div></div>`).join('');
  } catch { statsEl.innerHTML = '<p class="text-muted">Failed to load stats.</p>'; }
}

async function loadAdminRecipes() {
  populateCategoryFilters(); // ensure select is populated
  const tbody = document.getElementById('admin-recipes-body');
  try {
    const recipes = await api('/api/recipes');
    tbody.innerHTML = recipes.map(r => `
      <tr>
        <td><img src="${r.image_url}" style="width:48px;height:36px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'" /></td>
        <td>${r.title}</td>
        <td><span class="badge badge-orange">${r.category_name}</span></td>
        <td>${r.cuisine}</td>
        <td>${fmt(r.price)}</td>
        <td>${renderStars(r.avg_rating)} ${r.avg_rating}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="openEditRecipeModal(${r.id})">✏️</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteRecipe(${r.id})">🗑️</button>
        </td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Failed to load.</td></tr>'; }
}

async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-body');
  try {
    const orders = await api('/api/admin/orders');
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.username}</td>
        <td style="font-size:.8rem;max-width:200px;">${o.items.map(i=>`${i.recipe_title}×${i.quantity}`).join(', ')}</td>
        <td>${fmt(o.total)}</td>
        <td>
          <select class="${getBadgeClass(o.status)}" onchange="updateOrderStatus(${o.id},this.value)" style="border:none;background:transparent;cursor:pointer;font-size:.78rem;font-weight:600;">
            ${['pending','confirmed','preparing','delivered','cancelled'].map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>
        </td>
        <td style="font-size:.78rem;">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="updateOrderStatus(${o.id},document.querySelector('select[data-oid=\\'${o.id}\\']')?.value)">✓</button></td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Failed to load.</td></tr>'; }
}

async function updateOrderStatus(orderId, status) {
  if (!status) return;
  try {
    await api(`/api/admin/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status }) });
    toast(`Order #${orderId} updated to ${status}`);
  } catch(e) { toast(e.message,'error'); }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-body');
  try {
    const users = await api('/api/admin/users');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role==='admin'?'badge-orange':'badge-veg'}">${u.role}</span></td>
        <td>${new Date(u.created_at).toLocaleDateString('en-IN')}</td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Failed to load.</td></tr>'; }
}

function openAddRecipeModal() {
  document.getElementById('add-recipe-modal-title').textContent = 'Add New Recipe';
  document.getElementById('edit-recipe-id').value = '';
  document.getElementById('add-recipe-form').reset();
  populateCategoryFilters();
  openModal('add-recipe-modal');
}

async function openEditRecipeModal(id) {
  document.getElementById('add-recipe-modal-title').textContent = 'Edit Recipe';
  populateCategoryFilters();
  try {
    const r = await api(`/api/recipes/${id}`);
    document.getElementById('edit-recipe-id').value = id;
    document.getElementById('r-title').value = r.title;
    document.getElementById('r-desc').value = r.description;
    document.getElementById('r-image').value = r.image_url;
    document.getElementById('r-cuisine').value = r.cuisine;
    document.getElementById('r-price').value = r.price;
    document.getElementById('r-cook-time').value = r.cook_time;
    document.getElementById('r-servings').value = r.servings;
    document.getElementById('r-is-veg').value = r.is_veg.toString();
    document.getElementById('r-ingredients').value = r.ingredients;
    document.getElementById('r-steps').value = r.steps;
    document.getElementById('r-category').value = r.category_id;
    openModal('add-recipe-modal');
  } catch(e) { toast(e.message,'error'); }
}

async function submitRecipeForm(evt) {
  evt.preventDefault();
  const id = document.getElementById('edit-recipe-id').value;
  const body = {
    title: document.getElementById('r-title').value,
    description: document.getElementById('r-desc').value,
    image_url: document.getElementById('r-image').value,
    cuisine: document.getElementById('r-cuisine').value,
    price: +document.getElementById('r-price').value,
    cook_time: +document.getElementById('r-cook-time').value,
    servings: +document.getElementById('r-servings').value,
    is_veg: document.getElementById('r-is-veg').value === 'true',
    category_id: +document.getElementById('r-category').value,
    ingredients: document.getElementById('r-ingredients').value,
    steps: document.getElementById('r-steps').value,
  };
  try {
    if (id) { await api(`/api/recipes/${id}`, { method: 'PUT', body: JSON.stringify(body) }); toast('Recipe updated!'); }
    else { await api('/api/recipes', { method: 'POST', body: JSON.stringify(body) }); toast('Recipe added!'); }
    closeModal('add-recipe-modal');
    loadAdminRecipes();
  } catch(e) { toast(e.message,'error'); }
}

async function deleteRecipe(id) {
  if (!confirm('Delete this recipe permanently?')) return;
  try {
    await api(`/api/recipes/${id}`, { method: 'DELETE' });
    toast('Recipe deleted');
    loadAdminRecipes();
  } catch(e) { toast(e.message,'error'); }
}

// ── CONTACT ───────────────────────────────────────────────────────────────────
function submitContactForm(evt) {
  evt.preventDefault();
  toast('Message sent! We\'ll get back to you shortly. 📬');
  evt.target.reset();
}

// ── SEARCH DEBOUNCE ───────────────────────────────────────────────────────────
const debouncedLoadRecipes = debounce(loadRecipes, 400);

document.addEventListener('DOMContentLoaded', () => {
  const recipeSearchEl = document.getElementById('recipe-search');
  if (recipeSearchEl) recipeSearchEl.addEventListener('input', debouncedLoadRecipes);
});

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
  // Check if already logged in
  try {
    const data = await api('/api/auth/me');
    if (data.user) {
      setUser(data.user);
      await refreshCartFromServer();
      await refreshFavourites();
    }
  } catch {}

  await loadCategories();
  await loadHomeRecipes();
}

init();

const nav = [
  ["dashboard", "Dashboard", "fa-chart-pie"],
  ["products", "Products", "fa-cube"],
  ["categories", "Categories", "fa-layer-group"],
  ["suppliers", "Suppliers", "fa-truck-field"],
  ["customers", "Customers", "fa-users"],
  ["purchases", "Purchases", "fa-bag-shopping"],
  ["sales", "Sales", "fa-receipt"],
  ["inventory", "Inventory", "fa-boxes-stacked"],
  ["warehouses", "Warehouses", "fa-warehouse"],
  ["orders", "Orders", "fa-clipboard-list"],
  ["stock-movements", "Stock Movements", "fa-arrow-right-arrow-left"],
  ["reports", "Reports", "fa-chart-column"],
  ["users", "Users", "fa-user-shield"],
  ["settings", "Settings", "fa-gear"],
  ["profile", "Profile", "fa-circle-user"],
];
const defs = {
  products: [
    "Products",
    "products",
    [
      ["name", "Product Name"],
      ["sku", "SKU"],
      ["category_id", "Category", "categories"],
      ["supplier_id", "Supplier", "suppliers"],
      ["warehouse_id", "Warehouse", "warehouses"],
      ["purchase_price", "Purchase Price", "number"],
      ["selling_price", "Selling Price", "number"],
      ["quantity", "Quantity", "number"],
      ["minimum_stock", "Minimum Stock", "number"],
      ["description", "Description", "textarea"],
      ["status", "Status", "status"],
    ],
    [
      "id",
      "name",
      "sku",
      "purchase_price",
      "selling_price",
      "quantity",
      "status",
    ],
  ],
  categories: [
    "Categories",
    "categories",
    [
      ["name", "Category Name"],
      ["description", "Description", "textarea"],
      ["status", "Status", "status"],
    ],
    ["id", "name", "description", "status"],
  ],
  suppliers: [
    "Suppliers",
    "suppliers",
    [
      ["name", "Supplier Name"],
      ["company", "Company"],
      ["phone", "Phone"],
      ["email", "Email", "email"],
      ["address", "Address", "textarea"],
      ["status", "Status", "status"],
    ],
    ["id", "name", "company", "phone", "email", "status"],
  ],
  customers: [
    "Customers",
    "customers",
    [
      ["name", "Name"],
      ["phone", "Phone"],
      ["email", "Email", "email"],
      ["address", "Address", "textarea"],
      ["status", "Status", "status"],
    ],
    ["id", "name", "phone", "email", "status"],
  ],
  warehouses: [
    "Warehouses",
    "warehouses",
    [
      ["name", "Warehouse Name"],
      ["location", "Location"],
      ["manager", "Manager"],
      ["capacity", "Capacity", "number"],
      ["status", "Status", "status"],
    ],
    ["id", "name", "location", "manager", "capacity", "status"],
  ],
  orders: [
    "Orders",
    "orders",
    [
      ["customer_id", "Customer", "customers"],
      ["product_id", "Product", "products"],
      ["quantity", "Quantity", "number"],
      ["total_amount", "Total", "number"],
      ["payment_status", "Payment Status", "payment"],
      ["order_status", "Order Status", "orderstatus"],
      ["order_date", "Date", "date"],
    ],
    [
      "id",
      "customer_id",
      "product_id",
      "quantity",
      "total_amount",
      "payment_status",
      "order_status",
      "order_date",
    ],
  ],
};
const page = location.pathname.split("/").pop().replace(".html", ""),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
let dashboardChartInstances = [];
let globalSearchRecordsPromise = null;
function toast(s) {
  let x = document.createElement("div");
  x.className = "toast";
  x.textContent = s;
  document.body.append(x);
  setTimeout(() => x.remove(), 2800);
}
function purchaseStatusBadge(status) {
  const value = String(status || "Pending");
  const key = value.toLowerCase();
  const tone = key === "paid" ? "green" : key === "partial" ? "amber" : "neutral";
  return `<span class="badge ${tone}">${esc(value)}</span>`;
}
async function confirmAndDeletePurchase(purchaseId, button, refresh) {
  if (!confirm(`Delete purchase #${purchaseId}? This cannot be undone. Purchases linked to stock movement history cannot be deleted.`)) return;
  button.disabled = true;
  try {
    await API.request("purchases/" + encodeURIComponent(purchaseId), { method: "DELETE" });
  } catch (error) {
    button.disabled = false;
    toast(error.message || "Could not delete purchase #" + purchaseId + ".");
    return;
  }
  globalSearchRecordsPromise = null;
  toast("Purchase #" + purchaseId + " deleted successfully.");
  localStorage.setItem("stockwise:purchases-updated", JSON.stringify({ id: purchaseId, at: Date.now() }));
  try {
    await refresh();
  } catch (error) {
    toast("Purchase #" + purchaseId + " was deleted, but the list could not refresh: " + (error.message || "Please reload the page."));
  }
}
function shell(title) {
  let u = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = u.name || "Admin";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";
  const visibleNav = nav.filter(([id]) => id !== "users" || String(u.role || "").toLowerCase() === "admin");
  document.getElementById("app").innerHTML =
    `<div class="sidebar-backdrop" id="sidebar-backdrop"></div><aside class="sidebar" id="sidebar"><a class="brand" href="dashboard.html"><b class="brand-mark"><i class="fa-solid fa-boxes-stacked"></i></b><span>Stockwise</span></a><div class="nav-label">WORKSPACE</div><nav class="nav-list">${visibleNav.map(([id, label, icon]) => `<a class="nav-link ${page === id ? "active" : ""}" href="${id === "dashboard" ? "dashboard.html" : id + ".html"}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join("")}</nav><div class="side-foot"><span class="avatar">${esc(initial)}</span><span class="side-profile-copy"><strong>${esc(displayName)}</strong><small>${esc(u.role || "Administrator")}</small></span><button class="icon-button logout-button" type="button" aria-label="Log out" title="Log out"><i class="fa-solid fa-arrow-right-from-bracket"></i></button></div></aside><main class="main"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu-button" id="menu-toggle" type="button" aria-label="Open navigation"><i class="fa-solid fa-bars"></i></button><strong class="top-title">${esc(title)}</strong></div><div class="top-actions"><label class="global-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="global-search-input" type="search" placeholder="Search products, suppliers, purchases" autocomplete="off" aria-label="Search products, suppliers, and purchases"><div class="global-search-results" id="global-search-results" hidden></div></label><span class="top-date">${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date())}</span><div class="notification-wrap"><button class="icon-button notification-button" id="notification-toggle" type="button" aria-label="Notifications" aria-expanded="false"><i class="fa-regular fa-bell"></i><span class="notification-count" id="notification-count" hidden></span></button><div class="notification-panel" id="notification-panel" hidden></div></div><button class="profile-shortcut" type="button" onclick="location.href='profile.html'"><span class="avatar">${esc(initial)}</span><span>${esc(displayName)}</span></button></div></header><section class="content" id="content"></section></main>`;
  document.querySelector(".logout-button").addEventListener("click", () => API.logout());
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebar-backdrop").classList.toggle("visible");
  });
  document.getElementById("sidebar-backdrop").addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-backdrop").classList.remove("visible");
  });
  setupGlobalSearch();
  setupNotifications();
}

async function getGlobalSearchRecords() {
  if (!globalSearchRecordsPromise) {
    globalSearchRecordsPromise = Promise.all([
      API.request("products"), API.request("suppliers"), API.request("purchases"),
    ]).then(([products, suppliers, purchases]) => [
      ...products.map((row) => ({ kind: "Product", label: row.name, detail: row.sku, page: "products", query: row.name })),
      ...suppliers.map((row) => ({ kind: "Supplier", label: row.name, detail: row.company || row.email || "Supplier", page: "suppliers", query: row.name })),
      ...purchases.map((row) => ({ kind: "Purchase", label: `Purchase #${row.id}`, detail: `${row.supplier || "Supplier"} · ${row.product || "Product"}`, page: "purchases", query: String(row.id) })),
    ]);
  }
  return globalSearchRecordsPromise;
}

function setupGlobalSearch() {
  const input = document.getElementById("global-search-input");
  const results = document.getElementById("global-search-results");
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 2) { results.hidden = true; return; }
      results.hidden = false;
      results.innerHTML = '<div class="search-state">Searching your records…</div>';
      try {
        const records = await getGlobalSearchRecords();
        const matches = records.filter((row) => `${row.label} ${row.detail}`.toLowerCase().includes(query)).slice(0, 8);
        results.innerHTML = matches.length ? matches.map((row) => `<button class="search-result" type="button" data-href="${row.page}.html?q=${encodeURIComponent(row.query)}"><span><small>${esc(row.kind)}</small><strong>${esc(row.label)}</strong></span><span class="search-result-detail">${esc(row.detail)}</span></button>`).join("") : '<div class="search-state">No matching records.</div>';
      } catch (error) {
        results.innerHTML = `<div class="search-state error">${esc(error.message || "Search is unavailable.")}</div>`;
      }
    }, 180);
  });
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-href]");
    if (button) location.href = button.dataset.href;
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { results.hidden = true; input.blur(); }
  });
}

async function refreshNotifications() {
  const panel = document.getElementById("notification-panel");
  const count = document.getElementById("notification-count");
  try {
    const notifications = await API.request("notifications");
    const unread = notifications.filter((item) => !item.is_read).length;
    count.hidden = unread === 0;
    count.textContent = unread > 9 ? "9+" : String(unread);
    panel.innerHTML = `<div class="notification-heading"><strong>Notifications</strong><button type="button" class="text-button" data-refresh-notifications>Refresh</button></div>${notifications.length ? notifications.slice(0, 8).map((item) => `<div class="notification-item ${item.is_read ? "read" : "unread"}"><span class="notification-dot"></span><span><strong>${esc(item.type)}</strong><small>${esc(item.message)}</small></span>${item.is_read ? "" : `<button class="text-button mark-notification-read" type="button" data-notification-id="${item.id}">Mark read</button>`}</div>`).join("") : '<p class="search-state">You’re all caught up.</p>'}`;
  } catch (error) {
    panel.innerHTML = `<p class="search-state error">${esc(error.message || "Notifications are unavailable.")}</p>`;
  }
}

function setupNotifications() {
  const toggle = document.getElementById("notification-toggle");
  const panel = document.getElementById("notification-panel");
  toggle.addEventListener("click", async () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) await refreshNotifications();
  });
  panel.addEventListener("click", async (event) => {
    if (event.target.closest("[data-refresh-notifications]")) return refreshNotifications();
    const button = event.target.closest(".mark-notification-read");
    if (!button) return;
    try { await API.request(`notifications/${encodeURIComponent(button.dataset.notificationId)}/read`, { method: "PUT" }); await refreshNotifications(); }
    catch (error) { toast(error.message || "Could not update notification."); }
  });
}
async function pageTable(d) {
  let [title, res, fields, cols] = d;
  shell(title);
  let area = document.querySelector("#content"),
    lookups = {};
  for (let f of fields)
    if (
      [
        "categories",
        "suppliers",
        "customers",
        "warehouses",
        "products",
      ].includes(f[2])
    )
      lookups[f[2]] = await API.request(f[2]);
  area.innerHTML = `<div class="page-head"><div><h1>${title}</h1><div class="muted">Manage your ${title.toLowerCase()} records.</div></div><button id="add" class="button primary">+ Add ${title.replace(/s$/, "")}</button></div><div class="toolbar"><input id="q" placeholder="Search ${title.toLowerCase()}…"></div><div id="table" class="loading">Loading…</div>`;
  let data = [];
  async function render() {
    data = await API.request(res);
    let q = area.querySelector("#q").value.toLowerCase();
    let arr = data.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    area.querySelector("#table").innerHTML = arr.length
      ? `<div class="table-wrap"><table><thead><tr>${cols.map((x) => `<th>${x.replaceAll("_", " ")}</th>`).join("")}<th>Actions</th></tr></thead><tbody>${arr.map((r) => `<tr>${cols.map((k) => `<td>${k.includes("price") || k === "total_amount" ? money(r[k]) : k.endsWith("_id") ? esc(lookups[k.slice(0, -3)]?.find((x) => x.id === r[k])?.name || r[k]) : esc(r[k])}</td>`).join("")}<td><button class="button edit" data-id="${r.id}">Edit</button> <button class="button danger del" data-id="${r.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>`
      : '<div class="panel empty">No records yet.</div>';
    area
      .querySelectorAll(".edit")
      .forEach((b) => (b.onclick = () => edit(rfind(b.dataset.id))));
    area.querySelectorAll(".del").forEach(
      (b) =>
        (b.onclick = async () => {
          if (confirm("Delete this record?"))
            try {
              await API.request(res + "/" + b.dataset.id, { method: "DELETE" });
              toast("Deleted");
              render();
            } catch (e) {
              toast(e.message);
            }
        }),
    );
  }
  function rfind(id) {
    return data.find((x) => x.id == id);
  }
  function edit(row) {
    let el = document.createElement("div");
    el.className = "modal-backdrop";
    el.innerHTML = `<form class="modal"><h2>${row ? "Edit" : "Add"} ${title.replace(/s$/, "")}</h2><div class="form-grid">${fields.map(([key, label, type]) => `<label class="${type === "textarea" ? "span2" : ""}">${label}${type === "textarea" ? `<textarea name="${key}">${esc(row?.[key] || "")}</textarea>` : type === "status" ? `<select name="${key}"><option>Active</option><option>Inactive</option></select>` : lookups[type] ? `<select name="${key}" required><option value="">Choose ${label}</option>${lookups[type].map((x) => `<option value="${x.id}" ${row?.[key] == x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>` : `<input name="${key}" type="${type === "number" ? "number" : type === "email" ? "email" : type === "date" ? "date" : "text"}" value="${esc(row?.[key] || "")}" ${type === "number" ? 'min="0" step="any"' : ""} ${["name", "sku"].includes(key) ? "required" : ""}>`}</label>`).join("")}</div><p class="error"></p><div class="modal-actions"><button type="button" class="button cancel">Cancel</button><button class="button primary">Save</button></div></form>`;
    document.body.append(el);
    el.querySelector(".cancel").onclick = () => el.remove();
    el.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      let body = Object.fromEntries(new FormData(e.target));
      fields.forEach((f) => {
        if (f[2] === "number" && body[f[0]]) body[f[0]] = Number(body[f[0]]);
      });
      try {
        await API.request(res + (row ? "/" + row.id : ""), {
          method: row ? "PUT" : "POST",
          body: JSON.stringify(body),
        });
        el.remove();
        toast("Saved");
        render();
      } catch (err) {
        el.querySelector(".error").textContent = err.message;
      }
    };
  }
  area.querySelector("#add").onclick = () => edit(null);
  area.querySelector("#q").oninput = render;
  area.querySelector("#q").value = new URLSearchParams(location.search).get("q") || "";
  await render();
}
async function dashboard() {
  dashboardChartInstances.forEach((chart) => chart.destroy());
  dashboardChartInstances = [];
  shell("Dashboard");
  const area = document.querySelector("#content");
  let d, products, purchases;
  try {
    [d, products, purchases] = await Promise.all([API.request("dashboard"), API.request("products"), API.request("purchases")]);
  } catch (error) {
    area.innerHTML = `<div class="panel error-panel"><h2>Dashboard unavailable</h2><p>${esc(error.message || "We could not load your inventory data.")}</p><button class="button primary" id="retry-dashboard">Retry</button></div>`;
    area.querySelector("#retry-dashboard").addEventListener("click", () => dashboard().catch(() => {}));
    return;
  }
  const s = d.stats;
  const displayName = JSON.parse(localStorage.getItem("user") || "{}").name || "Admin";
  const metricCards = [
    ["Total Products", Number(s.totalProducts) || 0, "fa-cube", "blue"],
    ["Total Suppliers", Number(s.totalSuppliers) || 0, "fa-truck-field", "green"],
    ["Total Purchases", money(s.totalPurchases), "fa-bag-shopping", "amber"],
    ["Total Sales", money(s.totalSales), "fa-chart-line", "purple"],
  ];
  area.innerHTML = `<div class="dashboard-heading"><div><p class="eyebrow">INVENTORY OVERVIEW</p><h1>Hello, ${esc(displayName)}!</h1><p class="muted">Here’s what’s happening with your inventory today.</p></div><span class="dashboard-date"><i class="fa-regular fa-calendar"></i> ${new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date())}</span></div><div class="stat-grid dashboard-stat-grid">${metricCards.map(([label, value, icon, tone]) => `<article class="stat-card"><span class="stat-icon ${tone}"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><div class="stat-content"><span class="label">${label}</span><strong class="value">${esc(value)}</strong></div></article>`).join("")}</div><section class="dashboard-analytics"><article class="panel analytics-panel"><div class="panel-heading"><div><h2>Purchase &amp; Sales Overview</h2><p>Monthly totals · last 12 months</p></div><span class="panel-icon"><i class="fa-solid fa-chart-line"></i></span></div><div class="chart-box"><canvas id="trend" aria-label="Monthly purchases and sales"></canvas></div></article><article class="panel analytics-panel stock-panel"><div class="panel-heading"><div><h2>Stock Status</h2><p>Product count by current availability</p></div><span class="panel-icon"><i class="fa-solid fa-boxes-stacked"></i></span></div><div class="stock-chart-wrap"><div class="stock-donut"><canvas id="stock-status-chart" aria-label="Stock status distribution"></canvas><div class="donut-center"><strong id="stock-total">0</strong><span>products</span></div></div><div class="stock-status-legend" id="stock-status-legend"></div></div></article></section><section class="dashboard-lower"><article class="panel table-panel"><div class="panel-heading"><div><h2>Recent Purchases</h2><p>Your latest purchase activity</p></div><a class="view-all-link" href="purchases.html">View all <i class="fa-solid fa-arrow-right"></i></a></div><div class="table-wrap dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>ID</th><th>Date</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody id="recent-purchases-body"></tbody></table></div></article><article class="panel top-products-panel"><div class="panel-heading"><div><h2>Top Products</h2><p>Ranked by units sold</p></div><span class="panel-icon"><i class="fa-solid fa-ranking-star"></i></span></div><div id="top-products-list"></div></article></section>`;
  const recentBody = area.querySelector("#recent-purchases-body");
  const recentRows = purchases.slice(0, 6);
  recentBody.innerHTML = recentRows.length ? recentRows.map((row) => `<tr><td><span class="record-id">#${row.id}</span></td><td>${new Date(row.purchase_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td>${esc(row.supplier || "—")}</td><td>${esc(row.product || "—")}</td><td>${Number(row.quantity) || 0}</td><td>${money(row.total_amount)}</td><td>${purchaseStatusBadge(row.payment_status)}</td><td><button class="icon-button row-delete-button delete-purchase" type="button" data-purchase-id="${row.id}" aria-label="Delete purchase ${row.id}" title="Delete purchase"><i class="fa-regular fa-trash-can"></i></button></td></tr>`).join("") : '<tr><td colspan="8" class="empty-cell">No purchase records found.</td></tr>';
  recentBody.addEventListener("click", (event) => {
    const button = event.target.closest(".delete-purchase");
    if (button) confirmAndDeletePurchase(button.dataset.purchaseId, button, () => dashboard());
  });

  const topProducts = d.topProducts || [];
  const maxUnits = Math.max(...topProducts.map((item) => Number(item.quantity) || 0), 1);
  area.querySelector("#top-products-list").innerHTML = topProducts.length ? `<div class="top-product-list">${topProducts.map((item, index) => {
    const amount = Number(item.quantity) || 0;
    return `<div class="top-product-row"><span class="product-rank">${index + 1}</span><div class="top-product-info"><div class="top-product-copy"><strong>${esc(item.name)}</strong><span>${esc(item.category || "Uncategorized")} · ${amount.toLocaleString("en-IN")} sold</span></div><div class="progress-track"><span style="width:${Math.round(amount / maxUnits * 100)}%"></span></div></div></div>`;
  }).join("")}</div>` : '<div class="empty compact-empty">No sales data available yet.</div>';

  const months = [
    ...new Set([...d.monthlySales, ...d.monthlyPurchases].map((x) => x.month)),
  ].sort();
  const trendCanvas = document.querySelector("#trend");
  if (!months.length) trendCanvas.parentElement.innerHTML = '<div class="chart-empty">No purchase or sales totals for this period.</div>';
  else dashboardChartInstances.push(new Chart(trendCanvas, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Sales",
          data: months.map((m) => Number(d.monthlySales.find((x) => x.month === m)?.total) || 0),
          borderColor: "#2583f8",
          backgroundColor: "rgba(37,131,248,.08)",
          fill: true,
          tension: .35,
          pointRadius: 2,
        },
        {
          label: "Purchases",
          data: months.map((m) => Number(d.monthlyPurchases.find((x) => x.month === m)?.total) || 0),
          borderColor: "#14a36a",
          backgroundColor: "rgba(20,163,106,.06)",
          fill: true,
          tension: .35,
          pointRadius: 2,
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, padding: 20 } }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${money(context.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }, y: { beginAtZero: true, grid: { color: "#eef2f7" }, ticks: { callback: (value) => Number(value) >= 100000 ? `₹${(Number(value) / 100000).toFixed(1)}L` : `₹${Number(value).toLocaleString("en-IN")}` } } } },
  }));
  const stockCounts = [
    { label: "In Stock", color: "#19a36b", count: 0 },
    { label: "Low Stock", color: "#f0a429", count: 0 },
    { label: "Out of Stock", color: "#e55353", count: 0 },
    { label: "Inactive", color: "#9aa8ba", count: 0 },
  ];
  for (const product of products) {
    const quantity = Number(product.quantity) || 0;
    const minimum = Number(product.minimum_stock) || 0;
    const index = String(product.status).toLowerCase() !== "active" ? 3 : quantity <= 0 ? 2 : quantity <= minimum ? 1 : 0;
    stockCounts[index].count += 1;
  }
  const totalStockStatuses = stockCounts.reduce((total, item) => total + item.count, 0);
  document.getElementById("stock-total").textContent = totalStockStatuses.toLocaleString("en-IN");
  area.querySelector("#stock-status-legend").innerHTML = stockCounts.map((item) => {
    const percentage = totalStockStatuses ? Math.round(item.count / totalStockStatuses * 100) : 0;
    return `<div class="stock-legend-row"><span class="stock-legend-label"><i style="--legend-color:${item.color}"></i>${item.label}</span><strong>${item.count}<small>${percentage}%</small></strong></div>`;
  }).join("");
  if (totalStockStatuses) dashboardChartInstances.push(new Chart(document.querySelector("#stock-status-chart"), {
    type: "doughnut",
    data: { labels: stockCounts.map((item) => item.label), datasets: [{ data: stockCounts.map((item) => item.count), backgroundColor: stockCounts.map((item) => item.color), borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "74%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw} (${Math.round(context.raw / totalStockStatuses * 100)}%)` } } } },
  }));
  else document.querySelector(".stock-donut").innerHTML = '<div class="chart-empty">No products to classify.</div>';
}
async function specialized() {
  if (page === "dashboard") return dashboard();
  if (defs[page]) return pageTable(defs[page]);
  shell(page.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  let a = document.querySelector("#content");
  if (page === "purchases" || page === "sales") {
    let isSale = page === "sales",
      res = page,
      title = isSale ? "Sales" : "Purchases",
      refs = await Promise.all([
        API.request(isSale ? "customers" : "suppliers"),
        API.request("products"),
        ...(!isSale ? [API.request("warehouses")] : []),
      ]),
      rows = await API.request(res);
    a.innerHTML = `<div class="page-head"><div><p class="eyebrow">${isSale ? "ORDER MANAGEMENT" : "SUPPLY MANAGEMENT"}</p><h1>${title}</h1><div class="muted">${isSale ? "Record sales and reduce stock." : "Record purchases and receive stock."}</div></div><button id="add" class="button primary"><i class="fa-solid fa-plus"></i> New ${isSale ? "Sale" : "Purchase"}</button></div><div class="toolbar page-toolbar"><label class="page-search"><i class="fa-solid fa-magnifying-glass"></i><input id="transaction-search" type="search" placeholder="Search ${title.toLowerCase()}…" aria-label="Search ${title.toLowerCase()}"></label></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>${isSale ? "Customer" : "Supplier"}</th><th>Product</th><th>Quantity</th><th>Total</th><th>Date</th>${isSale ? "" : "<th>Actions</th>"}</tr></thead><tbody></tbody></table></div>`;
    const transactionBody = a.querySelector("tbody");
    const drawTransactions = () => {
      const query = a.querySelector("#transaction-search").value.trim().toLowerCase();
      const filteredRows = rows.filter((row) => !query || `${row.id} ${row.supplier || row.customer || ""} ${row.product || ""} ${row.warehouse || ""}`.toLowerCase().includes(query));
      transactionBody.innerHTML = filteredRows.length ? filteredRows.map((r) => `<tr><td><span class="record-id">#${r.id}</span></td><td>${esc(r.customer || r.supplier)}</td><td>${esc(r.product)}</td><td>${Number(r.quantity) || 0}</td><td>${money(r.total_amount)}</td><td>${new Date(r.sale_date || r.purchase_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>${isSale ? "" : `<td><button class="button danger delete-purchase" type="button" data-purchase-id="${r.id}" aria-label="Delete purchase ${r.id}"><i class="fa-regular fa-trash-can" aria-hidden="true"></i> Delete</button></td>`}</tr>`).join("") : `<tr><td colspan="${isSale ? 6 : 7}" class="empty-cell">No matching ${title.toLowerCase()} records.</td></tr>`;
    };
    if (!isSale) {
      transactionBody.addEventListener("click", async (event) => {
        const button = event.target.closest(".delete-purchase");
        if (!button || !a.contains(button)) return;
        await confirmAndDeletePurchase(button.dataset.purchaseId, button, () => specialized());
      });
    }
    a.querySelector("#transaction-search").value = new URLSearchParams(location.search).get("q") || "";
    a.querySelector("#transaction-search").addEventListener("input", drawTransactions);
    drawTransactions();
    a.querySelector("#add").onclick = () => {
      const back = document.createElement("div");
      back.className = "modal-backdrop";
      back.innerHTML = `<form class="modal"><h2>New ${isSale ? "Sale" : "Purchase"}</h2><div class="form-grid"><label>${isSale ? "Customer" : "Supplier"}<select name="${isSale ? "customer_id" : "supplier_id"}" required><option value="">Choose</option>${refs[0].map((x) => `<option value="${x.id}">${esc(x.name)}</option>`)}</select></label><label>Product<select name="product_id" required><option value="">Choose</option>${refs[1].map((x) => `<option value="${x.id}">${esc(x.name)} (stock ${x.quantity})</option>`)}</select></label>${!isSale ? `<label>Warehouse<select name="warehouse_id" required>${refs[2].map((x) => `<option value="${x.id}">${esc(x.name)}</option>`)}</select></label>` : ""}<label>Quantity<input name="quantity" type="number" min="1" required></label><label>${isSale ? "Selling" : "Purchase"} Price<input name="${isSale ? "selling_price" : "purchase_price"}" type="number" min="0" step=".01" required></label><label>Payment Status<select name="payment_status"><option>Paid</option><option>Pending</option><option>Partial</option></select></label><label>Date<input type="date" name="${isSale ? "sale_date" : "purchase_date"}"></label></div><p class="error"></p><div class="modal-actions"><button type="button" class="button cancel">Cancel</button><button class="button primary">Save</button></div></form>`;
      document.body.append(back);
      back.querySelector(".cancel").onclick = () => back.remove();
      back.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        let body = Object.fromEntries(new FormData(e.target));
        try {
          await API.request(res, {
            method: "POST",
            body: JSON.stringify(body),
          });
          toast("Saved; stock updated");
          back.remove();
          globalSearchRecordsPromise = null;
          if (!isSale) localStorage.setItem("stockwise:purchases-updated", JSON.stringify({ at: Date.now() }));
          specialized();
        } catch (err) {
          back.querySelector(".error").textContent = err.message;
        }
      };
    };
  } else {
    let endpoint = {
      inventory: "inventory",
      "stock-movements": "stock-movements",
    }[page];
    if (endpoint) {
      let rows = await API.request(endpoint);
      a.innerHTML = `<div class="page-head"><div><h1>${page === "inventory" ? "Inventory" : "Stock Movements"}</h1></div></div><div class="table-wrap"><table><thead><tr>${Object.keys(
        rows[0] || { message: "No records" },
      )
        .map((k) => `<th>${k.replaceAll("_", " ")}</th>`)
        .join("")}</tr></thead><tbody>${rows
        .map(
          (r) =>
            `<tr>${Object.values(r)
              .map((v) => `<td>${esc(v)}</td>`)
              .join("")}</tr>`,
        )
        .join("")}</tbody></table></div>`;
    } else if (page === "users") {
      const users = await API.request("users");
      a.innerHTML = `<div class="page-head"><div><p class="eyebrow">ACCESS MANAGEMENT</p><h1>Users</h1><p class="muted">Review the accounts with access to this workspace.</p></div></div><div class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Created</th></tr></thead><tbody>${users.length ? users.map((user) => `<tr><td><span class="user-cell"><span class="avatar small-avatar">${esc((user.name || "U").charAt(0).toUpperCase())}</span><strong>${esc(user.name)}</strong></span></td><td>${esc(user.email)}</td><td><span class="badge blue-badge">${esc(user.role)}</span></td><td>${user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td></tr>`).join("") : '<tr><td colspan="4" class="empty-cell">No user accounts found.</td></tr>'}</tbody></table></div></div>`;
    } else if (page === "reports") {
      let r = await API.request("reports");
      a.innerHTML = `<h1>Reports</h1><div class="toolbar"><select id="which"><option value="sales">Sales Report</option><option value="purchases">Purchase Report</option><option value="inventory">Inventory Report</option></select><button class="button" onclick="window.print()">Print</button><button class="button" id="csv">Export CSV</button></div><div id="report"></div>`;
      const draw = () => {
        let list = r[a.querySelector("#which").value];
        a.querySelector("#report").innerHTML =
          `<div class="table-wrap"><table><thead><tr>${Object.keys(
            list[0] || {},
          )
            .map((k) => `<th>${k}</th>`)
            .join("")}</tr></thead><tbody>${list
            .map(
              (row) =>
                `<tr>${Object.values(row)
                  .map((v) => `<td>${esc(v)}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody></table></div>`;
      };
      a.querySelector("#which").onchange = draw;
      draw();
      a.querySelector("#csv").onclick = () => {
        const list = r[a.querySelector("#which").value],
          keys = Object.keys(list[0] || {}),
          csv = [
            keys.join(","),
            ...list.map((x) =>
              keys
                .map(
                  (k) => '"' + String(x[k] ?? "").replaceAll('"', '""') + '"',
                )
                .join(","),
            ),
          ].join("\n"),
          link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        link.download = "report.csv";
        link.click();
      };
    } else if (page === "profile") {
      let u = await API.request("profile");
      a.innerHTML = `<h1>Profile</h1><form id="profile" class="panel form-grid"><label>Name<input name="name" value="${esc(u.name)}" required></label><label>Email<input name="email" type="email" value="${esc(u.email)}" required></label><label>Role<input disabled value="${esc(u.role)}"></label><button class="button primary">Save Profile</button></form>`;
      a.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        await API.request("profile", {
          method: "PUT",
          body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
        });
        toast("Profile saved");
      };
    } else if (page === "settings") {
      let s = await API.request("settings");
      a.innerHTML = `<h1>Settings</h1><form id="settings" class="panel form-grid">${[
        ["company_name", "Company Name"],
        ["company_email", "Email"],
        ["company_phone", "Phone"],
        ["company_address", "Address"],
        ["currency", "Currency"],
        ["date_format", "Date Format"],
      ]
        .map(
          ([n, l]) =>
            `<label>${l}<input name="${n}" value="${esc(s[n] || "")}"></label>`,
        )
        .join(
          "",
        )}<label>Theme<select name="theme"><option>Light</option><option>Dark</option></select></label>${["low_stock_alerts", "sales_notifications", "purchase_notifications"].map((x) => `<label><input type="checkbox" name="${x}" ${s[x] ? "checked" : ""}> ${x.replaceAll("_", " ")}</label>`).join("")}<button class="button primary">Save Settings</button></form>`;
      a.querySelector("#settings").onsubmit = async (e) => {
        e.preventDefault();
        let f = e.target,
          b = Object.fromEntries(new FormData(f));
        [
          "low_stock_alerts",
          "sales_notifications",
          "purchase_notifications",
        ].forEach((k) => (b[k] = f[k].checked));
        await API.request("settings", {
          method: "PUT",
          body: JSON.stringify(b),
        });
        toast("Settings saved");
      };
    }
  }
}
specialized().catch((e) => {
  document.querySelector("#app").innerHTML =
    `<div class="panel error">${esc(e.message)}</div>`;
});
window.addEventListener("storage", (event) => {
  if (page === "dashboard" && event.key === "stockwise:purchases-updated") {
    dashboard().catch((error) => {
      document.querySelector("#content").innerHTML = `<div class="panel error">${esc(error.message)}</div>`;
    });
  }
});

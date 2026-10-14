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
let dashboardTrendChart = null;
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
  document.getElementById("app").innerHTML =
    `<div class="sidebar-backdrop" id="sidebar-backdrop"></div><aside class="sidebar" id="sidebar"><a class="brand" href="dashboard.html"><b class="brand-mark"><i class="fa-solid fa-boxes-stacked"></i></b><span>Stockwise</span></a><div class="nav-label">WORKSPACE</div><nav class="nav-list">${nav.map(([id, label, icon]) => `<a class="nav-link ${page === id ? "active" : ""}" href="${id === "dashboard" ? "dashboard.html" : id + ".html"}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join("")}</nav><div class="side-foot"><span class="avatar">${esc(initial)}</span><span class="side-profile-copy"><strong>${esc(displayName)}</strong><small>${esc(u.role || "Administrator")}</small></span><button class="icon-button logout-button" type="button" aria-label="Log out" title="Log out"><i class="fa-solid fa-arrow-right-from-bracket"></i></button></div></aside><main class="main"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu-button" id="menu-toggle" type="button" aria-label="Open navigation"><i class="fa-solid fa-bars"></i></button><strong class="top-title">${esc(title)}</strong></div><div class="top-actions"><label class="global-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="global-search-input" type="search" placeholder="Search products, suppliers, purchases" autocomplete="off" aria-label="Search products, suppliers, and purchases"><div class="global-search-results" id="global-search-results" hidden></div></label><span class="top-date">${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date())}</span><div class="notification-wrap"><button class="icon-button notification-button" id="notification-toggle" type="button" aria-label="Notifications" aria-expanded="false"><i class="fa-regular fa-bell"></i><span class="notification-count" id="notification-count" hidden></span></button><div class="notification-panel" id="notification-panel" hidden></div></div><div class="profile-shortcut"><span class="avatar">${esc(initial)}</span><span>${esc(displayName)}</span></div></div></header><section class="content" id="content"></section></main>`;
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
function dashboardBucketKey(date, monthOnly = false) {
  const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
  return monthOnly ? key : `${key}-${String(date.getDate()).padStart(2,"0")}`;
}
function dashboardBuckets(range) {
  const today = new Date(); today.setHours(0,0,0,0);
  if (range === "12m") {
    const first = new Date(today.getFullYear(),today.getMonth()-11,1);
    return Array.from({length:12},(_,i)=>{
      const date=new Date(first.getFullYear(),first.getMonth()+i,1);
      return {key:dashboardBucketKey(date,true),label:new Intl.DateTimeFormat("en-IN",{month:"short",year:"2-digit"}).format(date)};
    });
  }
  const days=range==="7d"?7:range==="30d"?30:90, first=new Date(today);
  first.setDate(first.getDate()-days+1);
  if(range==="90d") first.setDate(first.getDate()-((first.getDay()+6)%7));
  const result=[];
  for(const date=new Date(first);date<=today;date.setDate(date.getDate()+1)){
    if(range==="90d"&&date.getDay()!==1) continue;
    result.push({key:dashboardBucketKey(date),label:new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short"}).format(date)});
  }
  return result;
}
function renderDashboardTrend(data,range) {
  const box=document.getElementById("trend-chart-box"); if(!box) return;
  if(dashboardTrendChart){dashboardTrendChart.destroy();dashboardChartInstances=dashboardChartInstances.filter(x=>x!==dashboardTrendChart);dashboardTrendChart=null;}
  const trend=data.trend||{sales:(data.monthlySales||[]).map(x=>({bucket:x.month,total:x.total})),purchases:(data.monthlyPurchases||[]).map(x=>({bucket:x.month,total:x.total}))};
  const sales=trend.sales||[], purchases=trend.purchases||[];
  if(!sales.length&&!purchases.length){box.innerHTML='<div class="chart-state" role="status">No purchase or sales totals for this period.</div>';return;}
  if(typeof Chart!=="function"){box.innerHTML='<div class="chart-state error" role="status">The chart could not load. Refresh this page to try again.</div>';return;}
  const buckets=dashboardBuckets(range), salesMap=new Map(sales.map(x=>[x.bucket,Number(x.total)||0])), purchaseMap=new Map(purchases.map(x=>[x.bucket,Number(x.total)||0]));
  const style=getComputedStyle(document.body), css=n=>style.getPropertyValue(n).trim();
  const axisMoney=value=>{const n=Number(value)||0;return n>=1e7?`₹${(n/1e7).toFixed(1)}Cr`:n>=1e5?`₹${(n/1e5).toFixed(1)}L`:`₹${n.toLocaleString("en-IN")}`;};
  box.replaceChildren(); const canvas=document.createElement("canvas");canvas.id="trend";canvas.setAttribute("aria-label",`Purchase and sales totals for ${range}`);box.append(canvas);
  Chart.defaults.color=css("--dashboard-muted");Chart.defaults.font.family='"DM Sans", sans-serif';
  dashboardTrendChart=new Chart(canvas,{
    type:"line",
    data:{labels:buckets.map(x=>x.label),datasets:[
      {label:"Sales",data:buckets.map(x=>salesMap.get(x.key)||0),borderColor:css("--dashboard-blue"),backgroundColor:"rgba(59,130,246,.12)",fill:true,tension:.3,pointRadius:range==="90d"?1:2,pointHoverRadius:5,borderWidth:2},
      {label:"Purchases",data:buckets.map(x=>purchaseMap.get(x.key)||0),borderColor:css("--dashboard-success"),backgroundColor:"rgba(34,197,94,.08)",fill:true,tension:.3,pointRadius:range==="90d"?1:2,pointHoverRadius:5,borderWidth:2}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{
      legend:{position:"bottom",labels:{color:css("--dashboard-muted"),usePointStyle:true,boxWidth:8,padding:20}},
      tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.parsed.y)}`}}
    },scales:{
      x:{grid:{display:false},border:{display:false},ticks:{color:css("--dashboard-muted"),maxRotation:0,autoSkip:true,maxTicksLimit:range==="7d"?7:range==="30d"?10:12}},
      y:{beginAtZero:true,grid:{color:css("--dashboard-grid")},border:{display:false},ticks:{color:css("--dashboard-muted"),callback:axisMoney}}
    }}
  });
  dashboardChartInstances.push(dashboardTrendChart);
}
async function dashboard() {
  dashboardChartInstances.forEach(chart=>chart.destroy());dashboardChartInstances=[];dashboardTrendChart=null;
  document.body.classList.add("dashboard-theme");shell("Dashboard");
  const area=document.querySelector("#content");
  area.innerHTML='<div class="panel dashboard-loading" role="status"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Loading your inventory dashboard…</div>';
  let d,products,purchases;
  try{[d,products,purchases]=await Promise.all([API.request("dashboard?range=12m"),API.request("products"),API.request("purchases")]);}
  catch(error){area.innerHTML=`<div class="panel error-panel"><h2>Dashboard unavailable</h2><p>${esc(error.message||"We could not load your inventory data.")}</p><button class="button primary" id="retry-dashboard">Retry</button></div>`;area.querySelector("#retry-dashboard").addEventListener("click",()=>dashboard().catch(()=>{}));return;}
  const s=d.stats||{},displayName=JSON.parse(localStorage.getItem("user")||"{}").name||"Admin";
  const productsCount=Number(s.totalProducts)||0,suppliersCount=Number(s.totalSuppliers)||0,purchaseTotal=Number(s.totalPurchases)||0,salesTotal=Number(s.totalSales)||0,stockTotal=Number(s.totalStock)||0;
  const cards=[
    ["Total Products",productsCount.toLocaleString("en-IN"),"fa-cube","blue","products.html","Product records"],
    ["Total Suppliers",suppliersCount.toLocaleString("en-IN"),"fa-truck-field","green","suppliers.html","Supplier records"],
    ["Total Purchases",money(purchaseTotal),"fa-bag-shopping","purple","purchases.html","Recorded purchase value"],
    ["Total Sales",money(salesTotal),"fa-chart-line","orange","sales.html","Recorded revenue in this system"],
    ["Units in Stock",stockTotal.toLocaleString("en-IN"),"fa-boxes-stacked","teal","inventory.html","Current product quantities"]
  ];
  area.innerHTML=`<div class="dashboard-heading"><div><p class="eyebrow">INVENTORY OVERVIEW</p><h1>Welcome back, ${esc(displayName)}</h1><p class="muted">A clear view of stock, transactions, and supplier activity.</p></div><span class="dashboard-date"><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${new Intl.DateTimeFormat("en-IN",{dateStyle:"full"}).format(new Date())}</span></div>
  <div class="stat-grid dashboard-stat-grid">${cards.map(([label,value,icon,tone,href,detail])=>`<a class="stat-card" href="${href}" aria-label="${esc(label)}: ${esc(value)}" title="${esc(value)}"><span class="stat-icon ${tone}"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><span class="stat-content"><span class="label">${esc(label)}</span><strong class="value">${esc(value)}</strong><small class="stat-detail">${esc(detail)}</small></span><i class="stat-arrow fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`).join("")}</div>
  <section class="dashboard-analytics"><article class="panel analytics-panel"><div class="panel-heading"><div><h2>Purchase &amp; Sales Overview</h2><p>Real transaction totals over the selected period.</p></div><div class="chart-panel-actions"><div class="trend-controls" role="group" aria-label="Chart time range">${[["7d","7 days"],["30d","30 days"],["90d","90 days"],["12m","12 months"]].map(([range,label])=>`<button type="button" class="trend-range-button" data-range="${range}" aria-pressed="${range==="12m"}">${label}</button>`).join("")}</div><span class="panel-icon"><i class="fa-solid fa-chart-line" aria-hidden="true"></i></span></div></div><div class="chart-box" id="trend-chart-box"><div class="chart-state" role="status">Loading chart…</div></div></article>
  <article class="panel analytics-panel stock-panel"><div class="panel-heading"><div><h2>Stock Status</h2><p>Product count by current availability.</p></div><span class="panel-icon"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i></span></div><div class="stock-chart-wrap"><div class="stock-donut"><canvas id="stock-status-chart" aria-label="Product stock status distribution"></canvas><div class="donut-center"><strong id="stock-total">0</strong><span>products</span></div></div><div class="stock-status-legend" id="stock-status-legend"></div></div></article></section>
  <section class="dashboard-lower"><article class="panel table-panel"><div class="panel-heading"><div><h2>Recent Purchases</h2><p>Your latest purchase activity.</p></div><a class="view-all-link" href="purchases.html">View all <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div><div class="table-wrap dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>ID</th><th>Date</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody id="recent-purchases-body"></tbody></table></div></article>
  <article class="panel top-products-panel"><div class="panel-heading"><div><h2>Top Products</h2><p>Ranked by units sold.</p></div><span class="panel-icon"><i class="fa-solid fa-ranking-star" aria-hidden="true"></i></span></div><div id="top-products-list"></div></article>
  <article class="panel low-stock-panel"><div class="panel-heading"><div><h2>Low Stock Alerts</h2><p>Products at or below their reorder level.</p></div><span class="alert-count" id="low-stock-count">0</span></div><div id="low-stock-list" aria-live="polite"></div><a class="view-all-link low-stock-view-all" href="inventory.html">View inventory <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></article></section>`;

  const recentBody=area.querySelector("#recent-purchases-body"),recentRows=purchases.slice(0,6);
  recentBody.innerHTML=recentRows.length?recentRows.map(row=>{const date=new Date(row.purchase_date),dateLabel=Number.isNaN(date.getTime())?"—":date.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});return `<tr><td><span class="record-id">#${esc(row.id)}</span></td><td>${dateLabel}</td><td>${esc(row.supplier||"—")}</td><td>${esc(row.product||"—")}</td><td>${(Number(row.quantity)||0).toLocaleString("en-IN")}</td><td>${money(row.total_amount)}</td><td>${purchaseStatusBadge(row.payment_status)}</td><td><button class="icon-button row-delete-button delete-purchase" type="button" data-purchase-id="${esc(row.id)}" aria-label="Delete purchase ${esc(row.id)}" title="Delete purchase"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button></td></tr>`;}).join(""):'<tr><td colspan="8" class="empty-cell">No purchase records found.</td></tr>';
  recentBody.addEventListener("click",event=>{const button=event.target.closest(".delete-purchase");if(button)confirmAndDeletePurchase(button.dataset.purchaseId,button,()=>dashboard());});
  const top=d.topProducts||[],maxUnits=Math.max(...top.map(x=>Number(x.quantity)||0),1);
  area.querySelector("#top-products-list").innerHTML=top.length?`<div class="top-product-list">${top.map((item,index)=>{const amount=Number(item.quantity)||0;return `<div class="top-product-row"><span class="product-rank">${index+1}</span><div class="top-product-info"><div class="top-product-copy"><strong title="${esc(item.name)}">${esc(item.name)}</strong><span>${esc(item.category||"Uncategorized")} · ${amount.toLocaleString("en-IN")} sold</span></div><div class="progress-track"><span style="width:${Math.round(amount/maxUnits*100)}%"></span></div></div></div>`;}).join("")}</div>`:'<div class="empty compact-empty">No sales data available yet.</div>';

  const low=products.filter(x=>(String(x.status||"").toLowerCase()==="active")&&(Number(x.quantity)||0)<=(Number(x.minimum_stock??0)||0)).sort((a,b)=>(Number(a.quantity)||0)-(Number(b.quantity)||0)||String(a.name).localeCompare(String(b.name)));
  area.querySelector("#low-stock-count").textContent=low.length.toLocaleString("en-IN");
  area.querySelector("#low-stock-list").innerHTML=low.length?`<div class="low-stock-list">${low.slice(0,6).map(product=>{const quantity=Number(product.quantity)||0,threshold=Number(product.minimum_stock??0)||0,out=quantity<=0,search=encodeURIComponent(product.sku||product.name||"");return `<a class="low-stock-row" href="products.html?q=${search}"><span class="low-stock-marker ${out?"out":"low"}"><i class="fa-solid ${out?"fa-circle-exclamation":"fa-triangle-exclamation"}" aria-hidden="true"></i></span><span class="low-stock-copy"><strong title="${esc(product.name)}">${esc(product.name)}</strong><small>${esc(product.sku||"No SKU")} · Reorder at ${threshold.toLocaleString("en-IN")}</small></span><span class="low-stock-quantity ${out?"out":"low"}"><strong>${quantity.toLocaleString("en-IN")}</strong><small>${out?"out":"in stock"}</small></span></a>`;}).join("")}</div>${low.length>6?`<p class="low-stock-more">+${(low.length-6).toLocaleString("en-IN")} more in inventory</p>`:""}`:'<div class="empty compact-empty"><span class="empty-icon"><i class="fa-regular fa-circle-check" aria-hidden="true"></i></span><strong>Stock levels look good</strong><span>No active products are below their reorder level.</span></div>';

  let currentRange="12m",requestId=0;
  const loadRange=async range=>{
    currentRange=range;const id=++requestId;
    area.querySelectorAll(".trend-range-button").forEach(button=>{button.setAttribute("aria-pressed",String(button.dataset.range===range));button.disabled=true;});
    if(dashboardTrendChart){dashboardTrendChart.destroy();dashboardChartInstances=dashboardChartInstances.filter(x=>x!==dashboardTrendChart);dashboardTrendChart=null;}
    area.querySelector("#trend-chart-box").innerHTML='<div class="chart-state" role="status"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Loading chart data…</div>';
    try{const result=range==="12m"&&id===1?d:await API.request(`dashboard?range=${encodeURIComponent(range)}`);if(id===requestId)renderDashboardTrend(result,range);}
    catch(error){if(id===requestId)area.querySelector("#trend-chart-box").innerHTML=`<div class="chart-state error" role="status">${esc(error.message||"Chart data could not be loaded.")}<button class="trend-retry" type="button" data-retry-range="${esc(range)}">Retry</button></div>`;}
    finally{area.querySelectorAll(".trend-range-button").forEach(button=>{button.disabled=false;});}
  };
  area.addEventListener("click",event=>{const retry=event.target.closest("[data-retry-range]");if(retry){loadRange(retry.dataset.retryRange);return;}const button=event.target.closest(".trend-range-button");if(button&&!button.disabled&&button.dataset.range!==currentRange)loadRange(button.dataset.range);});

  const styles=getComputedStyle(document.body),stockColor=name=>styles.getPropertyValue(name).trim();
  const counts=[{label:"In Stock",color:stockColor("--dashboard-success"),count:0},{label:"Low Stock",color:stockColor("--dashboard-warning"),count:0},{label:"Out of Stock",color:stockColor("--dashboard-error"),count:0},{label:"Inactive",color:stockColor("--dashboard-muted"),count:0}];
  for(const product of products){const quantity=Number(product.quantity)||0,minimum=Number(product.minimum_stock??0)||0,index=String(product.status||"").toLowerCase()!=="active"?3:quantity<=0?2:quantity<=minimum?1:0;counts[index].count++;}
  const total=counts.reduce((sum,item)=>sum+item.count,0);area.querySelector("#stock-total").textContent=total.toLocaleString("en-IN");
  area.querySelector("#stock-status-legend").innerHTML=counts.map(item=>{const pct=total?Math.round(item.count/total*100):0;return `<div class="stock-legend-row"><span class="stock-legend-label"><i style="--legend-color:${item.color}"></i>${item.label}</span><strong>${item.count.toLocaleString("en-IN")}<small>${pct}%</small></strong></div>`;}).join("");
  if(total&&typeof Chart==="function"){
    try{dashboardChartInstances.push(new Chart(area.querySelector("#stock-status-chart"),{type:"doughnut",data:{labels:counts.map(x=>x.label),datasets:[{data:counts.map(x=>x.count),backgroundColor:counts.map(x=>x.color),borderColor:stockColor("--dashboard-card"),borderWidth:3,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"74%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${Number(c.raw).toLocaleString("en-IN")} (${Math.round(c.raw/total*100)}%)`}}}}}));}
    catch{area.querySelector(".stock-donut").insertAdjacentHTML("beforeend",'<div class="stock-chart-empty">Chart unavailable.</div>');}
  }else area.querySelector(".stock-donut").insertAdjacentHTML("beforeend",`<div class="stock-chart-empty">${total?"Chart unavailable.":"No products to classify."}</div>`);
  await loadRange("12m");
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

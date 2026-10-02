const nav = [
  ["dashboard", "Dashboard"],
  ["products", "Products"],
  ["categories", "Categories"],
  ["suppliers", "Suppliers"],
  ["customers", "Customers"],
  ["purchases", "Purchases"],
  ["sales", "Sales"],
  ["inventory", "Inventory"],
  ["warehouses", "Warehouses"],
  ["orders", "Orders"],
  ["stock-movements", "Stock Movements"],
  ["reports", "Reports"],
  ["profile", "Profile"],
  ["settings", "Settings"],
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
function toast(s) {
  let x = document.createElement("div");
  x.className = "toast";
  x.textContent = s;
  document.body.append(x);
  setTimeout(() => x.remove(), 2800);
}
function shell(title) {
  let u = JSON.parse(localStorage.getItem("user") || "{}");
  document.getElementById("app").innerHTML =
    `<aside class="sidebar"><div class="brand"><b class="brand-mark">S</b><span>Stockwise</span></div><div class="nav-label">WORKSPACE</div>${nav.map(([id, n]) => `<a class="nav-link ${page === id ? "active" : ""}" href="${id === "dashboard" ? "dashboard.html" : id + ".html"}"><i class="fa-solid fa-circle"></i><span>${n}</span></a>`).join("")}<div class="side-foot">Inventory & Supply Chain</div></aside><main class="main"><header class="topbar"><strong class="top-title">${title}</strong><div class="top-actions"><span>${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date())}</span><i class="fa-regular fa-bell"></i><span>${esc(u.name || "Admin")}</span><button class="button" onclick="API.logout()">Log out</button></div></header><section class="content" id="content"></section></main>`;
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
  await render();
}
async function dashboard() {
  shell("Dashboard");
  let d = await API.request("dashboard"),
    s = d.stats,
    area = document.querySelector("#content");
  area.innerHTML = `<div class="page-head"><div><h1>Good day, ${esc(JSON.parse(localStorage.getItem("user") || "{}").name || "Admin")}</h1><div class="muted">Here is your inventory overview.</div></div></div><div class="stat-grid">${[
    ["Total Products", s.totalProducts],
    ["Total Stock", s.totalStock],
    ["Low Stock", s.lowStock],
    ["Out of Stock", s.outOfStock],
    ["Suppliers", s.totalSuppliers],
    ["Customers", s.totalCustomers],
    ["Purchases", money(s.totalPurchases)],
    ["Sales", money(s.totalSales)],
    ["Revenue", money(s.revenue)],
    ["Inventory Value", money(s.inventoryValue)],
  ]
    .map(
      ([l, v]) =>
        `<div class="stat-card"><div class="label">${l}</div><div class="value">${v}</div></div>`,
    )
    .join(
      "",
    )}</div><div class="chart-grid"><div class="panel"><h3>Monthly Sales & Purchases</h3><div class="chart-box"><canvas id="trend"></canvas></div></div><div class="panel"><h3>Top Selling Products</h3><div class="chart-box"><canvas id="top"></canvas></div></div><div class="panel"><h3>Stock by Category</h3><div class="chart-box"><canvas id="cats"></canvas></div></div><div class="panel"><h3>Stock alerts</h3>${d.notifications.length ? d.notifications.map((n) => `<p>${esc(n.message)}</p>`).join("") : '<p class="muted">No stock alerts.</p>'}</div></div>`;
  const months = [
    ...new Set([...d.monthlySales, ...d.monthlyPurchases].map((x) => x.month)),
  ].sort();
  new Chart(document.querySelector("#trend"), {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Sales",
          data: months.map(
            (m) => d.monthlySales.find((x) => x.month === m)?.total || 0,
          ),
          borderColor: "#3767e8",
        },
        {
          label: "Purchases",
          data: months.map(
            (m) => d.monthlyPurchases.find((x) => x.month === m)?.total || 0,
          ),
          borderColor: "#22a477",
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
  new Chart(document.querySelector("#top"), {
    type: "bar",
    data: {
      labels: d.topProducts.map((x) => x.name),
      datasets: [
        {
          label: "Units",
          data: d.topProducts.map((x) => x.quantity),
          backgroundColor: "#6284f1",
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: "y" },
  });
  new Chart(document.querySelector("#cats"), {
    type: "doughnut",
    data: {
      labels: d.categories.map((x) => x.name),
      datasets: [{ data: d.categories.map((x) => x.quantity) }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
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
    a.innerHTML = `<div class="page-head"><div><h1>${title}</h1><div class="muted">${isSale ? "Record sales and reduce stock." : "Record purchases and receive stock."}</div></div><button id="add" class="button primary">+ New ${isSale ? "Sale" : "Purchase"}</button></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>${isSale ? "Customer" : "Supplier"}</th><th>Product</th><th>Quantity</th><th>Total</th><th>Date</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.id}</td><td>${esc(r.customer || r.supplier)}</td><td>${esc(r.product)}</td><td>${r.quantity}</td><td>${money(r.total_amount)}</td><td>${new Date(r.sale_date || r.purchase_date).toLocaleDateString()}</td></tr>`).join("")}</tbody></table></div>`;
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

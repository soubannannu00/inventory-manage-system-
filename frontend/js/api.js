const API_BASE = "http://localhost:3000";

const API = {
  token: localStorage.getItem("token"),

  async request(path, options = {}) {
    const r = await fetch(`${API_BASE}/api/${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.token
          ? { Authorization: "Bearer " + this.token }
          : {}),
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await r.json();
    } catch {}

    if (r.status === 401) {
      localStorage.removeItem("token");

      if (
        !location.pathname.endsWith("index.html") &&
        location.pathname !== "/"
      ) {
        location.href = "index.html";
      }
    }

    if (!r.ok) {
      throw Error(data.error || "Request failed");
    }

    return data;
  },

  login: async (email, password) => {
    const x = await API.request("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    API.token = x.token;

    localStorage.setItem("token", x.token);
    localStorage.setItem("user", JSON.stringify(x.user));

    location.href = "dashboard.html";
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    location.href = "index.html";
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const f = document.getElementById("loginForm");

  if (f) {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();

      const b = f.querySelector("button");
      b.disabled = true;

      try {
        await API.login(f.email.value, f.password.value);
      } catch (err) {
        document.getElementById("loginError").textContent = err.message;
        b.disabled = false;
      }
    });
  }
});
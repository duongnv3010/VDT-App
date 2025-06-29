// SỬA: dùng đường dẫn tương đối (relative path) thay vì IP cứng
const apiBase = ""; // hoặc bạn có thể dùng window.location.origin

let token = localStorage.getItem("token") || "";

// Elements
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const signupBtn = document.getElementById("signup-btn");
const loginMessage = document.getElementById("login-message");
const logoutBtn = document.getElementById("logout-btn");
const studentList = document.getElementById("student-list");
const studentForm = document.getElementById("student-form");
const formTitle = document.getElementById("form-title");
const cancelBtn = document.getElementById("cancel-btn");
const formMessage = document.getElementById("form-message");

// Initialize view
function init() {
  if (token) showApp();
  else showLogin();
}

function showLogin() {
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
}
function showApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  fetchStudents();
}

// Auth handlers
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    const res = await fetch(`${apiBase}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      token = data.token;
      localStorage.setItem("token", token);
      showApp();
    } else {
      loginMessage.textContent = data.message || "Login failed";
    }
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "Server error";
  }
});

signupBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    const res = await fetch(`${apiBase}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    loginMessage.textContent = data.message || "Signup done";
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "Server error";
  }
});

logoutBtn.addEventListener("click", () => {
  token = "";
  localStorage.removeItem("token");
  showLogin();
});

// CRUD Functionality
async function fetchStudents() {
  try {
    const res = await fetch(`${apiBase}/students`, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) throw new Error("Fetch failed");
    const list = await res.json();
    // Decode JWT để lấy role
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role = payload.role;
    renderList(list, role);
  } catch (err) {
    console.error(err);
  }
}

function renderList(list, role) {
  if (!Array.isArray(list)) return;
  let html =
    "<table><tr><th>Name</th><th>DOB</th><th>School</th><th>Actions</th></tr>";
  list.forEach((s) => {
    html += `<tr>
        <td>${s.name}</td>
        <td>${s.dob}</td>
       <td>${s.school}</td>
       <td>${
         role === "admin"
           ? `<button onclick="editStudent(${s.id}, '${s.name}', '${s.dob}', '${s.school}')">Edit</button>
               <button onclick="deleteStudent(${s.id})">Delete</button>`
           : "—"
       }</td>
      </tr>`;
  });
  html += "</table>";
  studentList.innerHTML = html;
  if (role !== "admin") {
    studentForm.classList.add("hidden");
  } else {
    studentForm.classList.remove("hidden");
  }
}

studentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("student-id").value;
  const payload = {
    name: document.getElementById("name").value,
    dob: document.getElementById("dob").value,
    school: document.getElementById("school").value,
  };
  const url = `${apiBase}/students${id ? `/${id}` : ""}`;
  const method = id ? "PUT" : "POST";
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    formMessage.textContent = data.message || (id ? "Updated" : "Created");
    resetForm();
    fetchStudents();
  } catch (err) {
    console.error(err);
    formMessage.textContent = "Server error";
  }
});

function editStudent(id, name, dob, school) {
  document.getElementById("student-id").value = id;
  document.getElementById("name").value = name;
  document.getElementById("dob").value = new Date(dob)
    .toISOString()
    .split("T")[0];
  document.getElementById("school").value = school;
  formTitle.textContent = "Edit Student";
  cancelBtn.classList.remove("hidden");
}

cancelBtn.addEventListener("click", resetForm);

function resetForm() {
  document.getElementById("student-id").value = "";
  studentForm.reset();
  formTitle.textContent = "Add New Student";
  cancelBtn.classList.add("hidden");
  formMessage.textContent = "";
}

async function deleteStudent(id) {
  if (!confirm("Are you sure?")) return;
  try {
    const res = await fetch(`${apiBase}/students/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    if (res.ok) fetchStudents();
  } catch (err) {
    console.error(err);
  }
}

window.onload = init;

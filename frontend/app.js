const { createApp, reactive, computed, onMounted } = Vue;


const API_BASE_URL = "http://localhost:5000";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers["Authentication-Token"] = token;
  }
  return config;
});

const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Other",
];


createApp({
  setup() {
    const state = reactive({
      view: localStorage.getItem("auth_token") ? "dashboard" : "login",
      email: "",
      loading: false,
      error: "",

   
      loginForm: { email: "", password: "" },
      registerForm: { email: "", password: "", password_confirm: "" },


      expenses: [],
      total: 0,
      categories: CATEGORIES,
      filterCategory: "",

      expenseForm: emptyExpenseForm(),
      editingId: null,
    });

    function emptyExpenseForm() {
      return {
        title: "",
        amount: "",
        category: "Other",
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      };
    }


    async function login() {
      state.error = "";
      state.loading = true;
      try {
        const res = await api.post("/login", {
          email: state.loginForm.email,
          password: state.loginForm.password,
        });
        const token = res.data?.response?.user?.authentication_token;
        if (!token) throw new Error("No token returned");
        localStorage.setItem("auth_token", token);
        state.email = res.data.response.user.email;
        state.view = "dashboard";
        await loadExpenses();
      } catch (err) {
        state.error = extractError(err, "Login failed. Check your credentials.");
      } finally {
        state.loading = false;
      }
    }

    async function register() {
      state.error = "";
      if (state.registerForm.password !== state.registerForm.password_confirm) {
        state.error = "Passwords do not match.";
        return;
      }
      state.loading = true;
      try {
        await api.post("/register", {
          email: state.registerForm.email,
          password: state.registerForm.password,
          password_confirm: state.registerForm.password_confirm,
        });

        state.loginForm.email = state.registerForm.email;
        state.loginForm.password = state.registerForm.password;
        await login();
      } catch (err) {
        state.error = extractError(err, "Registration failed.");
      } finally {
        state.loading = false;
      }
    }

    async function logout() {
      try {
        await api.get("/logout");
      } catch (e) {

      }
      localStorage.removeItem("auth_token");
      state.expenses = [];
      state.view = "login";
    }


    async function loadExpenses() {
      state.loading = true;
      state.error = "";
      try {
        const params = {};
        if (state.filterCategory) params.category = state.filterCategory;
        const res = await api.get("/api/expenses", { params });
        state.expenses = res.data.expenses;
        state.total = res.data.total;
      } catch (err) {
        state.error = extractError(err, "Could not load expenses.");
        if (err.response && err.response.status === 401) {
          logout();
        }
      } finally {
        state.loading = false;
      }
    }

    async function saveExpense() {
      state.error = "";
      if (!state.expenseForm.title || !state.expenseForm.amount) {
        state.error = "Title and amount are required.";
        return;
      }
      try {
        if (state.editingId) {
          await api.put(`/api/expenses/${state.editingId}`, state.expenseForm);
        } else {
          await api.post("/api/expenses", state.expenseForm);
        }
        state.expenseForm = emptyExpenseForm();
        state.editingId = null;
        await loadExpenses();
      } catch (err) {
        state.error = extractError(err, "Could not save expense.");
      }
    }

    function editExpense(expense) {
      state.editingId = expense.id;
      state.expenseForm = {
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        notes: expense.notes || "",
      };
    }

    function cancelEdit() {
      state.editingId = null;
      state.expenseForm = emptyExpenseForm();
    }

    async function deleteExpense(id) {
      if (!confirm("Delete this expense?")) return;
      try {
        await api.delete(`/api/expenses/${id}`);
        await loadExpenses();
      } catch (err) {
        state.error = extractError(err, "Could not delete expense.");
      }
    }

    function extractError(err, fallback) {
      return err?.response?.data?.error || err?.response?.data?.message || fallback;
    }

    onMounted(() => {
      if (state.view === "dashboard") {
        loadExpenses();
      }
    });

    return {
      state,
      login,
      register,
      logout,
      loadExpenses,
      saveExpense,
      editExpense,
      cancelEdit,
      deleteExpense,
    };
  },

  template: `
  <div class="app-shell">
    <header class="topbar" v-if="state.view === 'dashboard'">
      <h1>💰 Expense Tracker</h1>
      <button class="link-btn" @click="logout">Log out</button>
    </header>

    <main class="container">
      <p v-if="state.error" class="error-banner">{{ state.error }}</p>

      <!-- LOGIN -->
      <section v-if="state.view === 'login'" class="auth-card">
        <h2>Log in</h2>
        <form @submit.prevent="login">
          <label>Email</label>
          <input type="email" v-model="state.loginForm.email" required />
          <label>Password</label>
          <input type="password" v-model="state.loginForm.password" required />
          <button type="submit" :disabled="state.loading">
            {{ state.loading ? 'Logging in…' : 'Log in' }}
          </button>
        </form>
        <p class="switch-link">
          No account? <a href="#" @click.prevent="state.view = 'register'">Register</a>
        </p>
      </section>

      <!-- REGISTER -->
      <section v-else-if="state.view === 'register'" class="auth-card">
        <h2>Create account</h2>
        <form @submit.prevent="register">
          <label>Email</label>
          <input type="email" v-model="state.registerForm.email" required />
          <label>Password</label>
          <input type="password" v-model="state.registerForm.password" required />
          <label>Confirm password</label>
          <input type="password" v-model="state.registerForm.password_confirm" required />
          <button type="submit" :disabled="state.loading">
            {{ state.loading ? 'Creating…' : 'Register' }}
          </button>
        </form>
        <p class="switch-link">
          Already have an account? <a href="#" @click.prevent="state.view = 'login'">Log in</a>
        </p>
      </section>

      <!-- DASHBOARD -->
      <section v-else class="dashboard">
        <div class="summary-card">
          <span>Total spent</span>
          <strong>₹{{ state.total.toFixed(2) }}</strong>
        </div>

        <div class="expense-form-card">
          <h3>{{ state.editingId ? 'Edit expense' : 'Add expense' }}</h3>
          <form @submit.prevent="saveExpense" class="expense-form">
            <input placeholder="Title" v-model="state.expenseForm.title" required />
            <input placeholder="Amount" type="number" step="0.01" v-model="state.expenseForm.amount" required />
            <select v-model="state.expenseForm.category">
              <option v-for="c in state.categories" :key="c" :value="c">{{ c }}</option>
            </select>
            <input type="date" v-model="state.expenseForm.date" />
            <input placeholder="Notes (optional)" v-model="state.expenseForm.notes" />
            <div class="form-actions">
              <button type="submit">{{ state.editingId ? 'Update' : 'Add' }}</button>
              <button type="button" class="secondary" v-if="state.editingId" @click="cancelEdit">Cancel</button>
            </div>
          </form>
        </div>

        <div class="filter-bar">
          <label>Filter by category:</label>
          <select v-model="state.filterCategory" @change="loadExpenses">
            <option value="">All</option>
            <option v-for="c in state.categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <table class="expense-table" v-if="state.expenses.length">
          <thead>
            <tr>
              <th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in state.expenses" :key="e.id">
              <td>{{ e.date }}</td>
              <td>{{ e.title }}</td>
              <td><span class="badge">{{ e.category }}</span></td>
              <td>₹{{ e.amount.toFixed(2) }}</td>
              <td>{{ e.notes }}</td>
              <td class="row-actions">
                <button class="icon-btn" @click="editExpense(e)">Edit</button>
                <button class="icon-btn danger" @click="deleteExpense(e.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-state">No expenses yet — add your first one above.</p>
      </section>
    </main>
  </div>
  `,
}).mount("#app");

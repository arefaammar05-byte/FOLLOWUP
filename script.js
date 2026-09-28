"use strict";

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = "https://yjuwwtdoiwiyjtbajnls.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_HbXClZksRhtYGIEklIipEg_octlae2G";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   APP STATE
========================================================= */

let customers = [];
let currentProfileId = null;


/* =========================================================
   AUTHENTICATION
========================================================= */

async function checkAuth() {
    const loadingScreen = document.getElementById("loadingScreen");
    const loginScreen = document.getElementById("loginScreen");
    const app = document.getElementById("app");

    try {
        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (session) {
            loginScreen.classList.add("hidden");
            app.style.display = "";
        } else {
            loginScreen.classList.remove("hidden");
            app.style.display = "none";
        }
    } catch (error) {
        console.error("Authentication error:", error);

        loginScreen.classList.remove("hidden");
        app.style.display = "none";
    } finally {
        if (loadingScreen) {
            loadingScreen.classList.add("hidden");
        }
    }
}


async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorBox = document.getElementById("loginError");
    const loginButton = document.querySelector(".login-btn");

    errorBox.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        errorBox.textContent = "Incorrect email or password.";
        loginButton.disabled = false;
        loginButton.textContent = "Login";
        return;
    }

    document.getElementById("loginForm").reset();

    await startApp();

    loginButton.disabled = false;
    loginButton.textContent = "Login";
}


async function loginWithGoogle() {
    const errorBox = document.getElementById("loginError");

    errorBox.textContent = "";

    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: "https://arefaammar05-byte.github.io/FOLLOWUP/",
            queryParams: {
                prompt: "select_account"
            }
        }
    });

    if (error) {
        errorBox.textContent = error.message;
    }
}


async function logout() {
    await supabaseClient.auth.signOut();

    customers = [];
    currentProfileId = null;

    document.getElementById("app").style.display = "none";

    document
        .getElementById("loginScreen")
        .classList.remove("hidden");

    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginError").textContent = "";
}


/* =========================================================
   START APP
========================================================= */

async function startApp() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        return;
    }

    document
        .getElementById("loginScreen")
        .classList.add("hidden");

    document.getElementById("app").style.display = "";

    await loadCustomers();

    setupNavigation();
    setupSearch();
    renderAll();
}


/* =========================================================
   LOAD CUSTOMERS
========================================================= */

async function loadCustomers() {
    const {
        data,
        error
    } = await supabaseClient
        .from("customers")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error("Could not load customers:", error);
        customers = [];
        return;
    }

    customers = data || [];
}


/* =========================================================
   CUSTOMER DATABASE
========================================================= */

async function createCustomer(customerData) {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        return null;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("customers")
        .insert({
            user_id: user.id,
            name: customerData.name,
            contact: customerData.contact,
            service: customerData.service,
            total: customerData.total,
            paid: customerData.paid,
            payment_due: customerData.paymentDue || null,
            follow_up: customerData.followUp || null,
            follow_up_done: false,
            status: customerData.status
        })
        .select()
        .single();

    if (error) {
        console.error("Could not create customer:", error);
        alert("Could not save customer. Please try again.");
        return null;
    }

    return data;
}


async function updateCustomerInDatabase(id, customerData) {
    const {
        data,
        error
    } = await supabaseClient
        .from("customers")
        .update({
            name: customerData.name,
            contact: customerData.contact,
            service: customerData.service,
            total: customerData.total,
            paid: customerData.paid,
            payment_due: customerData.paymentDue || null,
            follow_up: customerData.followUp || null,
            status: customerData.status
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Could not update customer:", error);
        alert("Could not update customer. Please try again.");
        return null;
    }

    return data;
}


/* =========================================================
   MONEY
========================================================= */

function money(amount) {
    const value = Number(amount) || 0;

    return "Rs. " + value.toLocaleString("en-LK", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}


function getPaid(customer) {
    return Number(customer.paid) || 0;
}


function getOwed(customer) {
    const total = Number(customer.total) || 0;
    const paid = getPaid(customer);

    return Math.max(0, total - paid);
}


/* =========================================================
   DATES
========================================================= */

function todayString() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}


function formatDate(dateString) {
    if (!dateString) {
        return "—";
    }

    const date = new Date(dateString + "T00:00:00");

    if (isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-LK", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


/* =========================================================
   SECURITY
========================================================= */

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(function(item) {
        item.addEventListener("click", function() {
            const section = item.getAttribute("data-section");

            showSection(section);

            const sidebar = document.querySelector(".sidebar");

            if (sidebar) {
                sidebar.classList.remove("mobile-open");
            }
        });
    });

    const goButtons = document.querySelectorAll("[data-go]");

    goButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const section = button.getAttribute("data-go");

            showSection(section);
        });
    });
}


function showSection(section) {
    const sections = document.querySelectorAll(".page-section");

    sections.forEach(function(item) {
        item.classList.remove("active");
        item.style.display = "none";
    });

    const target = document.getElementById(section + "Section");

    if (target) {
        target.classList.add("active");
        target.style.display = "";
    }

    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(function(item) {
        item.classList.remove("active");

        if (item.getAttribute("data-section") === section) {
            item.classList.add("active");
        }
    });

    const titles = {
        dashboard: {
            title: "Dashboard",
            subtitle: "Here's what's happening with your business."
        },

        customers: {
            title: "Customers",
            subtitle: "Manage your customers and their payments."
        },

        payments: {
            title: "Payments",
            subtitle: "Track money received and outstanding."
        },

        followups: {
            title: "Follow-ups",
            subtitle: "Keep track of customers who need attention."
        }
    };

    if (titles[section]) {
        document.getElementById("pageTitle").textContent =
            titles[section].title;

        document.getElementById("pageSubtitle").textContent =
            titles[section].subtitle;
    }
}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {
    const search = document.getElementById("customerSearch");

    if (!search) {
        return;
    }

    search.addEventListener("input", function() {
        renderCustomers(search.value);
    });
}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {
    renderDashboard();
    renderCustomers();
    renderPayments();
    renderFollowups();
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOwed = 0;

    customers.forEach(function(customer) {
        totalInvoiced += Number(customer.total) || 0;
        totalPaid += getPaid(customer);
        totalOwed += getOwed(customer);
    });

    document.getElementById("totalCustomers").textContent =
        customers.length;

    document.getElementById("moneyOwed").textContent =
        money(totalOwed);

    document.getElementById("totalPaid").textContent =
        money(totalPaid);

    document.getElementById("totalInvoiced").textContent =
        money(totalInvoiced);

    document.getElementById("overviewPaid").textContent =
        money(totalPaid);

    document.getElementById("overviewOwed").textContent =
        money(totalOwed);

    const today = todayString();

    const todayCustomers = customers.filter(function(customer) {
        return (
            customer.follow_up === today &&
            !customer.follow_up_done
        );
    });

    document.getElementById("todayCustomers").textContent =
        todayCustomers.length;

    renderTodayList(todayCustomers);
    renderRecentCustomers();
}


/* =========================================================
   TODAY LIST
========================================================= */

function renderTodayList(list) {
    const container = document.getElementById("todayList");

    if (!container) {
        return;
    }

    if (list.length === 0) {
        container.innerHTML =
            '<div class="empty-inline">No follow-ups for today.</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(function(customer) {
        const item = document.createElement("div");

        item.className = "today-item";

        item.innerHTML =
            '<div class="item-main">' +
            "<strong>" +
            escapeHtml(customer.name) +
            "</strong>" +
            "<span>" +
            escapeHtml(customer.service || "Customer") +
            "</span>" +
            "</div>" +
            '<div class="item-right">' +
            "<strong>" +
            money(getOwed(customer)) +
            "</strong>" +
            "<span>owed</span>" +
            "</div>";

        item.addEventListener("click", function() {
            openProfile(customer.id);
        });

        container.appendChild(item);
    });
}


/* =========================================================
   RECENT CUSTOMERS
========================================================= */

function renderRecentCustomers() {
    const container = document.getElementById("recentCustomers");

    if (!container) {
        return;
    }

    if (customers.length === 0) {
        container.innerHTML =
            '<div class="empty-inline">No customers yet.</div>';
        return;
    }

    const recent = customers.slice(0, 5);

    container.innerHTML = "";

    recent.forEach(function(customer) {
        const item = document.createElement("div");

        item.className = "recent-item";

        item.innerHTML =
            '<div class="item-main">' +
            "<strong>" +
            escapeHtml(customer.name) +
            "</strong>" +
            "<span>" +
            escapeHtml(customer.service || "Customer") +
            "</span>" +
            "</div>" +
            '<div class="item-right">' +
            "<strong>" +
            money(getOwed(customer)) +
            "</strong>" +
            "<span>owed</span>" +
            "</div>";

        item.addEventListener("click", function() {
            openProfile(customer.id);
        });

        container.appendChild(item);
    });
}


/* =========================================================
   CUSTOMERS
========================================================= */

function renderCustomers(searchTerm = "") {
    const container = document.getElementById("fullCustomerList");
    const empty = document.getElementById("customerEmpty");

    if (!container || !empty) {
        return;
    }

    const term = searchTerm.trim().toLowerCase();

    const filtered = customers.filter(function(customer) {
        return (
            String(customer.name || "")
            .toLowerCase()
            .includes(term) ||

            String(customer.contact || "")
            .toLowerCase()
            .includes(term) ||

            String(customer.service || "")
            .toLowerCase()
            .includes(term)
        );
    });

    container.innerHTML = "";

    if (filtered.length === 0) {
        empty.style.display = "";
        return;
    }

    empty.style.display = "none";

    filtered.forEach(function(customer) {
        const card = document.createElement("div");

        card.className = "customer-card";

        card.innerHTML =
            '<div class="customer-card-top">' +
            "<div>" +
            "<h3>" +
            escapeHtml(customer.name) +
            "</h3>" +
            '<div class="customer-service">' +
            escapeHtml(customer.service || "No service") +
            "</div>" +
            "</div>" +

            '<span class="status-badge status-' +
            escapeHtml(customer.status || "waiting") +
            '">' +
            escapeHtml(customer.status || "waiting") +
            "</span>" +

            "</div>" +

            '<div class="customer-contact">' +
            escapeHtml(customer.contact || "No contact") +
            "</div>" +

            '<div class="customer-financials">' +

            "<div>" +
            "<span>Total</span>" +
            "<strong>" +
            money(customer.total) +
            "</strong>" +
            "</div>" +

            "<div>" +
            "<span>Paid</span>" +
            "<strong>" +
            money(getPaid(customer)) +
            "</strong>" +
            "</div>" +

            "<div>" +
            "<span>Owed</span>" +
            '<strong class="customer-owed">' +
            money(getOwed(customer)) +
            "</strong>" +
            "</div>" +

            "</div>" +

            '<div class="customer-card-actions">' +

            '<button class="secondary-btn view-btn">' +
            "View Profile" +
            "</button>" +

            '<button class="secondary-btn payment-btn">' +
            "Payment" +
            "</button>" +

            '<button class="danger-btn delete-btn">' +
            "Delete" +
            "</button>" +

            "</div>";

        card.querySelector(".view-btn").addEventListener(
            "click",
            function() {
                openProfile(customer.id);
            }
        );

        card.querySelector(".payment-btn").addEventListener(
            "click",
            function() {
                openPaymentModal(customer.id);
            }
        );

        card.querySelector(".delete-btn").addEventListener(
            "click",
            function() {
                deleteCustomer(customer.id);
            }
        );

        container.appendChild(card);
    });
}


/* =========================================================
   CUSTOMER MODAL
========================================================= */

function openCustomerModal(customerId = null) {
    const modal = document.getElementById("customerModal");
    const form = document.getElementById("customerForm");

    form.reset();

    document.getElementById("customerId").value = "";

    document.getElementById("customerModalTitle").textContent =
        "Add Customer";

    document.getElementById("customerStatus").value =
        "waiting";

    if (customerId) {
        const customer = customers.find(function(item) {
            return item.id === customerId;
        });

        if (!customer) {
            return;
        }

        document.getElementById("customerModalTitle").textContent =
            "Edit Customer";

        document.getElementById("customerId").value =
            customer.id;

        document.getElementById("customerName").value =
            customer.name || "";

        document.getElementById("customerContact").value =
            customer.contact || "";

        document.getElementById("customerService").value =
            customer.service || "";

        document.getElementById("customerTotal").value =
            customer.total || 0;

        document.getElementById("customerPaid").value =
            getPaid(customer);

        document.getElementById("paymentDue").value =
            customer.payment_due || "";

        document.getElementById("followUpDate").value =
            customer.follow_up || "";

        document.getElementById("customerStatus").value =
            customer.status || "waiting";
    }

    modal.style.display = "flex";
    modal.classList.add("active");

    document.getElementById("customerName").focus();
}


function closeCustomerModal() {
    const modal = document.getElementById("customerModal");

    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }
}


async function handleCustomerSubmit(event) {
    event.preventDefault();

    const id = document.getElementById("customerId").value.trim();

    const name = document.getElementById("customerName").value.trim();

    const contact =
        document.getElementById("customerContact").value.trim();

    const service =
        document.getElementById("customerService").value.trim();

    const total =
        Number(document.getElementById("customerTotal").value) || 0;

    const paid =
        Number(document.getElementById("customerPaid").value) || 0;

    const paymentDue =
        document.getElementById("paymentDue").value;

    const followUp =
        document.getElementById("followUpDate").value;

    const status =
        document.getElementById("customerStatus").value;

    if (!name) {
        alert("Please enter the customer name.");
        return;
    }

    if (total < 0 || paid < 0) {
        alert("Amounts cannot be negative.");
        return;
    }

    if (paid > total) {
        alert(
            "Amount paid cannot be greater than the total amount."
        );
        return;
    }

    const customerData = {
        name,
        contact,
        service,
        total,
        paid,
        paymentDue,
        followUp,
        status
    };

    let savedCustomer;

    if (id) {
        savedCustomer = await updateCustomerInDatabase(
            id,
            customerData
        );
    } else {
        savedCustomer = await createCustomer(customerData);
    }

    if (!savedCustomer) {
        return;
    }

    await loadCustomers();
    renderAll();
    closeCustomerModal();
}


/* =========================================================
   PROFILE
========================================================= */

function openProfile(customerId) {
    const customer = customers.find(function(item) {
        return item.id === customerId;
    });

    if (!customer) {
        return;
    }

    currentProfileId = customerId;

    document.getElementById("profileName").textContent =
        customer.name || "Customer";

    document.getElementById("profileService").textContent =
        customer.service || "No service added";

    document.getElementById("profileTotal").textContent =
        money(customer.total);

    document.getElementById("profilePaid").textContent =
        money(getPaid(customer));

    document.getElementById("profileOwed").textContent =
        money(getOwed(customer));

    document.getElementById("profileContact").textContent =
        customer.contact || "—";

    document.getElementById("profileStatus").textContent =
        customer.status || "—";

    document.getElementById("profilePaymentDue").textContent =
        formatDate(customer.payment_due);

    document.getElementById("profileFollowUp").textContent =
        formatDate(customer.follow_up);

    renderPaymentHistory(customer);

    const followupButton =
        document.getElementById("profileFollowupBtn");

    if (customer.follow_up_done) {
        followupButton.textContent = "Follow-up Done";
        followupButton.disabled = true;
    } else if (customer.follow_up) {
        followupButton.textContent = "Mark Follow-up Done";
        followupButton.disabled = false;
    } else {
        followupButton.textContent = "No Follow-up";
        followupButton.disabled = true;
    }

    const modal = document.getElementById("profileModal");

    modal.style.display = "flex";
    modal.classList.add("active");
}


function closeProfileModal() {
    const modal = document.getElementById("profileModal");

    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }

    currentProfileId = null;
}


/* =========================================================
   PAYMENT HISTORY
========================================================= */

function renderPaymentHistory(customer) {
    const container = document.getElementById("paymentHistory");

    if (!container) {
        return;
    }

    if (getPaid(customer) <= 0) {
        container.innerHTML =
            '<div class="empty-inline">No payments recorded yet.</div>';
        return;
    }

    container.innerHTML =
        '<div class="profile-history-item">' +
        "<div>" +
        "<strong>" +
        money(getPaid(customer)) +
        "</strong>" +
        "<span>Total payments received</span>" +
        "</div>" +
        "<span>Current</span>" +
        "</div>";
}


/* =========================================================
   PAYMENT MODAL
========================================================= */

function openPaymentModal(customerId) {
    const customer = customers.find(function(item) {
        return item.id === customerId;
    });

    if (!customer) {
        return;
    }

    document.getElementById("paymentCustomerId").value =
        customer.id;

    document.getElementById("paymentCustomerName").textContent =
        customer.name;

    document.getElementById("paymentAmount").value = "";
    document.getElementById("paymentNote").value = "";

    const modal = document.getElementById("paymentModal");

    modal.style.display = "flex";
    modal.classList.add("active");
}


function closePaymentModal() {
    const modal = document.getElementById("paymentModal");

    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }
}


async function handlePaymentSubmit(event) {
    event.preventDefault();

    const customerId =
        document.getElementById("paymentCustomerId").value;

    const amount =
        Number(document.getElementById("paymentAmount").value) || 0;

    const customer = customers.find(function(item) {
        return item.id === customerId;
    });

    if (!customer) {
        return;
    }

    if (amount <= 0) {
        alert("Please enter a valid payment amount.");
        return;
    }

    if (amount > getOwed(customer)) {
        alert(
            "Payment cannot be greater than the amount owed."
        );
        return;
    }

    const newPaid = getPaid(customer) + amount;

    const { error } = await supabaseClient
        .from("customers")
        .update({
            paid: newPaid
        })
        .eq("id", customer.id);

    if (error) {
        console.error("Payment error:", error);
        alert(
            "Could not record payment. Please try again."
        );
        return;
    }

    await loadCustomers();
    renderAll();

    closePaymentModal();

    if (currentProfileId === customer.id) {
        openProfile(customer.id);
    }
}


/* =========================================================
   EDIT
========================================================= */

function editCurrentCustomer() {
    if (!currentProfileId) {
        return;
    }

    const id = currentProfileId;

    closeProfileModal();
    openCustomerModal(id);
}


/* =========================================================
   DELETE
========================================================= */

async function deleteCustomer(customerId) {
    const customer = customers.find(function(item) {
        return item.id === customerId;
    });

    if (!customer) {
        return;
    }

    const confirmed = confirm(
        "Delete " +
        customer.name +
        "? This cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    const { error } = await supabaseClient
        .from("customers")
        .delete()
        .eq("id", customerId);

    if (error) {
        console.error("Delete error:", error);
        alert("Could not delete customer.");
        return;
    }

    await loadCustomers();
    renderAll();
}


function deleteCurrentCustomer() {
    if (!currentProfileId) {
        return;
    }

    const id = currentProfileId;

    closeProfileModal();
    deleteCustomer(id);
}


/* =========================================================
   FOLLOW-UPS
========================================================= */

async function markCurrentFollowupDone() {
    if (!currentProfileId) {
        return;
    }

    const customer = customers.find(function(item) {
        return item.id === currentProfileId;
    });

    if (!customer || !customer.follow_up) {
        return;
    }

    const { error } = await supabaseClient
        .from("customers")
        .update({
            follow_up_done: true
        })
        .eq("id", customer.id);

    if (error) {
        console.error("Follow-up error:", error);
        return;
    }

    await loadCustomers();
    renderAll();

    openProfile(customer.id);
}


function renderFollowups() {
    const container = document.getElementById("followupList");

    if (!container) {
        return;
    }

    const list = customers
        .filter(function(customer) {
            return (
                customer.follow_up &&
                !customer.follow_up_done
            );
        })
        .sort(function(a, b) {
            return a.follow_up.localeCompare(b.follow_up);
        });

    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML =
            '<div class="empty-inline">No pending follow-ups.</div>';
        return;
    }

    const today = todayString();

    list.forEach(function(customer) {
        const item = document.createElement("div");

        item.className = "followup-item";

        let dateText = formatDate(customer.follow_up);
        let dateClass = "followup-date";

        if (customer.follow_up < today) {
            dateText = "Overdue • " + dateText;
            dateClass += " followup-overdue";
        } else if (customer.follow_up === today) {
            dateText = "Today";
            dateClass += " followup-today";
        }

        item.innerHTML =
            '<div class="item-main">' +
            "<strong>" +
            escapeHtml(customer.name) +
            "</strong>" +
            "<span>" +
            escapeHtml(customer.service || "Customer") +
            "</span>" +
            "</div>" +

            '<div class="item-right">' +
            '<span class="' +
            dateClass +
            '">' +
            dateText +
            "</span>" +

            '<button class="done-btn">Done</button>' +

            "</div>";

        item.querySelector(".item-main").addEventListener(
            "click",
            function() {
                openProfile(customer.id);
            }
        );

        item.querySelector(".done-btn").addEventListener(
            "click",
            async function(event) {
                event.stopPropagation();

                const { error } = await supabaseClient
                    .from("customers")
                    .update({
                        follow_up_done: true
                    })
                    .eq("id", customer.id);

                if (error) {
                    console.error(error);
                    return;
                }

                await loadCustomers();
                renderAll();
            }
        );

        container.appendChild(item);
    });
}


/* =========================================================
   PAYMENTS
========================================================= */

function renderPayments() {
    const paymentList = document.getElementById("paymentList");

    let totalPaid = 0;
    let totalOwed = 0;
    let customersOwing = 0;

    customers.forEach(function(customer) {
        totalPaid += getPaid(customer);
        totalOwed += getOwed(customer);

        if (getOwed(customer) > 0) {
            customersOwing++;
        }
    });

    document.getElementById("paymentOutstanding").textContent =
        money(totalOwed);

    document.getElementById("paymentReceived").textContent =
        money(totalPaid);

    document.getElementById("customersOwing").textContent =
        customersOwing;

    if (!paymentList) {
        return;
    }

    const owing = customers
        .filter(function(customer) {
            return getOwed(customer) > 0;
        })
        .sort(function(a, b) {
            return getOwed(b) - getOwed(a);
        });

    paymentList.innerHTML = "";

    if (owing.length === 0) {
        paymentList.innerHTML =
            '<div class="empty-inline">No outstanding payments.</div>';
        return;
    }

    owing.forEach(function(customer) {
        const item = document.createElement("div");

        item.className = "payment-item";

        item.innerHTML =
            '<div class="item-main">' +
            "<strong>" +
            escapeHtml(customer.name) +
            "</strong>" +
            "<span>" +
            escapeHtml(customer.service || "Customer") +
            "</span>" +
            "</div>" +

            '<div class="item-right">' +
            "<strong>" +
            money(getOwed(customer)) +
            "</strong>" +
            '<button class="done-btn">Record Payment</button>' +
            "</div>";

        item.querySelector(".done-btn").addEventListener(
            "click",
            function(event) {
                event.stopPropagation();
                openPaymentModal(customer.id);
            }
        );

        item.querySelector(".item-main").addEventListener(
            "click",
            function() {
                openProfile(customer.id);
            }
        );

        paymentList.appendChild(item);
    });
}


/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

document.addEventListener("click", function(event) {
    if (event.target.classList.contains("modal-overlay")) {
        event.target.classList.remove("active");
        event.target.style.display = "none";
    }
});


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener("keydown", function(event) {
    if (event.key !== "Escape") {
        return;
    }

    document
        .querySelectorAll(".modal-overlay.active")
        .forEach(function(modal) {
            modal.classList.remove("active");
            modal.style.display = "none";
        });
});


/* =========================================================
   BUTTON SETUP
========================================================= */

function setupButtons() {
    const openModal = document.getElementById("openModal");
    const customersAddBtn =
        document.getElementById("customersAddBtn");
    const emptyAddBtn =
        document.getElementById("emptyAddBtn");
    const mobileMenu =
        document.getElementById("mobileMenu");
    const logoutBtn =
        document.getElementById("logoutBtn");

    if (openModal) {
        openModal.addEventListener("click", function() {
            openCustomerModal();
        });
    }

    if (customersAddBtn) {
        customersAddBtn.addEventListener("click", function() {
            openCustomerModal();
        });
    }

    if (emptyAddBtn) {
        emptyAddBtn.addEventListener("click", function() {
            openCustomerModal();
        });
    }

    if (mobileMenu) {
        mobileMenu.addEventListener("click", function() {
            const sidebar = document.querySelector(".sidebar");

            if (sidebar) {
                sidebar.classList.toggle("mobile-open");
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    document
        .getElementById("closeCustomerModal")
        .addEventListener("click", closeCustomerModal);

    document
        .getElementById("cancelCustomerModal")
        .addEventListener("click", closeCustomerModal);

    document
        .getElementById("closeProfileModal")
        .addEventListener("click", closeProfileModal);

    document
        .getElementById("closePaymentModal")
        .addEventListener("click", closePaymentModal);

    document
        .getElementById("cancelPaymentModal")
        .addEventListener("click", closePaymentModal);

    document
        .getElementById("customerForm")
        .addEventListener("submit", handleCustomerSubmit);

    document
        .getElementById("paymentForm")
        .addEventListener("submit", handlePaymentSubmit);

    document
        .getElementById("profileEditBtn")
        .addEventListener("click", editCurrentCustomer);

    document
        .getElementById("profilePaymentBtn")
        .addEventListener("click", function() {
            if (currentProfileId) {
                openPaymentModal(currentProfileId);
            }
        });

    document
        .getElementById("profileFollowupBtn")
        .addEventListener(
            "click",
            markCurrentFollowupDone
        );

    document
        .getElementById("profileDeleteBtn")
        .addEventListener(
            "click",
            deleteCurrentCustomer
        );
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", async function() {
    document
        .getElementById("loginForm")
        .addEventListener("submit", handleLogin);

    document
        .getElementById("googleLoginBtn")
        .addEventListener("click", loginWithGoogle);

    setupButtons();

    await checkAuth();

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {
        await startApp();
    }
});
/* SERVICE WORKER */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
        navigator.serviceWorker.register("./service-worker.js")
            .then(function() {
                console.log("FOLLOWUP service worker registered.");
            })
            .catch(function(error) {
                console.error(
                    "Service worker registration failed:",
                    error
                );
            });
    });
}
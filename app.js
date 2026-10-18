// IT Help Desk - plain JavaScript + localStorage (same style as studentdatabase.html)
var KEY = "helpdesk_db";
var LOGIN_PAGE = "Login.html";   // <-- change to the file name of your login page
var ROLES = ["Hardware", "Software", "Network", "Account & Access", "Emails", "Printer", "Security", "Other"];
var PRIO = { Low: 1, Medium: 2, High: 3, Critical: 4 };
var db = null;
var editId = null;

// Seed data (same as data.json). data.json is used first when the site is served over http.
var SEED = {
    nextId: 1003,
    profile: { name: "Tech Username", role: "Support Agent", photo: "" },
    technicians: [{ id: 1, name: "Agent Carl Jabagat", roles: ["Software", "Account & Access", "Emails"] }],
    tickets: [
        { id: "HD-1001", name: "Maria Santos", email: "maria@gmail.com", phone: "", type: "Network", priority: "High", agent: "", subject: "Unable to access company VPN", due: "2026-09-30", desc: "VPN client shows an authentication error.", status: "Open", created: "2026-09-23T16:30:00", resolved: "" },
        { id: "HD-1002", name: "John Reyes", email: "john@gmail.com", phone: "", type: "Printer", priority: "Low", agent: "Agent Carl Jabagat", subject: "Printer offline on 2nd floor", due: "", desc: "Printer shows offline for all users.", status: "Open", created: "2026-09-24T09:10:00", resolved: "" }
    ],
    audit: []
};

// ---------- start / storage ----------
function load() {
    var stored = localStorage.getItem(KEY);
    if (stored) { db = JSON.parse(stored); start(); return; }
    fetch("data.json").then(function (r) { return r.json(); })
        .then(function (d) { db = d; })
        .catch(function () { db = SEED; })
        .then(function () { save(); start(); });
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
function start() {
    document.querySelectorAll("img[data-fb]").forEach(function (img) {
        img.onerror = function () { this.replaceWith(document.createTextNode(this.dataset.fb)); };
    });
    var box = "";
    for (var i = 0; i < ROLES.length; i++) {
        box += "<label><input type='checkbox' value='" + ROLES[i] + "'> " + ROLES[i] + "</label>";
    }
    document.getElementById("roleBox").innerHTML = box;
    showPage("dashboard");
}
function log(text) {
    db.audit.unshift({ time: new Date().toISOString(), text: text });
    db.audit = db.audit.slice(0, 50);
}
function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}
function fmt(iso) {
    return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}
function $(id) { return document.getElementById(id); }
function say(id, text, bad) { $(id).textContent = text; $(id).className = "msg" + (bad ? " err" : ""); }
function pill(kind, v) { return "<span class='pill " + esc(kind) + "'>" + esc(v) + "</span>"; }
function statusPill(v) { return "<span class='pill " + v.replace(" ", "-") + "'>" + esc(v) + "</span>"; }

// ---------- navigation ----------
function showPage(name) {
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("show"); });
    $("p-" + name).classList.add("show");
    document.querySelectorAll(".nav[data-page]").forEach(function (n) {
        n.classList.toggle("active", n.dataset.page === name);
    });
    renderHeader();
    if (name === "dashboard") renderDashboard();
    if (name === "submit") fillAgents($("fAgent"), false);
    if (name === "tickets") { fillAgents($("qAgent"), true); renderTickets(); }
    if (name === "reports") renderReports();
    if (name === "settings") renderTechs();
    if (name === "profile") renderProfile();
    window.scrollTo(0, 0);
}
function logout() {
    if (confirm("Are you sure you want to log out?")) window.location.href = LOGIN_PAGE;
}
function globalSearch() {
    var q = $("globalSearch").value;
    showPage("tickets");
    $("qKey").value = q;
    renderTickets();
}
function renderHeader() {
    var p = db.profile;
    $("topName").textContent = p.name;
    $("topRole").textContent = p.role;
    if (p.photo) $("topPhoto").src = p.photo;
}
function fillAgents(sel, isFilter) {
    var keep = sel.value;
    var html = isFilter ? "<option value=''>All Assignees</option>" : "<option value=''>Unassigned</option>";
    for (var i = 0; i < db.technicians.length; i++) {
        html += "<option>" + esc(db.technicians[i].name) + "</option>";
    }
    sel.innerHTML = html;
    sel.value = keep;
}

// ---------- 1. dashboard ----------
function count(status) {
    return db.tickets.filter(function (t) { return t.status === status; }).length;
}
function renderDashboard() {
    var h = new Date().getHours();
    var hello = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    $("greet").textContent = hello + ", " + db.profile.name.split(" ")[0] + "!";
    $("dTotal").textContent = db.tickets.length;
    $("dPending").textContent = count("Pending");
    $("dResolved").textContent = count("Resolved") + count("Closed");
    $("dProgress").textContent = count("In Progress");
    var recent = db.tickets.slice().sort(function (a, b) { return b.created.localeCompare(a.created); }).slice(0, 5);
    var rows = "";
    for (var i = 0; i < recent.length; i++) {
        var t = recent[i];
        rows += "<tr><td>#" + esc(t.id) + "</td><td>" + esc(t.subject) + "</td><td>" + esc(t.name) + "</td><td>" +
            pill(t.priority, t.priority) + "</td><td>" + statusPill(t.status) + "</td><td>" + esc(t.agent) + "</td><td>" + fmt(t.created) + "</td></tr>";
    }
    $("recentBody").innerHTML = rows || "<tr><td colspan='7' class='muted'>No tickets yet.</td></tr>";
}

// ---------- 2. create / update ticket ----------
function newTicket() { clearForm(); showPage("submit"); }
function clearForm() {
    ["fName", "fEmail", "fPhone", "fSubject", "fDue", "fDesc"].forEach(function (id) { $(id).value = ""; });
    $("fType").value = "Software"; $("fPriority").value = "High"; $("fAgent").value = ""; $("fStatus").value = "Open";
    editId = null;
    $("formTitle").textContent = "SUBMIT A TICKET";
    $("ticketBtn").textContent = "Submit Ticket";
    $("statusWrap").hidden = true;
    say("formMsg", "");
}
function saveTicket() {
    var t = {
        name: $("fName").value.trim(), email: $("fEmail").value.trim(), phone: $("fPhone").value.trim(),
        type: $("fType").value, priority: $("fPriority").value, agent: $("fAgent").value,
        subject: $("fSubject").value.trim(), due: $("fDue").value, desc: $("fDesc").value.trim()
    };
    if (!t.name || !t.email || !t.subject || !t.desc) { say("formMsg", "Please fill in all required fields (*).", true); return; }
    if (!/^\S+@\S+\.\S+$/.test(t.email)) { say("formMsg", "Please enter a valid email address.", true); return; }

    if (editId === null) {                         // CREATE
        t.id = "HD-" + db.nextId++;
        t.status = "Open"; t.created = new Date().toISOString(); t.resolved = "";
        db.tickets.push(t);
        log("Created ticket " + t.id + " - " + t.subject);
        save(); clearForm(); say("formMsg", "Ticket " + t.id + " submitted successfully!");
    } else {                                       // UPDATE
        var old = db.tickets.filter(function (x) { return x.id === editId; })[0];
        var status = $("fStatus").value;
        t.id = old.id; t.created = old.created; t.status = status;
        t.resolved = (status === "Resolved" || status === "Closed") ? (old.resolved || new Date().toISOString()) : "";
        db.tickets[db.tickets.indexOf(old)] = t;
        log("Updated ticket " + t.id + (old.status !== status ? " (" + old.status + " -> " + status + ")" : ""));
        save(); showPage("tickets");
    }
}
function editTicket(id) {
    var t = db.tickets.filter(function (x) { return x.id === id; })[0];
    showPage("submit");
    editId = id;
    $("fName").value = t.name; $("fEmail").value = t.email; $("fPhone").value = t.phone;
    $("fType").value = t.type; $("fPriority").value = t.priority; $("fAgent").value = t.agent;
    $("fSubject").value = t.subject; $("fDue").value = t.due; $("fDesc").value = t.desc; $("fStatus").value = t.status;
    $("formTitle").textContent = "EDIT TICKET " + id;
    $("ticketBtn").textContent = "Update Ticket";
    $("statusWrap").hidden = false;
}

// ---------- 3. read / delete tickets ----------
function renderTickets() {
    var key = $("qKey").value.toLowerCase(), st = $("qStatus").value, pr = $("qPriority").value, ag = $("qAgent").value;
    var from = $("qFrom").value, to = $("qTo").value, sort = $("qSort").value;
    var list = db.tickets.filter(function (t) {
        var day = t.created.slice(0, 10);
        var text = (t.id + t.subject + t.name + t.email + t.type + t.desc).toLowerCase();
        return (!key || text.indexOf(key) > -1) && (!st || t.status === st) && (!pr || t.priority === pr) &&
            (!ag || t.agent === ag) && (!from || day >= from) && (!to || day <= to);
    });
    list.sort(function (a, b) {
        if (sort === "prio") return PRIO[b.priority] - PRIO[a.priority];
        return sort === "old" ? a.created.localeCompare(b.created) : b.created.localeCompare(a.created);
    });
    var rows = "";
    for (var i = 0; i < list.length; i++) {
        var t = list[i];
        rows += "<tr><td><input type='checkbox' class='pick' value='" + esc(t.id) + "'></td><td>" + esc(t.id) + "</td><td>" + esc(t.subject) +
            "</td><td>" + esc(t.name) + "</td><td>" + esc(t.type) + "</td><td>" + pill(t.priority, t.priority) + "</td><td>" + statusPill(t.status) +
            "</td><td>" + esc(t.agent) + "</td><td>" + fmt(t.created) + "</td><td>" +
            "<button class='btn' onclick=\"editTicket('" + esc(t.id) + "')\">Edit</button> " +
            "<button class='btn danger' onclick=\"deleteTicket('" + esc(t.id) + "')\">Delete</button></td></tr>";
    }
    $("ticketBody").innerHTML = rows;
    $("countText").textContent = "Showing " + list.length + " of " + db.tickets.length + " Tickets";
    $("emptyText").textContent = list.length ? "" : "No tickets match. Submit a ticket or clear the filters.";
}
function clearFilters() {
    ["qKey", "qStatus", "qPriority", "qAgent", "qFrom", "qTo"].forEach(function (id) { $(id).value = ""; });
    $("qSort").value = "new";
    renderTickets();
}
function removeTickets(ids) {
    db.tickets = db.tickets.filter(function (t) { return ids.indexOf(t.id) === -1; });
    log("Deleted ticket(s): " + ids.join(", "));
    save(); renderTickets();
}
function deleteTicket(id) {
    if (confirm("Are you sure you want to delete ticket " + id + "?")) removeTickets([id]);
}
function deleteSelected() {
    var ids = Array.prototype.map.call(document.querySelectorAll(".pick:checked"), function (c) { return c.value; });
    if (!ids.length) { alert("Select at least one ticket first."); return; }
    if (confirm("Delete " + ids.length + " selected ticket(s)?")) removeTickets(ids);
}

// ---------- 4. reports ----------
function renderReports() {
    var done = db.tickets.filter(function (t) { return t.resolved; });
    var hrs = 0;
    done.forEach(function (t) { hrs += (new Date(t.resolved) - new Date(t.created)) / 36e5; });
    var avg = done.length ? (hrs / done.length).toFixed(1) + " hrs" : "N/A";
    var cards = [["Total Tickets", db.tickets.length], ["Pending", count("Pending")], ["In progress", count("In Progress")],
        ["Resolved", count("Resolved")], ["Closed", count("Closed")], ["Avg. response time", avg]];
    var html = "";
    cards.forEach(function (c) { html += "<div class='stat'><small>" + c[0] + "</small><b>" + c[1] + "</b></div>"; });
    $("reportStats").innerHTML = html;

    var tally = {};
    db.tickets.forEach(function (t) { tally[t.type] = (tally[t.type] || 0) + 1; });
    var types = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; });
    var bars = "";
    types.forEach(function (k) {
        bars += "<div class='bar'><span style='width:120px'>" + esc(k) + "</span><i style='width:" + tally[k] / db.tickets.length * 100 + "%'></i><span>" + tally[k] + "</span></div>";
    });
    $("issueList").innerHTML = bars || "<p class='muted'>No tickets yet.</p>";

    var items = "";
    db.audit.slice(0, 10).forEach(function (a) { items += "<li>" + esc(a.text) + "<small>" + fmt(a.time) + "</small></li>"; });
    $("auditList").innerHTML = items || "<p class='muted'>No activity yet.</p>";
}

// ---------- 5. technicians (settings) ----------
function renderTechs() {
    var html = "";
    db.technicians.forEach(function (t) {
        html += "<div class='tech'><span><b>" + esc(t.name) + "</b><br><small class='muted'>" + esc(t.roles.join(", ")) + "</small></span>" +
            "<button class='btn danger' onclick='deleteTech(" + t.id + ")'>Delete</button></div>";
    });
    $("techList").innerHTML = html || "<p class='muted'>No technicians yet.</p>";
}
function addTech() {
    var name = $("tName").value.trim();
    var roles = Array.prototype.map.call(document.querySelectorAll("#roleBox input:checked"), function (c) { return c.value; });
    if (!name) { say("techMsg", "Please enter the technician's full name.", true); return; }
    if (!roles.length) { say("techMsg", "Select at least one role.", true); return; }
    if (db.technicians.some(function (t) { return t.name.toLowerCase() === name.toLowerCase(); })) { say("techMsg", "Technician already exists!", true); return; }
    db.technicians.push({ id: Date.now(), name: name, roles: roles });
    log("Added technician " + name);
    save(); $("tName").value = "";
    document.querySelectorAll("#roleBox input").forEach(function (c) { c.checked = false; });
    say("techMsg", "Technician added successfully!"); renderTechs();
}
function deleteTech(id) {
    var t = db.technicians.filter(function (x) { return x.id === id; })[0];
    if (!confirm("Delete technician " + t.name + "?")) return;
    db.technicians = db.technicians.filter(function (x) { return x.id !== id; });
    db.tickets.forEach(function (k) { if (k.agent === t.name) k.agent = ""; });
    log("Deleted technician " + t.name);
    save(); renderTechs();
}

// ---------- 6. profile ----------
function renderProfile() {
    $("pName").value = db.profile.name;
    $("pRole").value = db.profile.role;
    if (db.profile.photo) $("pPhoto").src = db.profile.photo;
}
function pickPhoto(input) {
    var f = input.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { $("pPhoto").src = r.result; };
    r.readAsDataURL(f);
}
function saveProfile() {
    var name = $("pName").value.trim(), role = $("pRole").value.trim();
    if (!name || !role) { say("profMsg", "Please fill in all fields!", true); return; }
    db.profile.name = name; db.profile.role = role;
    if ($("pPhoto").src.indexOf("data:") === 0) db.profile.photo = $("pPhoto").src;
    log("Updated profile");
    save(); renderHeader(); say("profMsg", "Profile saved!");
}

// ---------- 7. contact support ----------
function sendSupport() {
    if (!$("cSubject").value.trim() || !$("cMsg").value.trim()) { say("cMsgOut", "Please enter a subject and a message.", true); return; }
    log("Support message sent: " + $("cSubject").value.trim());
    save(); $("cSubject").value = ""; $("cMsg").value = "";
    say("cMsgOut", "Message sent! Our support team will reply soon.");
}

load();

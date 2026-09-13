const DEFAULT_SERVER = "https://www.tasktrackerhq.app";

async function getServerUrl() {
  const data = await chrome.storage.local.get("serverUrl");
  return data.serverUrl || DEFAULT_SERVER;
}

document.addEventListener("DOMContentLoaded", async () => {
  const serverUrl = await getServerUrl();

  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");

      if (tabId === "tab-tasks") loadTasks();
      if (tabId === "tab-calendar") loadEvents();
    });
  });

  // Open App Link
  document.getElementById("openAppBtn").href = serverUrl;

  // Fill Current Page Title & URL
  document.getElementById("fillPageBtn").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        document.getElementById("taskTitle").value = `${tab.title || "Web Link"} (${tab.url})`;
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Save Task Form
  const captureForm = document.getElementById("captureForm");
  const captureStatus = document.getElementById("captureStatus");

  captureForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    captureStatus.textContent = "Saving...";
    captureStatus.className = "status-msg";

    const title = document.getElementById("taskTitle").value.trim();
    const priority = document.getElementById("taskPriority").value;
    const category = document.getElementById("taskCategory").value.trim() || "Web Capture";
    const dueDate = document.getElementById("taskDueDate").value;

    try {
      const url = await getServerUrl();
      const res = await fetch(`${url}/api/tasks`, { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority, category, dueDate })
      });

      if (res.ok) {
        captureStatus.textContent = "Task saved to TaskTrackerHQ!";
        captureStatus.classList.add("success");
        document.getElementById("taskTitle").value = "";
        loadTasks();
      } else {
        const err = await res.json().catch(() => ({}));
        captureStatus.textContent = err.error || "Failed to save task.";
        captureStatus.classList.add("error");
      }
    } catch (err) {
      captureStatus.textContent = "Unable to connect to server.";
      captureStatus.classList.add("error");
    }
  });

  // Load Tasks
  async function loadTasks() {
    const taskList = document.getElementById("taskList");
    const taskBadge = document.getElementById("taskBadge");

    try {
      const url = await getServerUrl();
      const res = await fetch(`${url}/api/tasks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const openTasks = (data.tasks || []).filter(t => !t.completed);
      taskBadge.textContent = openTasks.length;

      if (!openTasks.length) {
        taskList.innerHTML = '<div class="empty-state">No open tasks! All caught up.</div>';
        return;
      }

      taskList.innerHTML = openTasks.map(t => `
        <div class="task-item" data-id="${t.id}">
          <input type="checkbox" class="task-chk" ${t.completed ? "checked" : ""}>
          <div class="task-item-body">
            <div class="task-item-title">${escapeHtml(t.title)}</div>
            <div class="task-item-meta">
              <span class="p-tag p-${t.priority.toLowerCase()}">${t.priority}</span>
              ${t.category ? `<span>${escapeHtml(t.category)}</span>` : ""}
              ${t.dueDate ? `<span>📅 ${t.dueDate}</span>` : ""}
            </div>
          </div>
          <button class="task-delete-btn" title="Delete">✕</button>
        </div>
      `).join("");

      // Task actions
      taskList.querySelectorAll(".task-chk").forEach(chk => {
        chk.addEventListener("change", async (e) => {
          const item = e.target.closest(".task-item");
          const id = item.getAttribute("data-id");
          const url = await getServerUrl();
          await fetch(`${url}/api/tasks`, { credentials: "include",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, completed: e.target.checked })
          });
          loadTasks();
        });
      });

      taskList.querySelectorAll(".task-delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const item = e.target.closest(".task-item");
          const id = item.getAttribute("data-id");
          const url = await getServerUrl();
          await fetch(`${url}/api/tasks`, { credentials: "include",
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          });
          loadTasks();
        });
      });
    } catch (e) {
      taskList.innerHTML = '<div class="empty-state">Unable to load tasks from server.</div>';
    }
  }

  document.getElementById("refreshTasksBtn").addEventListener("click", loadTasks);

  // ================= Calendar Tab =================
  let cachedEvents = [];
  let currentFilter = "all";

  const eventList = document.getElementById("eventList");
  const eventBadge = document.getElementById("eventBadge");
  const toggleAddEventBtn = document.getElementById("toggleAddEventBtn");
  const quickAddEventBox = document.getElementById("quickAddEventBox");
  const calendarAddForm = document.getElementById("calendarAddForm");
  const calCancelBtn = document.getElementById("calCancelBtn");
  const calEventStatus = document.getElementById("calEventStatus");

  // Set default date to today for quick add
  const todayStr = new Date().toISOString().slice(0, 10);
  const calDateInput = document.getElementById("calEventDate");
  if (calDateInput) calDateInput.value = todayStr;

  toggleAddEventBtn.addEventListener("click", () => {
    const isHidden = quickAddEventBox.style.display === "none";
    quickAddEventBox.style.display = isHidden ? "block" : "none";
    toggleAddEventBtn.textContent = isHidden ? "✕ Close Form" : "+ Add Event";
    if (isHidden) document.getElementById("calEventTitle").focus();
  });

  calCancelBtn.addEventListener("click", () => {
    quickAddEventBox.style.display = "none";
    toggleAddEventBtn.textContent = "+ Add Event";
    calendarAddForm.reset();
    if (calDateInput) calDateInput.value = todayStr;
    calEventStatus.textContent = "";
  });

  calendarAddForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    calEventStatus.textContent = "Saving event...";
    calEventStatus.className = "status-msg";

    const title = document.getElementById("calEventTitle").value.trim();
    const date = document.getElementById("calEventDate").value;
    const time = document.getElementById("calEventTime").value;
    const reminderMinutes = document.getElementById("calReminder").value;

    try {
      const url = await getServerUrl();
      const res = await fetch(`${url}/api/events`, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, time, reminderMinutes })
      });

      if (res.ok) {
        calEventStatus.textContent = "Event scheduled!";
        calEventStatus.className = "status-msg success";
        calendarAddForm.reset();
        if (calDateInput) calDateInput.value = todayStr;
        setTimeout(() => {
          quickAddEventBox.style.display = "none";
          toggleAddEventBtn.textContent = "+ Add Event";
          calEventStatus.textContent = "";
        }, 1200);
        loadEvents();
      } else {
        const err = await res.json().catch(() => ({}));
        calEventStatus.textContent = err.error || "Failed to schedule event.";
        calEventStatus.className = "status-msg error";
      }
    } catch {
      calEventStatus.textContent = "Unable to connect to server.";
      calEventStatus.className = "status-msg error";
    }
  });

  document.querySelectorAll(".filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.getAttribute("data-filter") || "all";
      renderEvents();
    });
  });

  async function loadEvents() {
    try {
      const url = await getServerUrl();
      const res = await fetch(`${url}/api/events`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      cachedEvents = (data.events || []).sort((a, b) => {
        const da = (a.date || "") + " " + (a.time || "00:00");
        const db = (b.date || "") + " " + (b.time || "00:00");
        return da.localeCompare(db);
      });

      eventBadge.textContent = cachedEvents.length;
      renderEvents();
    } catch {
      eventList.innerHTML = '<div class="empty-state">Unable to load events from server.</div>';
    }
  }

  function renderEvents() {
    const today = new Date().toISOString().slice(0, 10);
    let filtered = cachedEvents;

    if (currentFilter === "today") {
      filtered = cachedEvents.filter(e => (e.date || "").slice(0, 10) === today);
    } else if (currentFilter === "upcoming") {
      filtered = cachedEvents.filter(e => (e.date || "").slice(0, 10) >= today);
    }

    if (!filtered.length) {
      eventList.innerHTML = `<div class="empty-state">No ${currentFilter === "all" ? "scheduled" : currentFilter} events found.</div>`;
      return;
    }

    eventList.innerHTML = filtered.map(e => {
      const provider = e.provider || "Local";
      const pClass = provider.toLowerCase() === "google" ? "provider-google" : provider.toLowerCase() === "microsoft" ? "provider-microsoft" : "provider-local";
      const dateDisplay = formatEventDate(e.date);
      const timeDisplay = e.time ? ` • ${formatEventTime(e.time)}` : "";

      return `
        <div class="event-item" data-id="${escapeHtml(e.id)}" data-provider="${escapeHtml(provider)}">
          <div class="event-item-body">
            <div class="event-item-title">${escapeHtml(e.title)}</div>
            <div class="event-item-meta">
              <span class="provider-badge ${pClass}">${escapeHtml(provider)}</span>
              <span class="event-time-tag">📅 ${dateDisplay}${timeDisplay}</span>
            </div>
          </div>
          <button class="event-delete-btn" title="Delete Event">✕</button>
        </div>
      `;
    }).join("");

    eventList.querySelectorAll(".event-delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const item = e.target.closest(".event-item");
        const id = item.getAttribute("data-id");
        const url = await getServerUrl();

        await fetch(`${url}/api/events?id=${encodeURIComponent(id)}`, {
          credentials: "include",
          method: "DELETE"
        });
        loadEvents();
      });
    });
  }

  function formatEventDate(dateStr) {
    if (!dateStr) return "No date";
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      }
    }
    return dateStr;
  }

  function formatEventTime(timeStr) {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      const h = Number(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }
    return timeStr;
  }

  document.getElementById("refreshEventsBtn").addEventListener("click", loadEvents);

  // TT Bot Chat
  const botForm = document.getElementById("botForm");
  const botInput = document.getElementById("botInput");
  const botMessages = document.getElementById("botMessages");

  botForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = botInput.value.trim();
    if (!msg) return;

    botInput.value = "";
    appendBotMsg("user", msg);

    const loadingDiv = appendBotMsg("bot", "Thinking...");

    try {
      const url = await getServerUrl();
      const res = await fetch(`${url}/api/tt-bot`, { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      loadingDiv.querySelector("p").textContent = data.reply || data.error || "Unable to process request.";
    } catch (err) {
      loadingDiv.querySelector("p").textContent = "Unable to connect to TT Bot.";
    }
  });

  document.querySelectorAll(".quick-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      botInput.value = chip.getAttribute("data-query");
      botForm.dispatchEvent(new Event("submit"));
    });
  });

  function appendBotMsg(sender, text) {
    const div = document.createElement("div");
    div.className = `bot-msg ${sender}`;
    div.innerHTML = `<p>${escapeHtml(text)}</p>`;
    botMessages.appendChild(div);
    botMessages.scrollTop = botMessages.scrollHeight;
    return div;
  }

  // Settings
  const serverUrlInput = document.getElementById("serverUrl");
  serverUrlInput.value = serverUrl;

  document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
    const newUrl = serverUrlInput.value.trim().replace(/\/+$/, "");
    await chrome.storage.local.set({ serverUrl: newUrl });
    const settingsStatus = document.getElementById("settingsStatus");
    settingsStatus.textContent = "Settings saved!";
    settingsStatus.className = "status-msg success";
    document.getElementById("openAppBtn").href = newUrl;
    setTimeout(() => { settingsStatus.textContent = ""; }, 2500);
  });

  function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Initial load
  loadTasks();
  loadEvents();
});
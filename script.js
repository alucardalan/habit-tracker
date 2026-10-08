const STORAGE_KEY = "habit_tdl_tracker_data";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let appData = loadData();

const today = new Date();
today.setHours(0, 0, 0, 0);
let selectedDateKey = formatDateKey(today);

const gridElement = document.getElementById("heatmap-grid");
const monthsRow = document.getElementById("months-row");
const statCurrentStreak = document.getElementById("stat-current-streak");
const statLongestStreak = document.getElementById("stat-longest-streak");
const statActiveDays = document.getElementById("stat-active-days");
const statTotalCount = document.getElementById("stat-total-count");

const selectedDateTitle = document.getElementById("selected-date-title");
const selectedDateStatus = document.getElementById("selected-date-status");
const completedCountBadge = document.getElementById("completed-count-badge");
const totalCountBadge = document.getElementById("total-count-badge");
const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");

const exportBtn = document.getElementById("export-btn");
const importFileInput = document.getElementById("import-file");
const clearBtn = document.getElementById("clear-btn");

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    const validated = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        validated[key] = value;
      }
    }
    return validated;
  } catch (e) {
    return {};
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getStartDate(endDate) {
  const start = new Date(endDate);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function getCompletedCount(dateKey) {
  const tasks = appData[dateKey];
  if (!tasks || !Array.isArray(tasks)) return 0;
  return tasks.filter((t) => t.completed).length;
}

function getLevel(completedCount) {
  if (completedCount <= 0) return 0;
  if (completedCount <= 2) return 1;
  if (completedCount <= 4) return 2;
  if (completedCount <= 6) return 3;
  return 4;
}

function renderHeatmap() {
  gridElement.innerHTML = "";
  monthsRow.innerHTML = "";

  const cursor = getStartDate(today);
  const columnWidth = 16;
  let weekIndex = 0;
  let lastLabeledMonth = -1;

  while (cursor <= today || cursor.getDay() !== 0) {
    const dayOfWeek = cursor.getDay();
    const dateKey = formatDateKey(cursor);
    const completed = getCompletedCount(dateKey);
    const isFuture = cursor > today;

    if (dayOfWeek === 0) {
      const currentMonth = cursor.getMonth();
      if (currentMonth !== lastLabeledMonth) {
        const monthLabel = document.createElement("span");
        monthLabel.className = "month-label";
        monthLabel.textContent = MONTH_NAMES[currentMonth];
        monthLabel.style.left = `${weekIndex * columnWidth}px`;
        monthsRow.appendChild(monthLabel);
        lastLabeledMonth = currentMonth;
      }
    }

    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.date = dateKey;
    cell.dataset.level = getLevel(completed);
    cell.title = `${dateKey}: ${completed} tasks finished`;

    if (isFuture) {
      cell.classList.add("future");
    }

    if (selectedDateKey === dateKey) {
      cell.classList.add("selected");
    }

    gridElement.appendChild(cell);

    cursor.setDate(cursor.getDate() + 1);

    if (cursor.getDay() === 0) {
      weekIndex++;
    }
  }
}

function calculateStats() {
  const cursor = getStartDate(today);
  let totalTasksDone = 0;
  let activeDays = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  while (cursor <= today) {
    const key = formatDateKey(cursor);
    const done = getCompletedCount(key);

    if (done > 0) {
      activeDays++;
      totalTasksDone += done;
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const checkDate = new Date(today);
  const todayDone = getCompletedCount(formatDateKey(checkDate));

  if (todayDone === 0) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = formatDateKey(checkDate);
    if (getCompletedCount(key) > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  statCurrentStreak.textContent = `${currentStreak} day${currentStreak === 1 ? "" : "s"}`;
  statLongestStreak.textContent = `${longestStreak} day${longestStreak === 1 ? "" : "s"}`;
  statActiveDays.textContent = activeDays;
  statTotalCount.textContent = totalTasksDone;
}

function renderTodoList() {
  const tasks = appData[selectedDateKey] || [];
  const completed = tasks.filter((t) => t.completed).length;

  const dateObj = parseDateKey(selectedDateKey);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isToday = selectedDateKey === formatDateKey(today);
  selectedDateTitle.textContent = isToday ? `Today - ${formattedDate}` : formattedDate;
  selectedDateStatus.textContent = `${completed} of ${tasks.length} tasks completed`;
  completedCountBadge.textContent = completed;
  totalCountBadge.textContent = tasks.length;

  todoList.innerHTML = "";

  if (tasks.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = `todo-item ${task.completed ? "done" : ""}`;

      const left = document.createElement("div");
      left.className = "todo-left";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "todo-checkbox";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => toggleTask(task.id));

      const span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = task.text;

      left.appendChild(checkbox);
      left.appendChild(span);

      const delBtn = document.createElement("button");
      delBtn.className = "delete-task-btn";
      delBtn.textContent = "✕";
      delBtn.title = "Delete task";
      delBtn.addEventListener("click", () => deleteTask(task.id));

      li.appendChild(left);
      li.appendChild(delBtn);
      todoList.appendChild(li);
    });
  }
}

function addTask(text) {
  if (!appData[selectedDateKey]) {
    appData[selectedDateKey] = [];
  }

  appData[selectedDateKey].push({
    id: Date.now(),
    text: text.trim(),
    completed: false,
  });

  saveData();
  refreshUI();
}

function toggleTask(id) {
  const tasks = appData[selectedDateKey] || [];
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveData();
    refreshUI();
  }
}

function deleteTask(id) {
  if (!appData[selectedDateKey]) return;
  appData[selectedDateKey] = appData[selectedDateKey].filter((t) => t.id !== id);
  if (appData[selectedDateKey].length === 0) {
    delete appData[selectedDateKey];
  }
  saveData();
  refreshUI();
}

function selectDate(dateKey) {
  selectedDateKey = dateKey;
  refreshUI();
}

function refreshUI() {
  renderHeatmap();
  calculateStats();
  renderTodoList();
}

todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = todoInput.value.trim();
  if (!val) return;
  addTask(val);
  todoInput.value = "";
});

gridElement.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell || cell.classList.contains("future")) return;
  selectDate(cell.dataset.date);
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `habit-tdl-export-${formatDateKey(today)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (typeof parsed === "object" && parsed !== null) {
        appData = parsed;
        saveData();
        refreshUI();
        alert("To-do list data imported successfully.");
      }
    } catch (err) {
      alert("Invalid JSON format.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

clearBtn.addEventListener("click", () => {
  if (confirm("Reset all tasks and heatmap data?")) {
    appData = {};
    saveData();
    refreshUI();
  }
});

refreshUI();
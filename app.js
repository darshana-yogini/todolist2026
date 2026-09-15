const YEAR = 2026;
const STORAGE_KEY = "day-planner-2026-tasks";
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const categoryNames = { work: "업무", personal: "개인", health: "건강", study: "공부" };

const now = new Date();
const isCurrentYear = now.getFullYear() === YEAR;
let visibleMonth = isCurrentYear ? now.getMonth() : 0;
let selectedDate = toKey(YEAR, visibleMonth, isCurrentYear ? now.getDate() : 1);
let currentFilter = "all";
let tasks = loadTasks();

const $ = (selector) => document.querySelector(selector);
const calendarGrid = $("#calendarGrid");
const taskList = $("#taskList");

function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  renderCalendar();
  renderSelectedDate();
  renderTasks();
  renderMonthSummary();
}

function renderCalendar() {
  const firstDay = new Date(YEAR, visibleMonth, 1).getDay();
  const daysInMonth = new Date(YEAR, visibleMonth + 1, 0).getDate();
  $("#monthNumber").textContent = String(visibleMonth + 1).padStart(2, "0");
  $("#monthTitle").innerHTML = `${visibleMonth + 1}월 <span>${monthNames[visibleMonth]}</span>`;
  $("#prevMonth").disabled = visibleMonth === 0;
  $("#nextMonth").disabled = visibleMonth === 11;
  calendarGrid.innerHTML = "";

  for (let index = 0; index < 42; index += 1) {
    const day = index - firstDay + 1;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell";
    cell.setAttribute("role", "gridcell");

    if (day < 1 || day > daysInMonth) {
      cell.classList.add("empty");
      cell.disabled = true;
      cell.setAttribute("aria-hidden", "true");
    } else {
      const key = toKey(YEAR, visibleMonth, day);
      const dayTasks = tasks.filter((task) => task.date === key);
      const date = new Date(YEAR, visibleMonth, day);
      if (date.getDay() === 0) cell.classList.add("sunday");
      if (key === selectedDate) cell.classList.add("selected");
      if (isCurrentYear && key === toKey(YEAR, now.getMonth(), now.getDate())) cell.classList.add("today");
      cell.setAttribute("aria-label", `${visibleMonth + 1}월 ${day}일, 할 일 ${dayTasks.length}개`);
      cell.setAttribute("aria-selected", key === selectedDate ? "true" : "false");
      const pips = dayTasks.slice(0, 3).map((task) => `<i class="task-pip ${task.done ? "done" : ""}"></i>`).join("");
      const more = dayTasks.length > 3 ? `<span class="more-count">+${dayTasks.length - 3}</span>` : "";
      cell.innerHTML = `<span class="number">${day}</span><span class="day-meta">${pips}${more}</span>`;
      cell.addEventListener("click", () => {
        selectedDate = key;
        currentFilter = "all";
        render();
        if (window.innerWidth < 901) $("#selectedDateTitle").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    calendarGrid.appendChild(cell);
  }
}

function renderSelectedDate() {
  const date = parseKey(selectedDate);
  $("#selectedDay").textContent = String(date.getDate()).padStart(2, "0");
  $("#selectedWeekday").textContent = weekdayNames[date.getDay()];
  $("#selectedDateTitle").textContent = `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function renderTasks() {
  const selectedTasks = tasks
    .filter((task) => task.date === selectedDate)
    .filter((task) => currentFilter === "all" || (currentFilter === "done" ? task.done : !task.done))
    .sort((a, b) => (a.done - b.done) || (a.time || "99:99").localeCompare(b.time || "99:99") || a.createdAt - b.createdAt);
  const totalForDay = tasks.filter((task) => task.date === selectedDate).length;
  $("#taskCount").textContent = totalForDay;
  taskList.innerHTML = "";

  if (!selectedTasks.length) {
    const messages = {
      all: ["아직 할 일이 없어요", "위에서 첫 번째 할 일을 적어보세요."],
      open: ["진행할 일이 없어요", "오늘의 목록을 가볍게 비웠네요."],
      done: ["완료한 일이 없어요", "하나씩 체크하며 리듬을 만들어보세요."]
    };
    taskList.innerHTML = `<div class="empty-state"><strong>${messages[currentFilter][0]}</strong><p>${messages[currentFilter][1]}</p></div>`;
  } else {
    selectedTasks.forEach((task) => {
      const item = $("#taskTemplate").content.firstElementChild.cloneNode(true);
      item.dataset.id = task.id;
      item.classList.toggle("completed", task.done);
      item.querySelector(".task-content p").textContent = task.text;
      item.querySelector(".task-content span").textContent = `${categoryNames[task.category] || "기타"}${task.time ? ` · ${task.time}` : ""}`;
      const check = item.querySelector(".check-button");
      check.setAttribute("aria-label", task.done ? "진행 중으로 되돌리기" : "완료로 표시");
      check.addEventListener("click", () => toggleTask(task.id));
      item.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));
      taskList.appendChild(item);
    });
  }
  const hasCompleted = tasks.some((task) => task.date === selectedDate && task.done);
  $("#clearCompleted").disabled = !hasCompleted;
  document.querySelectorAll("#filters button").forEach((button) => button.classList.toggle("active", button.dataset.filter === currentFilter));
}

function renderMonthSummary() {
  const prefix = `${YEAR}-${String(visibleMonth + 1).padStart(2, "0")}`;
  const monthTasks = tasks.filter((task) => task.date.startsWith(prefix));
  const completed = monthTasks.filter((task) => task.done).length;
  const percent = monthTasks.length ? Math.round((completed / monthTasks.length) * 100) : 0;
  $("#monthProgressText").textContent = monthTasks.length ? `${monthTasks.length}개 중 ${completed}개를 완료했어요` : "아직 등록된 할 일이 없어요";
  $("#monthProgressPercent").textContent = `${percent}%`;
  $("#monthProgressBar").style.width = `${percent}%`;
}

function addTask({ text, category = "work", time = "", date = selectedDate }) {
  const cleanText = String(text || "").trim();
  if (!cleanText) throw new Error("할 일 내용을 입력해 주세요.");
  if (!/^2026-\d{2}-\d{2}$/.test(date) || Number.isNaN(parseKey(date).getTime())) throw new Error("2026년의 올바른 날짜를 입력해 주세요.");
  const task = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, text: cleanText.slice(0, 80), category: categoryNames[category] ? category : "work", time, date, done: false, createdAt: Date.now() };
  tasks.push(task);
  saveTasks();
  if (date === selectedDate) render();
  return task;
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
}

$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#taskInput");
  addTask({ text: input.value, category: $("#taskCategory").value, time: $("#taskTime").value });
  input.value = "";
  input.focus();
});

$("#prevMonth").addEventListener("click", () => {
  if (visibleMonth <= 0) return;
  visibleMonth -= 1;
  selectedDate = toKey(YEAR, visibleMonth, 1);
  currentFilter = "all";
  render();
});

$("#nextMonth").addEventListener("click", () => {
  if (visibleMonth >= 11) return;
  visibleMonth += 1;
  selectedDate = toKey(YEAR, visibleMonth, 1);
  currentFilter = "all";
  render();
});

$("#todayButton").addEventListener("click", () => {
  visibleMonth = isCurrentYear ? now.getMonth() : 0;
  selectedDate = toKey(YEAR, visibleMonth, isCurrentYear ? now.getDate() : 1);
  currentFilter = "all";
  render();
});

$("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  renderTasks();
});

$("#clearCompleted").addEventListener("click", () => {
  tasks = tasks.filter((task) => task.date !== selectedDate || !task.done);
  saveTasks();
  render();
});

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const tools = [
    {
      name: "list_day_tasks",
      title: "날짜별 할 일 보기",
      description: "2026년의 특정 날짜에 저장된 할 일 목록을 조회합니다.",
      inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^2026-\\d{2}-\\d{2}$" } }, required: ["date"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute({ date }) { return { date, tasks: tasks.filter((task) => task.date === date).map(({ id, text, category, time, done }) => ({ id, text, category, time, done })) }; }
    },
    {
      name: "create_day_task",
      title: "할 일 추가",
      description: "2026년의 특정 날짜에 새 할 일을 추가하고 화면을 해당 날짜로 이동합니다.",
      inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^2026-\\d{2}-\\d{2}$" }, text: { type: "string", minLength: 1, maxLength: 80 }, category: { type: "string", enum: ["work", "personal", "health", "study"] }, time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" } }, required: ["date", "text"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) { const date = parseKey(input.date); visibleMonth = date.getMonth(); selectedDate = input.date; const task = addTask(input); render(); return { id: task.id, date: task.date, text: task.text, status: "created" }; }
    }
  ];
  tools.forEach((tool) => { try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch {} });
}

render();
registerWebMcpTools();

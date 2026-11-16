"use strict";

const STORAGE_KEYS = {
  tasks: "study-helper-tasks-v1",
  cards: "study-helper-cards-v1"
};

function readFromStorage(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.warn(`Не удалось прочитать данные "${key}" из браузера.`, error);
    return [];
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Не удалось сохранить данные "${key}" в браузере.`, error);
    alert("Не получилось сохранить данные. Проверь, хватает ли места в браузере.");
  }
}

let tasks = readFromStorage(STORAGE_KEYS.tasks);
let cards = readFromStorage(STORAGE_KEYS.cards);

if (!Array.isArray(tasks)) tasks = [];
if (!Array.isArray(cards)) cards = [];

const navigationButtons = document.querySelectorAll(".nav-button");
const views = document.querySelectorAll(".view");

function openView(viewName) {
  views.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  navigationButtons.forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navigationButtons.forEach((button) => {
  button.addEventListener("click", () => openView(button.dataset.view));
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => openView(button.dataset.go));
});

/* Задачи */

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskDateInput = document.querySelector("#task-date");
const taskList = document.querySelector("#task-list");
const taskEmpty = document.querySelector("#task-empty");
const taskCount = document.querySelector("#task-count");

function formatTaskDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function updateTaskCount() {
  const activeTasks = tasks.filter((task) => !task.completed).length;
  const word = new Intl.PluralRules("ru-RU").select(activeTasks);

  let label = "задач";
  if (word === "one") label = "задача";
  if (word === "few") label = "задачи";

  taskCount.textContent = `${activeTasks} ${label}`;
}

function renderTasks() {
  taskList.replaceChildren();
  taskEmpty.hidden = tasks.length > 0;

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";

    if (task.completed) {
      item.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.className = "task-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.completed);
    checkbox.setAttribute("aria-label", `Отметить задачу: ${task.text}`);

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveToStorage(STORAGE_KEYS.tasks, tasks);
      renderTasks();
    });

    const details = document.createElement("div");
    details.className = "task-details";

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.text;

    details.append(title);

    if (task.date) {
      const date = document.createElement("span");
      date.className = "task-date";
      date.textContent = `Срок: ${formatTaskDate(task.date)}`;
      details.append(date);
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-task";
    deleteButton.type = "button";
    deleteButton.textContent = "Удалить";
    deleteButton.setAttribute("aria-label", `Удалить задачу: ${task.text}`);

    deleteButton.addEventListener("click", () => {tasks = tasks.filter((savedTask) => savedTask.id !== task.id);saveToStorage(STORAGE_KEYS.tasks, tasks);
      renderTasks();
    });

    item.append(checkbox, details, deleteButton);
    taskList.append(item);
  });

  updateTaskCount();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) return;

  tasks.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text,
    date: taskDateInput.value,
    completed: false
  });

  saveToStorage(STORAGE_KEYS.tasks, tasks);
  taskForm.reset();
  taskInput.focus();
  renderTasks();
});

renderTasks();

/* Карточки для повторения */

const cardForm = document.querySelector("#card-form");
const questionInput = document.querySelector("#card-question");
const answerInput = document.querySelector("#card-answer");
const cardArea = document.querySelector("#card-area");
const cardEmpty = document.querySelector("#card-empty");
const flashcard = document.querySelector("#flashcard");
const cardSideLabel = document.querySelector("#card-side-label");
const cardText = document.querySelector("#card-text");
const cardPosition = document.querySelector("#card-position");
const cardCount = document.querySelector("#card-count");
const previousCardButton = document.querySelector("#previous-card");
const nextCardButton = document.querySelector("#next-card");
const deleteCardButton = document.querySelector("#delete-card");

let currentCardIndex = 0;
let answerIsVisible = false;

function renderCard() {
  const hasCards = cards.length > 0;

  cardArea.hidden = !hasCards;
  cardEmpty.hidden = hasCards;

  const word = new Intl.PluralRules("ru-RU").select(cards.length);
  let label = "карточек";
  if (word === "one") label = "карточка";
  if (word === "few") label = "карточки";
  cardCount.textContent = `${cards.length} ${label}`;

  if (!hasCards) {
    cardPosition.textContent = "0 / 0";
    return;
  }

  if (currentCardIndex >= cards.length) {
    currentCardIndex = cards.length - 1;
  }

  const currentCard = cards[currentCardIndex];
  const textToShow = answerIsVisible ? currentCard.answer : currentCard.question;

  cardSideLabel.textContent = answerIsVisible ? "ОТВЕТ" : "ВОПРОС";
  cardText.textContent = textToShow;
  cardPosition.textContent = `${currentCardIndex + 1} / ${cards.length}`;
  flashcard.setAttribute(
    "aria-label",
    answerIsVisible ? "Показан ответ. Нажми, чтобы увидеть вопрос" : "Показан вопрос. Нажми, чтобы увидеть ответ"
  );
}

cardForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();

  if (!question || !answer) return;

  cards.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    question,
    answer
  });

  currentCardIndex = cards.length - 1;
  answerIsVisible = false;

  saveToStorage(STORAGE_KEYS.cards, cards);
  cardForm.reset();
  questionInput.focus();
  renderCard();
});

flashcard.addEventListener("click", () => {
  if (cards.length === 0) return;

  answerIsVisible = !answerIsVisible;
  renderCard();
});

previousCardButton.addEventListener("click", () => {
  if (cards.length === 0) return;

  currentCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
  answerIsVisible = false;
  renderCard();
});

nextCardButton.addEventListener("click", () => {
  if (cards.length === 0) return;

  currentCardIndex = (currentCardIndex + 1) % cards.length;
  answerIsVisible = false;
  renderCard();
});

deleteCardButton.addEventListener("click", () => {
  if (cards.length === 0) return;

  cards.splice(currentCardIndex, 1);
  answerIsVisible = false;

  if (currentCardIndex >= cards.length) {
    currentCardIndex = Math.max(0, cards.length - 1);
  }

  saveToStorage(STORAGE_KEYS.cards, cards);
  renderCard();
});

renderCard();

/* Таймер */

const timerDisplay = document.querySelector("#timer-display");
const timerStatus = document.querySelector("#timer-status");
const startTimerButton = document.querySelector("#start-timer");const resetTimerButton = document.querySelector("#reset-timer");
const modeButtons = document.querySelectorAll(".mode-button");

const TIMER_LENGTHS = {
  focus: 25 * 60,
  break: 5 * 60
};

let currentMode = "focus";
let remainingSeconds = TIMER_LENGTHS[currentMode];
let timerInterval = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);
  document.title = timerInterval
    ? `${formatTime(remainingSeconds)} — Учись проще`
    : "Учись проще — помощник для учёбы";
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  startTimerButton.textContent = "Продолжить";
}

function setMode(mode) {
  stopTimer();
  currentMode = mode;
  remainingSeconds = TIMER_LENGTHS[currentMode];

  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === currentMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  timerStatus.textContent = currentMode === "focus"
    ? "Время спокойно начать"
    : "Небольшой перерыв — тоже часть учёбы";

  startTimerButton.textContent = "Начать";
  updateTimerDisplay();
}

function tickTimer() {
  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
    updateTimerDisplay();
  }

  if (remainingSeconds === 0) {
    stopTimer();
    timerStatus.textContent = currentMode === "focus"
      ? "Время вышло — пора отдохнуть"
      : "Перерыв завершён — можно продолжить";
    startTimerButton.textContent = "Начать снова";
    updateTimerDisplay();
  }
}

startTimerButton.addEventListener("click", () => {
  if (timerInterval !== null) {
    stopTimer();
    timerStatus.textContent = "Таймер на паузе";
    return;
  }

  if (remainingSeconds === 0) {
    remainingSeconds = TIMER_LENGTHS[currentMode];
  }

  timerStatus.textContent = currentMode === "focus"
    ? "Сосредоточься на выбранном деле"
    : "Отдохни и дай себе передышку";

  startTimerButton.textContent = "Пауза";
  timerInterval = setInterval(tickTimer, 1000);
  updateTimerDisplay();
});

resetTimerButton.addEventListener("click", () => {
  stopTimer();
  remainingSeconds = TIMER_LENGTHS[currentMode];
  timerStatus.textContent = "Таймер сброшен";
  startTimerButton.textContent = "Начать";
  updateTimerDisplay();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

setMode("focus");
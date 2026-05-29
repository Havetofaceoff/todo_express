const btnPlus = document.querySelector(".btn__plus");
const modal = document.querySelector(".modal");
const modalTitleInput = document.querySelector(".modal__input-title");
const modalDescriptionInput = document.querySelector(".modal__input-description");
const modalCategorySelect = document.querySelector(".modal__select");
const modalCancel = document.querySelector(".modal__cancel");
const modalApply = document.querySelector(".modal__apply");
const mainTemplate = document.querySelector(".main__template");
const mainUl = document.querySelector(".main__ul");
const headerBtn = document.querySelector(".header__button");
const modalTitle = document.querySelector(".modal__title");
const headerInput = document.querySelector(".header__input");
const headerSelect = document.querySelector(".header__select");
const emptyTemplate = document.querySelector(".empty__template");

// Основное состояние приложения: данные приходят с сервера и дальше синхронизируются после CRUD-операций.
let tasks = [];
let categories = [];
let editTask = null;
let isLoading = false;
let errorMessage = "";

// Привязка действий интерфейса к обработчикам.
btnPlus.onclick = () => openModal();
modalCancel.onclick = closeModal;
modalApply.onclick = saveTask;
headerBtn.onclick = toggleTheme;
headerInput.oninput = renderFilteredList;
headerSelect.onchange = renderFilteredList;

// Клик по затемненной области закрывает модальное окно.
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

// Escape закрывает модальное окно без сохранения.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("modal__active")) {
    closeModal();
  }
});

loadApp();

// Первичная загрузка задач и категорий с сервера.
async function loadApp() {
  setLoading(true);

  try {
    const [loadedTasks, loadedCategories] = await Promise.all([
      getAllTasksApi(),
      getCategoriesApi(),
    ]);

    tasks = loadedTasks;
    categories = loadedCategories;
    errorMessage = "";
    renderCategories();
    renderFilteredList();
  } catch (error) {
    errorMessage = `Could not load data: ${error.message}`;
    renderFilteredList();
  } finally {
    setLoading(false);
  }
}

// Открывает форму в режиме создания или редактирования.
function openModal(task = null) {
  editTask = task;
  modalTitle.textContent = editTask ? "EDIT NOTE" : "NEW NOTE";
  modalTitleInput.value = editTask?.title || "";
  modalDescriptionInput.value = editTask?.description || "";
  modalCategorySelect.value = editTask?.category_id || categories[0]?.id || "";
  modalApply.textContent = editTask ? "SAVE" : "APPLY";
  modal.classList.add("modal__active");
  modalTitleInput.focus();
}

// Закрывает форму и сбрасывает временное состояние редактирования.
function closeModal() {
  modal.classList.remove("modal__active");
  modalTitleInput.value = "";
  modalDescriptionInput.value = "";
  modalCategorySelect.value = categories[0]?.id || "";
  editTask = null;
  modalApply.disabled = false;
}

// Заполняет select категориями, полученными из backend.
function renderCategories() {
  modalCategorySelect.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    modalCategorySelect.append(option);
  });
}

// Применяет поиск и фильтр статуса к локальному состоянию tasks.
function renderFilteredList() {
  const search = headerInput.value.trim().toLowerCase();
  const status = headerSelect.value;

  const filteredTasks = tasks.filter((task) => {
    const searchTarget = `${task.title} ${task.description || ""} ${task.category_name || ""}`.toLowerCase();
    const matchesSearch = searchTarget.includes(search);
    const matchesStatus =
      status === "all" ||
      (status === "complete" && task.is_completed) ||
      (status === "incomplete" && !task.is_completed);

    return matchesSearch && matchesStatus;
  });

  renderList(filteredTasks);
}

// Отрисовывает список задач или служебные состояния: загрузка, ошибка, пустой список.
function renderList(items) {
  mainUl.innerHTML = "";

  if (isLoading) {
    renderMessage("Loading tasks...");
    return;
  }

  if (errorMessage) {
    renderMessage(errorMessage);
    return;
  }

  if (items.length === 0) {
    const clone = emptyTemplate.content.cloneNode(true);
    mainUl.append(clone);
    return;
  }

  items.forEach((task) => {
    const clone = mainTemplate.content.cloneNode(true);
    const cloneTitle = clone.querySelector(".main__title");
    const cloneDescription = clone.querySelector(".main__description");
    const cloneCategory = clone.querySelector(".main__category");
    const cloneDate = clone.querySelector(".main__date");
    const cloneLi = clone.querySelector(".main__li");
    const cloneCompleteBtn = clone.querySelector(".main__btn");
    const cloneDeleteBtn = clone.querySelector(".main__delete");
    const cloneEditBtn = clone.querySelector(".main__edit");

    // Используем textContent, чтобы пользовательский текст не интерпретировался как HTML.
    cloneTitle.textContent = task.title;
    cloneDescription.textContent = task.description || "No description";
    cloneCategory.textContent = task.category_name || "No category";
    cloneDate.textContent = formatDate(task.created_at);

    cloneCompleteBtn.title = task.is_completed ? "Mark as active" : "Mark as done";
    cloneDeleteBtn.title = "Delete";
    cloneEditBtn.title = "Edit";
    cloneCompleteBtn.onclick = () => toggleComplete(task);
    cloneDeleteBtn.onclick = () => removeTask(task);
    cloneEditBtn.onclick = () => openModal(task);

    if (task.is_completed) {
      cloneLi.classList.add("main__complete");
    }

    mainUl.append(clone);
  });
}

// Создает новую задачу или обновляет существующую через API.
async function saveTask() {
  const title = modalTitleInput.value.trim();
  const description = modalDescriptionInput.value.trim();
  const categoryId = Number(modalCategorySelect.value) || null;

  if (!title) {
    modalTitleInput.focus();
    modalTitleInput.classList.add("modal__input-error");
    return;
  }

  modalTitleInput.classList.remove("modal__input-error");
  modalApply.disabled = true;

  try {
    // Имена полей совпадают с контрактом backend и таблицей tasks.
    const payload = {
      title,
      description,
      category_id: categoryId,
    };

    if (editTask) {
      // После ответа сервера заменяем только измененную задачу в локальном массиве.
      const updatedTask = await updateTaskApi(editTask.id, payload);
      tasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
    } else {
      // Новая задача уже возвращается сервером с id, датой и названием категории.
      const createdTask = await createTaskApi(payload);
      tasks = [createdTask, ...tasks];
    }

    closeModal();
    renderFilteredList();
  } catch (error) {
    alert(error.message);
    modalApply.disabled = false;
  }
}

// Переключает выполнение задачи на сервере и обновляет локальное состояние ответом API.
async function toggleComplete(task) {
  try {
    const updatedTask = await completeTaskApi(task.id, !task.is_completed);
    tasks = tasks.map((item) => (item.id === updatedTask.id ? updatedTask : item));
    renderFilteredList();
  } catch (error) {
    alert(error.message);
  }
}

// Удаляет задачу после подтверждения пользователя.
async function removeTask(task) {
  if (!confirm(`Delete "${task.title}"?`)) {
    return;
  }

  try {
    await deleteTaskApi(task.id);
    tasks = tasks.filter((item) => item.id !== task.id);
    renderFilteredList();
  } catch (error) {
    alert(error.message);
  }
}

// Тема хранится локально, потому что это настройка конкретного браузера, а не задача из БД.
function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
}

// Управляет состоянием загрузки и сразу перерисовывает список.
function setLoading(value) {
  isLoading = value;
  renderFilteredList();
}

// Единый вывод коротких сообщений внутри списка задач.
function renderMessage(message) {
  mainUl.innerHTML = `<li class="main__message">${message}</li>`;
}

// Приводит дату из SQLite к привычному формату для интерфейса.
function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value.replace(" ", "T")).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Восстанавливаем выбранную тему при следующем открытии страницы.
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

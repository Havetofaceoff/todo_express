//Создаем под HTML-элементы константы, достаем их по css-селекторы(название тэгов, классов, id и тд)
//из всего DOM(document)
const btnPlus = document.querySelector(".btn__plus");
const modal = document.querySelector(".modal");
const modalInput = document.querySelector(".modal__input");
const modalCancel = document.querySelector(".modal__cancel");
const modalApply = document.querySelector(".modal__apply");
const mainTemplate = document.querySelector(".main__template");
const mainUl = document.querySelector(".main__ul");
const headerBtn = document.querySelector(".header__button");
const modalTitle = document.querySelector(".modal__title");
const headerInput = document.querySelector(".header__input");
const headerSelect = document.querySelector(".header__select");
const emptyTemplate = document.querySelector(".empty__template");

//Создаем переменную для хранения дел и в качестве значения присваеваем результат вызова функции(см. getList)
let list = getList();

//глобальная переменная для хранения редактируемого элемента
let editNote = null;

//обработчики событий
btnPlus.onclick = openModal;
modalCancel.onclick = closeModal;
modalApply.onclick = addNewNote;
headerBtn.onclick = toggleTheme;
//срабатывает при вводе текста пользователя
headerInput.oninput = handleSearch;
//срабатывает при изменение внутри html-элемента формы(input, select, checkbox и тд)
headerSelect.onchange = handleSelect;

//вызов функции отрисовки (см. renderList)
renderList(list);

//для открытия модального окна
function openModal() {
  //проверка наличия редактируемого элемента
  if (editNote) {
    //innerHTML меняет содержимое html-элемента
    modalTitle.innerHTML = "EDIT NOTE";
    //свойство value позволяет получить доступ к введеному тексту в input
    //заносим текст редактируемого элемента
    modalInput.value = editNote.title;
  } else {
    // если нет редактируемого элемента, то меняем заголовок модального окна
    modalTitle.innerHTML = "NEW NOTE";
  }
  //добавили класс для открытия модального окна
  modal.classList.add("modal__active");
}

//функция для закрытия модального окна
function closeModal() {
  //удаляем класс для закрытия окна
  modal.classList.remove("modal__active");
  //текс внутри modalInput очищаем
  modalInput.value = "";
  //очищаем редактируемый элемент
  editNote = null;
}

//функция для отрисовки списка дел на странице, принимает параметром массив для отображения(arr)
function renderList(arr) {
  //очишаем содержимое списка
  mainUl.innerHTML = null;
  //если массив пустой
  if (arr.length == 0) {
    //клонируем шаблон разметки, который отображается, когда список пуст
    //шаблон
    const clone = emptyTemplate.content.cloneNode(true);
    //append вставляем html-элемент внутрь контейнера(mainUl)
    mainUl.append(clone);
  }
  //цикл который проходит по всем элементам массива (element - элемент массива, обьект с данными)
  arr.forEach((element) => {
    console.log(element);
    //клонируется шаблон элемента списка
    const clone = mainTemplate.content.cloneNode(true);

    //достаем из шаблона нужные html-элементы
    //достаем именно из clone
    const cloneTitle = clone.querySelector(".main__title");
    const cloneLi = clone.querySelector(".main__li");
    const cloneCompleteBtn = clone.querySelector(".main__btn");
    const cloneDeleteBtn = clone.querySelector(".main__delete");
    const cloneEditBtn = clone.querySelector(".main__edit");

    //меняем содержимое заголовка html на текст элемента списка
    cloneTitle.innerHTML = element.title;

    //назначаем обработчики событий
    cloneCompleteBtn.onclick = () => completeNote(element);
    cloneDeleteBtn.onclick = () => deleteNote(element);
    cloneEditBtn.onclick = () => startEdit(element);

    //проверка на выполнение задания, добовляется новый класс(вычеркнуто), если выполнено
    if (element.isComplete) {
      cloneLi.classList.add("main__complete");
    }
    //append вставляем html-элемент внутрь контейнера(mainUl)
    mainUl.append(clone);
  });
  //(см. ниже будет )
  saveList();
}

//добавляем новую заметку либо редактируем сущ.
function addNewNote() {
  //получаем и сохраняем текст введеный пользователем
  const title = modalInput.value;
  //если поле пустое(trim обрезает пробелы)
  if (!title.trim()) {
    // то выскактвает окно с текстом в скобках (alert)
    alert("fill the title!!!");
    //заверщает работу функции
    return;
  }

  //проверяем на наличие редактируемого элемента
  if (editNote) {
    //map - меняет элементы массива(в цикле), результатом возвращает новый массив
    list = list.map((note) => {
      //проверка. сравниваем id текущего элемента с редактируемым элементом массива
      //ОСТАНОВИЛИСЬ ТУТ
      if (note.id == editNote.id) {
        //присваеваем новое название
        note.title = title;
      }
      //map всегда требует возвращать элемент массива
      return note;
    });
    //если не было редактируемого, то добавляе новый элемент
  } else {
    list.push({
      //генерируем уникальный id
      id: Date.now(),
      title: title,
      isComplete: false,
    });
  }
  //вызов функции отрисовки (см. renderList)
  renderList(list);
  //закрываем модальное окно
  closeModal();
}

// создаем функцию для отметки выполненных задач
function completeNote(element) {
  // переключает выполненное на невыполненное и наоборот
  element.isComplete = !element.isComplete;
  //вызов функции отрисовки (см. renderList)
  renderList(list);
}

//функция для удаления пункта
function deleteNote(element) {
  list = list.filter((note) => note.id != element.id);
  //Идет фильтрация массива, проходимся по каждому элементу(note)
  // и для каждого проверяем условия. Если note id не равен
  // element id(тот, что нужно удалить), то note попадает в новый массив
  renderList(list);
}

//создаем функцию для переключеия темы
function toggleTheme() {
  //toggle переключает css-класс у элемента
  document.body.classList.toggle("dark");
}

//функция для редактирование
function startEdit(element) {
  //в сущ переменную editNote присваеваем значение уже имеющийся объект
  editNote = element;
  //открываем модальное окно
  openModal();
}

//создаем функцию для поиска
function handleSearch() {
  // создаем константу, в которой будет текст из поля ввода
  //value - значение, которое выбрал/ввел пользователь в элементе формы
  const search = headerInput.value;
  //создаем константу, где будет фильтрованный список
  const searchList = list.filter((note) =>
    //название заметки в нижнем регистре, которую ввел пользователь ввел в поиск
    //includes - ищет совпадения подстроки search внутри строки note.title
    note.title.toLowerCase().includes(search.toLowerCase()),
  );
  //обновляем список на экране
  renderList(searchList);
}

//функия для фильтрации
function handleSelect() {
  //создаем константу для значения выпадающего списка
  const value = headerSelect.value;
  //создаем переменную и заносим по умолчанию схлжий массив
  let filterList = list;
  //проверяем выбранное значение на совпадение со строкой complete
  if (value === "complete") {
    //если note.IsComplete = true, то попадает в новый массив
    filterList = list.filter((note) => note.isComplete);
  }
  //проверяем выбранное значение на совпадение со строкой incomplete
  if (value === "incomplete") {
    //если note.IsComplete = false, то попадает в новый массив
    filterList = list.filter((note) => !note.isComplete);
  }
  //обновляем список на экране
  renderList(filterList);
}

//функция для локального сохранения в браузере
function saveList() {
  //setItem используется для записи в хранилище
  //первый аргумент - название ключа, по которому происходит запист("list")
  //второй аргумент - сохрнаняемое значение
  //JSON.stringify - перевод в строковый формат JSON(localStorage умеет хранить только строки )
  localStorage.setItem("list", JSON.stringify(list));
}
//получает сохраненный массив из памяти браузера
function getList() {
  //получаем данные из локального хранилища по названию ключа
  const arr = localStorage.getItem("list");
  //проверяем есть ли данные
  if (arr) {
    //если есть данные, то превращаем строку в массив, тк в localStorage все храниться как строка
    return JSON.parse(arr);
    //если в arr ничего нет, то возращаем пустой массив
  } else {
    return [];
  }
}

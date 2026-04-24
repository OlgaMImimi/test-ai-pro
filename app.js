const state = {
  selectedSectionId: "sec-global-params",
  editingRecordId: null,
  sections: [
    { id: "sec-global-params", name: "Глобальные параметры" },
    { id: "sec-currencies", name: "Валюты" },
    { id: "sec-prices", name: "Цены" },
    { id: "sec-global-data", name: "Глобальные данные" }
  ],
  records: {
    "sec-global-params": [],
    "sec-currencies": [
      { id: crypto.randomUUID(), name: "USD", description: "Доллар США" },
      { id: crypto.randomUUID(), name: "RUB", description: "Российский рубль" }
    ],
    "sec-prices": [
      { id: crypto.randomUUID(), name: "Brent-Base", description: "Нефть" },
      { id: crypto.randomUUID(), name: "Gas-Forward", description: "Газ" },
      { id: crypto.randomUUID(), name: "Power-Spot", description: "Электроэнергия" }
    ],
    "sec-global-data": [
      { id: crypto.randomUUID(), name: "Налоговая ставка", description: "20%" },
      { id: crypto.randomUUID(), name: "Инфляция", description: "5%" }
    ]
  },
  econModels: ["Базовая", "Консервативная", "Оптимистичная"]
};

const sectionTree = document.getElementById("sectionTree");
const recordsTitle = document.getElementById("recordsTitle");
const recordHead = document.getElementById("recordHead");
const recordBody = document.getElementById("recordBody");
const formTitle = document.getElementById("formTitle");
const recordForm = document.getElementById("recordForm");
const formMessage = document.getElementById("formMessage");

function getSection() {
  return state.sections.find((s) => s.id === state.selectedSectionId);
}

function renderSections() {
  sectionTree.innerHTML = "";
  state.sections.forEach((section) => {
    const li = document.createElement("li");
    li.textContent = section.name;
    li.className = section.id === state.selectedSectionId ? "active" : "";
    li.onclick = () => {
      state.selectedSectionId = section.id;
      state.editingRecordId = null;
      render();
    };
    sectionTree.appendChild(li);
  });
}

function renderRecordTable() {
  const section = getSection();
  const rows = state.records[section.id] || [];
  recordsTitle.textContent = `Записи: ${section.name}`;

  if (section.id === "sec-global-params") {
    recordHead.innerHTML = "<tr><th>Название</th><th>Версия</th><th>Автор</th><th>Дата изменения</th><th>Действия</th></tr>";
    recordBody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.name}</td>
        <td>${r.version}</td>
        <td>${r.author}</td>
        <td>${r.updatedAt}</td>
        <td class="inline-actions">
          <button onclick="editRecord('${r.id}')">Редактировать</button>
          <button onclick="deleteRecord('${r.id}')">Удалить</button>
        </td>
      </tr>
    `).join("");
    return;
  }

  recordHead.innerHTML = "<tr><th>Название</th><th>Описание</th><th>Действия</th></tr>";
  recordBody.innerHTML = rows.map((r) => `
    <tr>
      <td>${r.name}</td>
      <td>${r.description || "—"}</td>
      <td class="inline-actions">
        <button onclick="editRecord('${r.id}')">Редактировать</button>
        <button onclick="deleteRecord('${r.id}')">Удалить</button>
      </td>
    </tr>
  `).join("");
}

function renderForm() {
  formMessage.textContent = "";
  formMessage.className = "message";

  const section = getSection();
  formTitle.textContent = state.editingRecordId ? `Редактирование: ${section.name}` : `Создание: ${section.name}`;
  recordForm.innerHTML = "";

  if (section.id === "sec-global-params") {
    const tpl = document.getElementById("globalParamFormTemplate").content.cloneNode(true);
    recordForm.appendChild(tpl);
    fillSelects();
    if (state.editingRecordId) fillFormByRecord();
    prepareOtherDataEditor();
    return;
  }

  const tpl = document.getElementById("simpleFormTemplate").content.cloneNode(true);
  recordForm.appendChild(tpl);
  if (state.editingRecordId) fillFormByRecord();
}

function fillSelects() {
  const econ = recordForm.querySelector("select[name='econModel']");
  econ.innerHTML = `<option value="">Выберите модель</option>${state.econModels.map((m) => `<option>${m}</option>`).join("")}`;
  const prices = state.records["sec-prices"] || [];
  ["price_oil", "price_gas", "price_power"].forEach((n) => {
    const s = recordForm.querySelector(`select[name='${n}']`);
    s.innerHTML = `<option value="">Выберите цену</option>${prices.map((p) => `<option>${p.name}</option>`).join("")}`;
  });
}

function prepareOtherDataEditor() {
  const addBtn = document.getElementById("addOtherDataBtn");
  addBtn.onclick = () => addOtherDataRow();
  addOtherDataRow();
}

function addOtherDataRow(item = { param: "", value: "" }) {
  const wrap = document.getElementById("otherDataEditor");
  const row = document.createElement("div");
  row.className = "grid-2";
  const options = (state.records["sec-global-data"] || []).map((g) => `<option>${g.name}</option>`).join("");
  row.innerHTML = `
    <label>Параметр
      <select name="other_param"><option value="">Выберите параметр</option>${options}</select>
    </label>
    <label>Значение
      <input name="other_value" placeholder="Значение" />
    </label>
  `;
  row.querySelector("select").value = item.param;
  row.querySelector("input").value = item.value;
  wrap.appendChild(row);
}

function fillFormByRecord() {
  const section = getSection();
  const rec = (state.records[section.id] || []).find((r) => r.id === state.editingRecordId);
  if (!rec) return;

  Object.entries(rec).forEach(([key, value]) => {
    const el = recordForm.querySelector(`[name='${key}']`);
    if (el) el.value = value;
  });

  if (section.id === "sec-global-params") {
    document.getElementById("otherDataEditor").innerHTML = "";
    (rec.otherData || []).forEach((od) => addOtherDataRow(od));
    if (!rec.otherData?.length) addOtherDataRow();
  }
}

function saveRecord(event) {
  event.preventDefault();
  const section = getSection();
  const formData = new FormData(recordForm);

  if (!recordForm.reportValidity()) {
    showMessage("Заполните обязательные поля перед сохранением записи.", "error");
    return;
  }

  let payload;
  if (section.id === "sec-global-params") {
    payload = {
      id: state.editingRecordId || crypto.randomUUID(),
      name: formData.get("name")?.trim(),
      version: formData.get("version")?.trim(),
      author: formData.get("author")?.trim(),
      econModel: formData.get("econModel"),
      price_oil: formData.get("price_oil"),
      price_gas: formData.get("price_gas"),
      price_power: formData.get("price_power"),
      updatedAt: new Date().toLocaleString("ru-RU"),
      otherData: collectOtherData()
    };

    const duplicate = state.records[section.id].find((r) =>
      r.name === payload.name &&
      r.version === payload.version &&
      r.id !== payload.id
    );
    if (duplicate) {
      showMessage("Связка Название + Версия должна быть уникальной.", "error");
      return;
    }
  } else {
    payload = {
      id: state.editingRecordId || crypto.randomUUID(),
      name: formData.get("name")?.trim(),
      description: formData.get("description")?.trim()
    };
  }

  const list = state.records[section.id];
  const index = list.findIndex((r) => r.id === payload.id);
  if (index === -1) {
    list.push(payload);
  } else {
    list[index] = payload;
  }

  state.editingRecordId = null;
  showMessage("Запись успешно сохранена.", "success");
  render();
}

function collectOtherData() {
  const rows = [...recordForm.querySelectorAll("#otherDataEditor .grid-2")];
  return rows
    .map((row) => ({
      param: row.querySelector("select[name='other_param']")?.value,
      value: row.querySelector("input[name='other_value']")?.value.trim()
    }))
    .filter((x) => x.param || x.value);
}

function showMessage(text, kind) {
  formMessage.textContent = text;
  formMessage.className = `message ${kind}`;
}

window.editRecord = (id) => {
  state.editingRecordId = id;
  renderForm();
};

window.deleteRecord = (id) => {
  if (!window.confirm("Удалить запись? Действие нельзя отменить.")) return;
  const section = getSection();
  state.records[section.id] = state.records[section.id].filter((r) => r.id !== id);
  if (state.editingRecordId === id) state.editingRecordId = null;
  render();
};

function addSection() {
  const name = window.prompt("Введите название нового раздела:");
  if (!name?.trim()) return;
  const id = `sec-${Date.now()}`;
  state.sections.push({ id, name: name.trim() });
  state.records[id] = [];
  state.selectedSectionId = id;
  render();
}

function renameSection() {
  const section = getSection();
  const name = window.prompt("Новое имя раздела:", section.name);
  if (!name?.trim()) return;
  section.name = name.trim();
  render();
}

function removeSection() {
  const section = getSection();
  if (["sec-global-params", "sec-currencies", "sec-prices", "sec-global-data"].includes(section.id)) {
    window.alert("Базовые разделы удалить нельзя в прототипе.");
    return;
  }
  if (!window.confirm(`Удалить раздел «${section.name}» и все записи?`)) return;
  state.sections = state.sections.filter((s) => s.id !== section.id);
  delete state.records[section.id];
  state.selectedSectionId = "sec-global-params";
  render();
}

function resetForm() {
  state.editingRecordId = null;
  renderForm();
}

function render() {
  renderSections();
  renderRecordTable();
  renderForm();
}

document.getElementById("addSectionBtn").onclick = addSection;
document.getElementById("renameSectionBtn").onclick = renameSection;
document.getElementById("deleteSectionBtn").onclick = removeSection;
document.getElementById("addRecordBtn").onclick = () => {
  state.editingRecordId = null;
  renderForm();
};

document.getElementById("resetFormBtn").onclick = resetForm;
recordForm.addEventListener("submit", saveRecord);

render();

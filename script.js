/* PART 1 */
// 🔧 Global Variables
const usedDates = new Set();
const rowSummaryMap = {};
const expenseTypes = [
  { label: "BUS (बस)", value: "Bus" },
  { label: "TRAIN (ट्रेन)", value: "Train" },
  { label: "FLIGHT (फ्लाइट)", value: "Flight" },
  { label: "HOTEL (होटल)", value: "Hotel" },
  { label: "FOOD (भोजन)", value: "Food" },
  { label: "CAB/AUTO (कैब/ऑटो)", value: "CabAuto" },
  { label: "BIKE/CAR (बाइक/कार)", value: "BikeCar" },
  { label: "MISC (विविध)", value: "Misc" },
  { label: "OTHERS (अन्य)", value: "Others" }
];

document.addEventListener("DOMContentLoaded", () => {
  // Personal detail syncing
  document.getElementById("empId").addEventListener("input", e => {
    const enteredId = e.target.value.replace(/\D/g, '');
    document.getElementById("summary-empId").textContent = "JIPL" + enteredId;
    fetchEmployeeDetails(enteredId);
  });

  document.getElementById("empName").addEventListener("input", e => {
    document.getElementById("summary-empName").textContent = e.target.value;
  });

  document.getElementById("managerName").addEventListener("input", e => {
    document.getElementById("summary-manager").textContent = e.target.value;
  });

  window.fetchEmployeeDetails = function(id) {
    const fullId = `JIPL${id}`;
    if (id.length < 3) return;

    fetch(`https://script.google.com/macros/s/AKfycbyZdztMKjog8GkTvOoDznrEI7ke0-NKta8_6eG9_7hqzVYMp1i6UN9Ne5AYNKKUbAKp/exec?id=${fullId}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById("empName").value = data.name || "";
        document.getElementById("managerName").value = data.manager || "";
        document.getElementById("summary-empName").textContent = data.name || "—";
        document.getElementById("summary-manager").textContent = data.manager || "—";
      }).catch(err => alert("Could not fetch employee details."));
  };
});

window.addExpenseRow = function () {
  const container = document.getElementById("expense-entries");
  const rowId = `row-${Date.now()}`;
  rowSummaryMap[rowId] = [];

  const row = document.createElement("div");
  row.className = "expense-row";
  row.id = rowId;

  const today = new Date();
  const minDateStr = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
  const maxDateStr = today.toISOString().split("T")[0];

  row.innerHTML = `
    <label>DATE</label>
    <input type="date" id="date-${rowId}" required min="${minDateStr}" max="${maxDateStr}" />
    <div class="type-heading">EXPENSE TYPES</div>
    ${expenseTypes.map(type => `
      <div class="type-option" id="${type.value}-option-${rowId}">
        <label for="${type.value}-${rowId}">${type.label}</label>
        <input type="checkbox" id="${type.value}-${rowId}" />
        <button class="bin-icon" onclick="removeExpenseType('${type.value}-option-${rowId}', '${type.value}-fields-${rowId}', '${type.value}-summary-${rowId}', '${rowId}')">🗑</button>
      </div>
      <div id="${type.value}-fields-${rowId}" class="type-fields" style="display: none;">
        <input type="number" placeholder="Amount for ${type.label}" oninput="updateExpenseSummary('${type.value}-summary-${rowId}', this.value, '${rowId}')" />
        <input type="file" multiple onchange="handleFiles(this, '${type.value}-preview-${rowId}', '${type.value}-summary-${rowId}', '${rowId}')">
        <div class="file-preview" id="${type.value}-preview-${rowId}"></div>
      </div>
    `).join("")}
    <div class="button-row">
      <button type="button" onclick="removeRow('${rowId}')">🗑 REMOVE EXPENSE</button>
    </div>
  `;

  container.appendChild(row);

  const dateInput = document.getElementById(`date-${rowId}`);
dateInput.addEventListener("change", () => {
  const newDate = dateInput.value;
  usedDates.add(newDate);
  updateDatePickers();

  const newDateGroupId = `summary-date-${newDate}`;

  rowSummaryMap[rowId].forEach(summaryId => {
    const item = document.getElementById(summaryId);
    if (!item) return;

    // Get previous group before removal
    const previousGroup = item.closest(".date-group");
    const previousDateGroupId = previousGroup?.id || "";

    // Extract summary data
    const label = item.textContent.split("|")[0].trim();
    const amount = item.querySelector(".amount")?.textContent.replace("₹", "") || "0";
    const files = item.querySelector(".files")?.textContent.split(" ")[0] || "0";

    item.remove(); // Remove from old group
    addExpenseSummary(summaryId, label, amount, files, newDate, rowId); // Add to new group

    // 🔥 Remove old date group if empty
    if (
      previousGroup &&
      previousGroup.id !== newDateGroupId &&
      previousGroup.querySelectorAll(".expense-entry").length === 0
    ) {
      previousGroup.remove();
      const oldDate = previousGroup.id.replace("summary-date-", "");
      usedDates.delete(oldDate);
      updateDatePickers();
    }
  });

  updateDateTotal(newDateGroupId);
});

  expenseTypes.forEach(type => {
    const cb = document.getElementById(`${type.value}-${rowId}`);
    const fields = document.getElementById(`${type.value}-fields-${rowId}`);
    cb.addEventListener("change", () => {
      const selectedDate = dateInput.value || "Undated";
      if (cb.checked) {
        fields.style.display = "flex";
        const summaryId = `${type.value}-summary-${rowId}`;
        addExpenseSummary(summaryId, type.label, 0, 0, selectedDate, rowId);
        rowSummaryMap[rowId].push(summaryId);
      } else {
        fields.style.display = "none";
        removeExpenseSummary(`${type.value}-summary-${rowId}`);
      }
    });
  });
};

window.addExpenseSummary = function (summaryId, label, amount = 0, fileCount = 0, date, rowId) {
  const list = document.getElementById("summary-expense-list");
  const dateId = `summary-date-${date}`;
  let dateGroup = document.getElementById(dateId);

  if (!dateGroup) {
    dateGroup = document.createElement("div");
    dateGroup.id = dateId;
    dateGroup.className = "date-group";
    dateGroup.innerHTML = `
      <div class="date-header">
        <div class="date-label">${date}</div>
        <div class="date-total" id="total-${dateId}">Total: ₹0</div>
      </div>
      <div class="expense-entries"></div>
      <hr class="preview-divider" />
    `;
    list.appendChild(dateGroup);
  }

  const subList = dateGroup.querySelector(".expense-entries");
  const item = document.createElement("div");
  item.className = "expense-entry";
  item.id = summaryId;

  item.innerHTML = `${label} | <span class="amount">₹${amount}</span> | <span class="files">${fileCount} attachment${fileCount !== 1 ? "s" : ""}</span>`;
  subList.appendChild(item);
  updateDateTotal(dateId);
};

window.updateExpenseSummary = function (summaryId, amount, rowId) {
  const item = document.getElementById(summaryId);
  if (item) {
    const amountSpan = item.querySelector(".amount");
    if (amountSpan) amountSpan.textContent = `₹${amount}`;
  }

  const dateVal = document.getElementById(`date-${rowId}`)?.value || "Undated";
  const dateId = `summary-date-${dateVal}`;
  updateDateTotal(dateId);
};

window.updateAttachmentCount = function (summaryId, count) {
  const item = document.getElementById(summaryId);
  if (item) {
    const fileSpan = item.querySelector(".files");
    if (fileSpan) {
      fileSpan.textContent = `${count} attachment${count !== 1 ? "s" : ""}`;
    }
  }
};

function updateDateTotal(dateId) {
  const group = document.getElementById(dateId);
  if (!group) return;
  const entries = group.querySelectorAll(".expense-entry");

  let total = 0;
  entries.forEach(entry => {
    const amtText = entry.querySelector(".amount")?.textContent.replace("₹", "");
    if (amtText) total += parseFloat(amtText) || 0;
  });

  const totalEl = document.getElementById(`total-${dateId}`);
  if (totalEl) {
    totalEl.textContent = `Total: ₹${total}`;
    totalEl.classList.add("updated");
    setTimeout(() => totalEl.classList.remove("updated"), 300);
  }
}

window.removeExpenseSummary = function (summaryId) {
  const item = document.getElementById(summaryId);
  if (item) item.remove();
};


/* PART 4 */

window.handleFiles = function (input, previewId, summaryId, rowId) {
  const preview = document.getElementById(previewId);
  preview.innerHTML = "";

  const dt = new DataTransfer();
  const fileArray = Array.from(input.files);
  let liveCount = fileArray.length;

  fileArray.forEach((file, i) => {
    const pill = document.createElement("div");
    pill.textContent = file.name;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✖";
    removeBtn.onclick = () => {
      preview.removeChild(pill);
      fileArray.splice(i, 1);
      const newDT = new DataTransfer();
      fileArray.forEach(f => newDT.items.add(f));
      input.files = newDT.files;
      liveCount--;
      updateAttachmentCount(summaryId, liveCount);
    };

    pill.appendChild(removeBtn);
    preview.appendChild(pill);
    dt.items.add(file);
  });

  input.files = dt.files;
  updateAttachmentCount(summaryId, liveCount);
};

window.removeRow = function (rowId) {
  const row = document.getElementById(rowId);
  if (!row) return;

  const dateInput = document.getElementById(`date-${rowId}`);
  const dateVal = dateInput?.value;
  if (dateVal && usedDates.has(dateVal)) {
    usedDates.delete(dateVal);
    updateDatePickers();
  }

  const summaries = rowSummaryMap[rowId] || [];
  summaries.forEach(summaryId => {
    removeExpenseSummary(summaryId);
  });

  const dateGroupId = `summary-date-${dateVal}`;
  const dateGroup = document.getElementById(dateGroupId);
  if (dateGroup && dateGroup.querySelectorAll('.expense-entry').length === 0) {
    dateGroup.remove();
  } else {
    updateDateTotal(dateGroupId);
  }

  row.remove();
};
window.removeExpenseType = function (optionId, fieldId, summaryId, rowId) {
  document.getElementById(optionId)?.remove();
  document.getElementById(fieldId)?.remove();
  removeExpenseSummary(summaryId);

  const dateVal = document.getElementById(`date-${rowId}`)?.value;
  const dateId = `summary-date-${dateVal}`;
  const group = document.getElementById(dateId);

  if (group && group.querySelectorAll(".expense-entry").length === 0) {
    group.remove();
    usedDates.delete(dateVal);
    updateDatePickers();
  } else {
    updateDateTotal(dateId);
  }
};
window.updateDatePickers = function () {
  const allDateInputs = document.querySelectorAll('input[type="date"]');
  allDateInputs.forEach(input => {
    const currentVal = input.value;
    const dateAlreadyUsed = [...usedDates].filter(date => date !== currentVal);

    // Disable dates that have been used by other entries
    dateAlreadyUsed.forEach(date => {
      // No direct way to disable individual dates in native date picker
      // So we just prevent duplicates via validation and alert
    });
  });
};
document.getElementById("expense-form").addEventListener("submit", function (e) {
  e.preventDefault();
  document.getElementById("loader").style.display = "flex";

  const payload = {
    empId: document.getElementById("empId").value,
    empName: document.getElementById("empName").value,
    managerName: document.getElementById("managerName").value,
    expenses: []
  };

  const allGroups = document.querySelectorAll(".expense-row");
  allGroups.forEach(row => {
    const date = row.querySelector('input[type="date"]').value;
    expenseTypes.forEach(type => {
      const typeCheckbox = row.querySelector(`#${type.value}-${row.id}`);
      if (typeCheckbox?.checked) {
        const amountInput = row.querySelector(`#${type.value}-fields-${row.id} input[type="number"]`);
        const filesInput = row.querySelector(`#${type.value}-fields-${row.id} input[type="file"]`);
        payload.expenses.push({
          type: type.label,
          amount: amountInput?.value || "0",
          attachments: filesInput?.files.length || 0,
          date: date
        });
      }
    });
  });

  fetch("https://script.google.com/macros/s/AKfycbyZdztMKjog8GkTvOoDznrEI7ke0-NKta8_6eG9_7hqzVYMp1i6UN9Ne5AYNKKUbAKp/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(async res => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server responded with ${res.status}: ${text}`);
    }
    return res.text();
  })
  .then(msg => {
    alert("✅ Submitted successfully: " + msg);
    document.getElementById("loader").style.display = "none";
  })
  .catch(err => {
    alert("❌ Error submitting: " + err.message);
    console.error(err);
    document.getElementById("loader").style.display = "none";
  });
});

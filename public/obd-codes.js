// ============================================================
// GARAGE ARCADE — obd-codes.js
// Interactive DTC lookup table + popup diagnostic report.
// Reads data from /api/obd-codes.
// ============================================================

const dtcSearch = document.getElementById("dtcSearch");
const dtcMake = document.getElementById("dtcMake");
const dtcModel = document.getElementById("dtcModel");
const dtcClear = document.getElementById("dtcClear");
const dtcTableBody = document.getElementById("dtcTableBody");
const dtcCount = document.getElementById("dtcCount");
const dtcSelected = document.getElementById("dtcSelected");

const dtcModal = document.getElementById("dtcModal");
const dtcModalBody = document.getElementById("dtcModalBody");
const dtcModalClose = document.getElementById("dtcModalClose");
const dtcModalOverlay = document.getElementById("dtcModalOverlay");

let activeCode = null;
let debounceTimer = null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listToHtml(items, fallback) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p>${escapeHtml(fallback)}</p>`;
  }

  return `
    <ul class="dtc-list">
      ${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function asList(value, fallback = "Universal") {
  if (Array.isArray(value) && value.length) return value.join(", ");
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

async function fetchCodes() {
  const params = new URLSearchParams({
    q: dtcSearch.value.trim(),
    make: dtcMake.value.trim(),
    model: dtcModel.value.trim()
  });

  const response = await fetch(`/api/obd-codes?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch OBD codes");
  }

  return response.json();
}

function renderTable(codes) {
  dtcCount.textContent = codes.length;

  if (!codes.length) {
    dtcTableBody.innerHTML = `
      <tr>
        <td colspan="5">No matching diagnostic trouble codes found.</td>
      </tr>
    `;
    return;
  }

  dtcTableBody.innerHTML = codes.map(item => {
    const code = escapeHtml(item.code);
    const description = escapeHtml(item.description);
    const category = escapeHtml(item.category || "General OBD-II");
    const makes = escapeHtml(asList(item.makes));
    const models = escapeHtml(asList(item.models));

    return `
      <tr data-code="${code}" class="${activeCode === item.code ? "active" : ""}">
        <td><span class="dtc-code-pill">${code}</span></td>
        <td>${description}</td>
        <td>${category}</td>
        <td>${makes}</td>
        <td>${models}</td>
      </tr>
    `;
  }).join("");

  dtcTableBody.querySelectorAll("tr[data-code]").forEach(row => {
    row.addEventListener("click", () => {
      const selected = codes.find(item => item.code === row.dataset.code);
      if (selected) selectCode(selected);
    });
  });
}

function selectCode(item) {
  activeCode = item.code;
  dtcSelected.textContent = item.code;

  dtcTableBody.querySelectorAll("tr[data-code]").forEach(row => {
    row.classList.toggle("active", row.dataset.code === item.code);
  });

  const severityClass = escapeHtml(item.severity || "Medium").toLowerCase();
  const codeSlug = item.code.toLowerCase();
  dtcModalBody.innerHTML = `
    <p class="detail-kicker">DIAGNOSTIC REPORT</p>
    <h2 id="dtcModalTitle" class="dtc-modal-code">${escapeHtml(item.code)}</h2>
    <p class="dtc-modal-desc">${escapeHtml(item.description)}</p>

    <a class="hero-link" href="/codes/${codeSlug}/">Open full diagnostic report &rarr;</a>

    <div class="dtc-report-grid">
      <div class="dtc-detail-row">
        <span>SEVERITY</span>
        <strong class="severity ${severityClass}">${escapeHtml(item.severity || "Medium")}</strong>
      </div>

      <div class="dtc-detail-row">
        <span>ESTIMATED REPAIR COST</span>
        <strong>${escapeHtml(item.estimatedRepairCost || "Varies by vehicle and fault")}</strong>
      </div>

      <div class="dtc-detail-row">
        <span>FAULT CATEGORY</span>
        <strong>${escapeHtml(item.category || "General OBD-II")}</strong>
      </div>

      <div class="dtc-detail-row">
        <span>COMMON MAKES</span>
        <strong>${escapeHtml(asList(item.makes))}</strong>
      </div>
    </div>

    <div class="dtc-detail-row full">
      <span>CAN I DRIVE?</span>
      <p>${escapeHtml(item.canDrive || "Drive carefully and diagnose the issue as soon as possible.")}</p>
    </div>

    <div class="dtc-detail-row full">
      <span>COMMON SYMPTOMS</span>
      ${listToHtml(item.symptoms, "Symptoms vary by vehicle and engine condition.")}
    </div>

    <div class="dtc-detail-row full">
      <span>LIKELY CAUSES</span>
      ${listToHtml(item.causes, "Cause information not added yet.")}
    </div>

    <div class="dtc-detail-row full">
      <span>RECOMMENDED CHECKS</span>
      ${listToHtml(item.fixes, "Start with a visual inspection and confirm the code with a scanner.")}
    </div>

    <div class="dtc-detail-row full">
      <span>COMMON MODELS</span>
      <strong>${escapeHtml(asList(item.models))}</strong>
    </div>

    <div class="dtc-detail-row full">
      <span>REPORT NOTE</span>
      <p>This is a generic OBD-II guide. Final diagnosis depends on make, model, engine, ECU, wiring, and live sensor data.</p>
    </div>
  `;

  openModal();
}

function openModal() {
  dtcModal.classList.add("show");
  dtcModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-lock");
  dtcModalClose.focus();
}

function closeModal() {
  dtcModal.classList.remove("show");
  dtcModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-lock");
}

async function searchCodes() {
  try {
    dtcTableBody.innerHTML = `
      <tr>
        <td colspan="5">Scanning diagnostic trouble codes...</td>
      </tr>
    `;

    const codes = await fetchCodes();
    renderTable(codes);
  } catch (err) {
    console.error(err);
    dtcCount.textContent = "0";
    dtcTableBody.innerHTML = `
      <tr>
        <td colspan="5">Failed to load diagnostic trouble codes.</td>
      </tr>
    `;
  }
}

function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(searchCodes, 120);
}

function clearFilters() {
  dtcSearch.value = "";
  dtcMake.value = "";
  dtcModel.value = "";
  activeCode = null;
  dtcSelected.textContent = "NONE";
  searchCodes();
}

function initDtcLookup() {
  if (!dtcSearch || !dtcTableBody || !dtcModal) {
    console.error("DTC lookup could not start. Required HTML elements are missing.");
    return;
  }

  [dtcSearch, dtcMake, dtcModel].forEach(input => {
    input.addEventListener("input", debouncedSearch);
  });

  dtcClear.addEventListener("click", clearFilters);
  dtcModalClose.addEventListener("click", closeModal);
  dtcModalOverlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });

  searchCodes();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDtcLookup);
} else {
  initDtcLookup();
}

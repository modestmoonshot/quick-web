// ─── Storage (localStorage) ───

const STORAGE_KEY = "quick_notes";

function loadNotesFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveNotesToStorage(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or unavailable
  }
}

// ─── DOM ───

const editor = document.getElementById("editor");
const dot = document.getElementById("status-dot");
const exportBtn = document.getElementById("export-btn");
const deleteBtn = document.getElementById("delete-btn");
const newNoteBtn = document.getElementById("new-note-btn");
const emptyNewBtn = document.getElementById("empty-new-btn");
const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
const sidebar = document.getElementById("sidebar");
const notesList = document.getElementById("notes-list");
const boldBtn = document.getElementById("bold-btn");
const italicBtn = document.getElementById("italic-btn");
const underlineBtn = document.getElementById("underline-btn");
const sizeUpBtn = document.getElementById("size-up-btn");
const sizeDownBtn = document.getElementById("size-down-btn");
const fontSizeDisplay = document.getElementById("font-size-display");

let notes = [];
let activeNoteId = null;
let saveTimeout = null;

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 28;

function setDot(state) {
  dot.className = state;
  const labels = { saved: "Saved", editing: "Saving...", error: "Error saving" };
  dot.title = labels[state] || "";
}

function getEditorContent() {
  return editor.innerHTML;
}

function setEditorContent(html) {
  editor.innerHTML = html;
}

function textContent(html) {
  const normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<p[^>]*>/gi, "");
  const el = document.createElement("div");
  el.innerHTML = normalized;
  return el.textContent || "";
}

function noteTitle(content) {
  const text = textContent(content);
  const firstLine = text.split("\n")[0].trim();
  return firstLine || "Untitled";
}

function notePreview(content) {
  const text = textContent(content);
  const lines = text.split("\n");
  const second = lines.slice(1).find((l) => l.trim() !== "");
  return second ? second.trim() : "";
}

function formatDate(ms) {
  const d = new Date(ms);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function renderNotesList() {
  notesList.innerHTML = "";
  for (const note of notes) {
    const item = document.createElement("div");
    item.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    item.dataset.id = note.id;

    const title = document.createElement("div");
    title.className = "note-item-title";
    title.textContent = noteTitle(note.content);

    const preview = document.createElement("div");
    preview.className = "note-item-preview";
    preview.textContent = notePreview(note.content);

    const date = document.createElement("div");
    date.className = "note-item-date";
    date.textContent = formatDate(note.updated_at);

    item.appendChild(title);
    item.appendChild(preview);
    item.appendChild(date);

    item.addEventListener("click", () => {
      selectNote(note.id);
      // On mobile, close sidebar after selecting
      if (window.innerWidth <= 600) {
        sidebar.classList.add("hidden");
      }
    });
    notesList.appendChild(item);
  }

  document.body.classList.toggle("no-notes", notes.length === 0);
}

function selectNote(id) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (activeNoteId && activeNoteId !== id) {
    const current = notes.find((n) => n.id === activeNoteId);
    if (current) {
      current.content = getEditorContent();
      saveNotesToStorage(notes);
    }
  }

  activeNoteId = id;
  const note = notes.find((n) => n.id === id);
  if (note) {
    if (note.content && !/<[a-z][\s\S]*>/i.test(note.content)) {
      note.content = note.content
        .split("\n")
        .map((line) => line || "<br>")
        .join("<br>");
    }
    setEditorContent(note.content);
    editor.focus();
  }
  renderNotesList();
  setDot("saved");
  resetFormatButtons();
}

function loadNotes() {
  notes = loadNotesFromStorage();
  notes.sort((a, b) => b.updated_at - a.updated_at);
  if (notes.length > 0) {
    selectNote(notes[0].id);
  }
  renderNotesList();
  setDot("saved");
}

function createNote() {
  if (activeNoteId) {
    const current = notes.find((n) => n.id === activeNoteId);
    if (current) {
      current.content = getEditorContent();
      saveNotesToStorage(notes);
    }
  }

  const note = {
    id: String(Date.now()),
    content: "",
    updated_at: Date.now(),
  };
  notes.unshift(note);
  saveNotesToStorage(notes);
  selectNote(note.id);
}

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  setDot("editing");

  const note = notes.find((n) => n.id === activeNoteId);
  if (note) {
    note.content = getEditorContent();
    note.updated_at = Date.now();
    notes.sort((a, b) => b.updated_at - a.updated_at);
    renderNotesList();
  }

  saveTimeout = setTimeout(() => {
    try {
      saveNotesToStorage(notes);
      setDot("saved");
    } catch {
      setDot("error");
    }
  }, 500);
}

function deleteNote() {
  if (!activeNoteId) return;
  notes = notes.filter((n) => n.id !== activeNoteId);
  saveNotesToStorage(notes);
  if (notes.length > 0) {
    selectNote(notes[0].id);
  } else {
    activeNoteId = null;
    setEditorContent("");
    renderNotesList();
    setDot("saved");
  }
}

function exportNote() {
  const title = activeNoteId
    ? noteTitle(notes.find((n) => n.id === activeNoteId)?.content || "")
    : "quick";
  const defaultName =
    title.replace(/[^a-zA-Z0-9 _-]/g, "").substring(0, 50) + ".txt";

  const blob = new Blob([textContent(getEditorContent())], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(url);
}

function toggleSidebar() {
  sidebar.classList.toggle("hidden");
}

// ─── Formatting ───

function getCurrentFontSize() {
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const node = sel.focusNode;
    const el = node?.nodeType === 3 ? node.parentElement : node;
    if (el && editor.contains(el)) {
      return Math.round(parseFloat(window.getComputedStyle(el).fontSize));
    }
  }
  return 14;
}

function resetFormatButtons() {
  boldBtn.classList.remove("active");
  italicBtn.classList.remove("active");
  underlineBtn.classList.remove("active");
  fontSizeDisplay.textContent = "14";
}

let underlineJustToggled = false;
let underlineOptimistic = false;

function checkUnderlineFromDOM() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return false;
  const node = sel.focusNode;
  if (!node || !editor.contains(node)) return false;

  let el = node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== editor) {
    const tag = el.tagName;
    if (tag === "U") return true;
    const style = window.getComputedStyle(el);
    if (style.textDecorationLine.includes("underline")) return true;
    el = el.parentElement;
  }
  return false;
}

function updateFormatState() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.anchorNode;
  if (!node || !editor.contains(node)) return;

  try {
    boldBtn.classList.toggle("active", document.queryCommandState("bold"));
    italicBtn.classList.toggle("active", document.queryCommandState("italic"));
  } catch (e) {}

  if (underlineJustToggled) {
    underlineBtn.classList.toggle("active", underlineOptimistic);
  } else {
    underlineBtn.classList.toggle("active", checkUnderlineFromDOM());
  }

  fontSizeDisplay.textContent = getCurrentFontSize();
}

let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  if (savedRange) {
    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  } else {
    editor.focus();
  }
}

function applyFormat(action) {
  restoreSelection();

  if (action === "underline") {
    const wasUnderline = checkUnderlineFromDOM();
    document.execCommand("underline");
    underlineOptimistic = !wasUnderline;
    underlineJustToggled = true;
    setTimeout(() => { underlineJustToggled = false; }, 0);
  } else {
    switch (action) {
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "bigger":
        changeFontSize(2);
        break;
      case "smaller":
        changeFontSize(-2);
        break;
    }
  }

  updateFormatState();
  scheduleSave();
}

function changeFontSize(delta) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const currentSize = getCurrentFontSize();
  const newSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, currentSize + delta));

  if (range.collapsed) {
    const span = document.createElement("span");
    span.style.fontSize = newSize + "px";
    span.textContent = "\u200B";
    range.insertNode(span);
    const newRange = document.createRange();
    newRange.setStart(span.firstChild, 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return;
  }

  const span = document.createElement("span");
  span.style.fontSize = newSize + "px";
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.addRange(newRange);
  } catch (e) {
    document.execCommand("fontSize", false, "7");
    const fontElements = editor.querySelectorAll('font[size="7"]');
    fontElements.forEach((el) => {
      el.removeAttribute("size");
      el.style.fontSize = newSize + "px";
    });
  }
}

// ─── Event Listeners ───

editor.addEventListener("keyup", () => {
  underlineJustToggled = false;
  updateFormatState();
});
editor.addEventListener("mouseup", () => {
  underlineJustToggled = false;
  updateFormatState();
});
editor.addEventListener("input", () => {
  updateFormatState();
  scheduleSave();
});
editor.addEventListener("focus", updateFormatState);

// Save selection whenever it changes in the editor
editor.addEventListener("keyup", saveSelection);
editor.addEventListener("mouseup", saveSelection);
document.addEventListener("selectionchange", () => {
  const sel = window.getSelection();
  if (sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    saveSelection();
  }
});

function preventFocusSteal(e) {
  e.preventDefault();
}

// Desktop: prevent focus steal on mousedown
boldBtn.addEventListener("mousedown", preventFocusSteal);
italicBtn.addEventListener("mousedown", preventFocusSteal);
underlineBtn.addEventListener("mousedown", preventFocusSteal);
sizeUpBtn.addEventListener("mousedown", preventFocusSteal);
sizeDownBtn.addEventListener("mousedown", preventFocusSteal);

// Mobile: handle format on touchend (touchstart preventDefault would block click)
let handledByTouch = false;

function mobileFmt(action) {
  return function(e) {
    e.preventDefault();
    handledByTouch = true;
    applyFormat(action);
  };
}

function clickFmt(action) {
  return function() {
    if (handledByTouch) {
      handledByTouch = false;
      return;
    }
    applyFormat(action);
  };
}

boldBtn.addEventListener("touchend", mobileFmt("bold"));
italicBtn.addEventListener("touchend", mobileFmt("italic"));
underlineBtn.addEventListener("touchend", mobileFmt("underline"));
sizeUpBtn.addEventListener("touchend", mobileFmt("bigger"));
sizeDownBtn.addEventListener("touchend", mobileFmt("smaller"));

boldBtn.addEventListener("click", clickFmt("bold"));
italicBtn.addEventListener("click", clickFmt("italic"));
underlineBtn.addEventListener("click", clickFmt("underline"));
sizeUpBtn.addEventListener("click", clickFmt("bigger"));
sizeDownBtn.addEventListener("click", clickFmt("smaller"));

editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    document.execCommand("insertText", false, "\t");
    scheduleSave();
  }
});

exportBtn.addEventListener("click", exportNote);
deleteBtn.addEventListener("click", deleteNote);
newNoteBtn.addEventListener("click", createNote);
emptyNewBtn.addEventListener("click", createNote);
toggleSidebarBtn.addEventListener("click", toggleSidebar);

// Keyboard shortcuts (Cmd on Mac, Ctrl on others)
document.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.shiftKey && e.key === "s") {
    e.preventDefault();
    exportNote();
  }
  if (mod && e.key === "\\") {
    e.preventDefault();
    toggleSidebar();
  }
  if (mod && e.key === "n") {
    e.preventDefault();
    createNote();
  }
  if (mod && e.shiftKey && (e.key === "=" || e.key === "+")) {
    e.preventDefault();
    applyFormat("bigger");
  }
  if (mod && e.shiftKey && (e.key === "-" || e.key === "_")) {
    e.preventDefault();
    applyFormat("smaller");
  }
});

// Start hidden on mobile
if (window.innerWidth <= 600) {
  sidebar.classList.add("hidden");
}

loadNotes();

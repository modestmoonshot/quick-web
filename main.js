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
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const notesList = document.getElementById("notes-list");

let notes = [];
let activeNoteId = null;
let saveTimeout = null;

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
      if (window.innerWidth <= 600) {
        sidebar.classList.add("hidden");
        sidebarBackdrop.classList.remove("active");
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
  const isHidden = sidebar.classList.toggle("hidden");
  if (window.innerWidth <= 600) {
    sidebarBackdrop.classList.toggle("active", !isHidden);
  }
}

sidebarBackdrop.addEventListener("click", () => {
  sidebar.classList.add("hidden");
  sidebarBackdrop.classList.remove("active");
});

// ─── Event Listeners ───

editor.addEventListener("input", scheduleSave);

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
});

// Start hidden on mobile
if (window.innerWidth <= 600) {
  sidebar.classList.add("hidden");
}

loadNotes();

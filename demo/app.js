"use strict";

const { createReminderStore, route } = globalThis.EchoCampus;
const { week } = globalThis.EchoCampusSample;
const byId = id => document.getElementById(id);
const language = byId("language");
const speechToggle = byId("speak");
const voiceStatus = byId("voice-status");
const transcript = byId("transcript");
const mic = byId("mic");
const question = byId("question");
const taskInput = byId("task");
const synth = globalThis.speechSynthesis;
const locale = { en: "en-US", zh: "zh-CN" };
let reminders;
let clarification;
try {
  reminders = createReminderStore(globalThis.localStorage);
} catch {
  reminders = null;
}

function renderSchedule() {
  const lang = language.value;
  const items = week.map(day => {
    const li = document.createElement("li");
    li.lang = lang;
    const classes = day.classes.map(item => `${item.start}–${item.end} ${item[lang]}`).join(" · ");
    li.textContent = `${day[lang]}: ${classes || (lang === "zh" ? "无课" : "No classes")}`;
    return li;
  });
  byId("schedule").replaceChildren(...items);
}

function renderReminders() {
  const list = byId("reminders");
  const lang = language.value;
  const local = (en, zh) => lang === "zh" ? zh : en;
  list.lang = lang;
  try {
    const entries = reminders.list();
    const items = entries.map(item => {
      const li = document.createElement("li");
      li.textContent = `#${item.id} ${item.task}`;
      if (item.completed) {
        li.append(local(" — complete", " — 已完成"));
      } else {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = local("Complete", "完成");
        button.setAttribute("aria-label", local(`Complete reminder ${item.id}`, `完成提醒${item.id}`));
        button.addEventListener("click", () => {
          const result = submit(local(`Complete reminder ${item.id}`, `完成提醒${item.id}`));
          if (result.slots.reminder_id) byId("task").focus();
        });
        li.append(button);
      }
      return li;
    });
    list.replaceChildren(...items);
    if (items.length) return;
    const empty = document.createElement("li");
    empty.textContent = local("No study reminders yet.", "还没有学习提醒。");
    list.append(empty);
  } catch {
    const error = document.createElement("li");
    error.textContent = local("Local reminder storage is unavailable.", "本地提醒存储不可用。");
    list.replaceChildren(error);
  }
}

function speak(result) {
  if (!speechToggle.checked) return;
  if (!synth || !globalThis.SpeechSynthesisUtterance) {
    voiceStatus.textContent = "Spoken replies are unavailable; read the response above.";
    return;
  }
  synth.cancel();
  const audio = new SpeechSynthesisUtterance(result.text);
  audio.lang = locale[result.lang];
  audio.rate = 0.95;
  audio.onerror = ({ error }) => {
    if (error !== "canceled" && error !== "interrupted") {
      voiceStatus.textContent = "Could not play speech. Read the response above.";
    }
  };
  synth.speak(audio);
}

function submit(input, followUp = false) {
  const result = route(input, { reminders, preferredLanguage: language.value, clarification: followUp ? clarification : undefined });
  clarification = result.clarification;
  byId("intent").textContent = result.intent.replaceAll("_", " ").toUpperCase();
  const reply = byId("reply");
  reply.lang = result.lang;
  reply.textContent = result.text;
  const turn = document.createElement("li");
  const userLine = document.createElement("p");
  userLine.textContent = `You: ${input}`;
  const agentLine = document.createElement("p");
  agentLine.lang = result.lang;
  agentLine.textContent = `EchoCampus: ${result.text}`;
  turn.append(userLine, agentLine);
  transcript.append(turn);
  byId("transcript-empty").hidden = true;
  if (result.intent === "study_reminder") renderReminders();
  speak(result);
  return result;
}

byId("ask-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!question.value.trim()) return;
  submit(question.value.trim(), true);
  question.value = "";
});

byId("reminder-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!taskInput.value.trim()) return;
  const prefix = language.value === "zh" ? "提醒我" : "Remind me to ";
  const result = submit(prefix + taskInput.value.trim());
  if (result.slots.task) taskInput.value = "";
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => submit(button.dataset.prompt));
});

language.addEventListener("change", () => {
  renderSchedule();
  renderReminders();
});

speechToggle.addEventListener("change", () => {
  if (!speechToggle.checked) synth?.cancel();
});

const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
if (SpeechRecognition) {
  let active;
  mic.addEventListener("click", () => {
    if (active) {
      active.stop();
      return;
    }
    synth?.cancel();
    const recognition = new SpeechRecognition();
    recognition.lang = locale[language.value];
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      mic.setAttribute("aria-pressed", "true");
      voiceStatus.textContent = "Listening…";
    };
    recognition.onresult = event => {
      const heard = event.results[0][0].transcript.trim();
      voiceStatus.textContent = "Speech received. You can also type a question.";
      if (heard) submit(heard, true);
    };
    recognition.onerror = () => {
      voiceStatus.textContent = "Mic input failed or was blocked. Type your question instead.";
    };
    recognition.onend = () => {
      active = null;
      mic.setAttribute("aria-pressed", "false");
      if (voiceStatus.textContent === "Listening…") voiceStatus.textContent = "Mic stopped. Type or try again.";
    };
    try {
      recognition.start();
      active = recognition;
    } catch {
      voiceStatus.textContent = "Mic input could not start. Type your question instead.";
    }
  });
} else {
  mic.disabled = true;
  voiceStatus.textContent = "Speech recognition isn't supported here. Type your question instead.";
}

renderSchedule();
renderReminders();

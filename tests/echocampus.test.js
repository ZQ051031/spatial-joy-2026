"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const config = require("../agent/agent.json");
const manifest = require("../agent/studio/app.json");
const { route, lookupSchedule, createReminderStore } = require("../agent/studio/lib/router.js");

function inMemoryStorage() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value)
  };
}

const intents = ["campus_qa", "schedule_help", "study_reminder", "help", "fallback"];
const mandarin = /[\u3400-\u9fff]/u;

test("agent spec declares the target, bilingual content, intents, and referenced slots", () => {
  assert.equal(config.category, "learning");
  assert.equal(config.target, "Rokid AI Glasses");
  assert.deepEqual(config.languages, ["en", "zh"]);
  for (const field of ["name", "description", "wakePhrase", "systemPrompt", "safetyPrivacy"]) {
    assert.match(config[field].en, /[a-z]/i, field);
    assert.match(config[field].zh, mandarin, field);
  }
  assert.deepEqual(Object.keys(config.intents), intents);
  for (const [name, { slots, utterances, reply }] of Object.entries(config.intents)) {
    assert.ok(Array.isArray(slots), name);
    assert.match(reply.en, /[a-z]/i, name);
    assert.match(reply.zh, mandarin, name);
    for (const slot of slots) assert.ok(config.slots[slot]?.type, slot);
    for (const [lang, pattern] of [["en", /[a-z]/i], ["zh", mandarin]]) {
      assert.ok(utterances[lang].length >= 2, name);
      for (const prompt of utterances[lang]) assert.match(prompt, pattern, name);
    }
  }
  assert.deepEqual(config.tts, { enabled: true, localeByLanguage: { en: "en-US", zh: "zh-CN" }, rate: 0.95, maxSentences: 2 });
  assert.deepEqual(config.capabilities, ["live voice input", "text-to-speech audio output"]);
});

test("all documented utterances route in English and Mandarin", () => {
  const reminders = createReminderStore(inMemoryStorage());
  for (const [intent, spec] of Object.entries(config.intents)) {
    for (const lang of config.languages) {
      for (const prompt of spec.utterances[lang]) {
        const response = route(prompt, { reminders });
        assert.equal(response.intent, intent, prompt);
        assert.equal(response.lang, lang, prompt);
        assert.ok(response.text.trim(), prompt);
      }
    }
  }
});

test("campus answers label sample data and exam prompts include an official-notice caveat", () => {
  for (const [prompt, topic] of [
    ["Library hours", "library"], ["Where is the canteen?", "dining"],
    ["校车几点发车", "shuttle"], ["考场在哪儿", "exam"]
  ]) {
    const result = route(prompt);
    assert.equal(result.slots.campus_topic, topic);
    assert.match(result.text, /^(Sample data\.|示例数据。)/);
  }
  assert.match(route("Where is the exam venue?").text, /check your official exam notice/i);
  assert.match(route("考场在哪儿").text, /核对学校的正式通知/);
});

test("help, wake phrase, and out-of-scope requests reply without assuming campus facts", () => {
  assert.equal(route(config.wakePhrase.en).intent, "help");
  assert.equal(route(config.wakePhrase.zh).intent, "help");
  assert.deepEqual(route("42", { preferredLanguage: "zh" }).slots, {});
  assert.match(route("42", { preferredLanguage: "zh" }).text, mandarin);
  assert.equal(route("What is 12 times 4?").intent, "fallback");
});

test("schedule resolves English and Chinese weekdays, today, empty days, and missing days", () => {
  assert.deepEqual(lookupSchedule("MONDAY"), lookupSchedule("周一"));
  assert.equal(lookupSchedule("never"), null);
  assert.match(route("What is my Monday schedule?").text, /Calculus at 09:00, then Writing Lab at 13:00/);
  assert.match(route("星期一有什么课？").text, /示例数据。周一：09:00微积分/);
  assert.match(route("Classes today?", { now: new Date(2027, 0, 6, 12) }).text, /No classes on Wednesday/);
  assert.match(route("Show my schedule").text, /Which day/);
  assert.match(route("Friday").text, /Computer Science at 14:00/);
});

test("study block avoids scheduled Monday classes", () => {
  const result = route("Find a study block on Monday");
  assert.deepEqual(result.slots, { schedule_action: "study_block", day: "Monday" });
  const [, start, end] = result.text.match(/from (\d\d:\d\d) to (\d\d:\d\d)/);
  assert.ok(lookupSchedule("Monday").classes.every(item => end <= item.start || start >= item.end));
  assert.match(route("周一什么时候可以自习？").text, /示例数据。周一可以在10:00到10:30自习/);
});

test("today's study block starts at or after now and avoids classes", () => {
  const onMonday = (hour, minute, second = 0) => ({ now: new Date(2027, 0, 4, hour, minute, second) });
  assert.match(route("Find a study block today", onMonday(8, 5)).text, /10:00 to 10:30/);
  assert.match(route("Find a study block today", onMonday(13, 10)).text, /14:30 to 15:00/);
  assert.match(route("Find a study block today", onMonday(15, 5, 20)).text, /15:06 to 15:36/);
  assert.match(route("今天什么时候可以自习？", onMonday(16, 30)).text, /16:30到17:00/);
  assert.match(route("Find a study block today", onMonday(16, 30, 1)).text, /No open 30-minute study block/);
});

test("reminder commands add, list, and complete persistent study tasks", () => {
  const storage = inMemoryStorage();
  const reminders = createReminderStore(storage);
  assert.match(route("List my reminders", { reminders }).text, /No open/);
  assert.match(route("Remind me to Review physics", { reminders }).text, /Reminder 1 saved: Review physics\. No alarm/);
  assert.match(route("提醒我复习微积分", { reminders }).text, /提醒2已保存：复习微积分/);
  const reopened = createReminderStore(storage);
  assert.match(route("List my reminders", { reminders: reopened }).text, /1: Review physics; 2: 复习微积分/);
  assert.match(route("Complete reminder number one", { reminders: reopened }).text, /Reminder 1 is complete/);
  assert.match(route("完成提醒二", { reminders: reopened }).text, /提醒2已完成/);
  assert.deepEqual(reminders.list().map(({ id, completed }) => [id, completed]), [[1, true], [2, true]]);
  assert.match(route("查看提醒", { reminders }).text, /没有待完成/);
});

test("reminders keep the original task text while normalizing the command", () => {
  const reminders = createReminderStore(inMemoryStorage());
  const task = "Solve x² + y² on page Ⅳ!";
  assert.equal(route(`Ｒｅｍｉｎｄ ｍｅ ｔｏ： ${task}`, { reminders }).slots.task, task);
  assert.equal(reminders.list()[0].task, task);
});

test("an ambiguous spoken ID never completes the first matching digit", () => {
  const reminders = createReminderStore(inMemoryStorage());
  for (let id = 1; id <= 12; id++) reminders.add(`Task ${id}`);
  assert.match(route("Complete reminder one two", { reminders }).text, /Which reminder number/);
  assert.match(route("Complete reminder one hundred", { reminders }).text, /Which reminder number/);
  assert.match(route("Complete reminder -1 please", { reminders }).text, /Which reminder number/);
  assert.match(route("Complete reminder minus one", { reminders }).text, /Which reminder number/);
  assert.match(route("完成提醒一二", { reminders }).text, /请说编号/);
  assert.ok(reminders.list().every(item => !item.completed));
  assert.equal(route("Complete reminder 12", { reminders }).slots.reminder_id, 12);
  assert.deepEqual(reminders.list().filter(item => item.completed).map(item => item.id), [12]);
});

test("Chinese conjunctions and commas separate alternative reminder IDs", () => {
  const reminders = createReminderStore(inMemoryStorage());
  reminders.add("Review calculus");
  reminders.add("Read chapter 2");
  for (const ids of ["第一条或二", "一或者二", "一和二", "一、二", "一,二"]) {
    const result = route(`完成提醒${ids}`, { reminders });
    assert.equal(result.clarification?.field, "reminder_id", ids);
  }
  assert.ok(reminders.list().every(item => !item.completed));
});

test("negated reminder-number replies ask again without completing a reminder", () => {
  const reminders = createReminderStore(inMemoryStorage());
  reminders.add("Review calculus");
  const { clarification } = route("Complete reminder", { reminders });
  for (const prompt of ["Not number one", "Don't pick 1", "不是第一条", "不要选第一条"]) {
    const result = route(prompt, { reminders, clarification });
    assert.equal(result.clarification?.field, "reminder_id", prompt);
    assert.equal(result.slots.reminder_id, undefined, prompt);
  }
  assert.equal(reminders.list()[0].completed, false);
});

test("completion accepts one bilingual ID with filler in a command or follow-up", () => {
  const reminders = createReminderStore(inMemoryStorage());
  for (let id = 1; id <= 12; id++) reminders.add(`Task ${id}`);
  const { clarification } = route("Complete reminder", { reminders });
  for (const [command, expected, pending] of [
    ["Complete reminder 1 please", 1],
    ["Please finish reminder number twelve, thanks", 12],
    ["请完成提醒第十二条，谢谢", 12],
    ["Number one", 1, clarification],
    ["第一条", 1, clarification],
    ["请选2号，谢谢", 2, clarification],
    ["请选三号，谢谢", 3, clarification]
  ]) {
    assert.equal(route(command, { reminders, clarification: pending }).slots.reminder_id, expected, command);
  }
  for (const ambiguous of ["one two", "number four or five please", "第四条或5号"]) {
    assert.equal(route(ambiguous, { reminders, clarification }).clarification?.field, "reminder_id", ambiguous);
  }
  assert.equal(route("When is the library open at 4?", { reminders, clarification }).intent, "campus_qa");
  assert.deepEqual(reminders.list().filter(item => item.completed).map(item => item.id), [1, 2, 3, 12]);
});

test("missing, invalid, unknown and failed reminder writes never confirm a save", () => {
  const reminders = createReminderStore(inMemoryStorage());
  assert.match(route("Remind me to", { reminders }).text, /What study task/);
  assert.match(route("Complete reminder", { reminders }).text, /Which reminder number/);
  assert.match(route("Complete reminder 8", { reminders }).text, /couldn't find/);
  assert.match(route("Remind me to " + "x".repeat(101), { reminders }).text, /under 101/);
  assert.deepEqual(reminders.list(), []);
  const broken = createReminderStore({ getItem: () => null, setItem: () => { throw new Error("blocked"); } });
  assert.match(route("Remind me to review physics", { reminders: broken }).text, /No changes were saved/);
});

test("clarification replies fill the missing task, reminder ID, or study-block day", () => {
  const reminders = createReminderStore(inMemoryStorage());
  reminders.add("Read chapter 2");
  const reply = (request, followUp) => {
    const { clarification } = route(request, { reminders });
    return route(followUp, { reminders, clarification });
  };

  assert.equal(reply("Remind me", "read chapter 3").slots.task, "read chapter 3");
  assert.match(reply("完成提醒", "2").text, /提醒2已完成/);
  assert.ok(reminders.list()[1].completed);
  assert.deepEqual(reply("Find a study block", "Friday").slots, { schedule_action: "study_block", day: "Friday" });
  assert.equal(reply("Find a study block", "Where is the library?").intent, "campus_qa");
});

test("a new campus or schedule question supersedes a pending reminder task", () => {
  const reminders = createReminderStore(inMemoryStorage());
  const { clarification } = route("Remind me", { reminders });
  for (const [question, intent] of [
    ["When does the library close?", "campus_qa"],
    ["What's my Monday schedule?", "schedule_help"],
    ["Do I have classes on Monday?", "schedule_help"],
    ["Do I have classes on Monday", "schedule_help"],
    ["Are Monday classes in the sample schedule", "schedule_help"],
    ["图书馆几点关门？", "campus_qa"],
    ["How late is the library open", "campus_qa"],
    ["Library hours?", "campus_qa"],
    ["图书馆几点关门", "campus_qa"]
  ]) {
    const result = route(question, { reminders, clarification });
    assert.equal(result.intent, intent);
    assert.equal(result.clarification, undefined);
  }
  assert.deepEqual(reminders.list(), []);
  assert.equal(route("Remind me to return my library book", { reminders, clarification }).slots.task, "return my library book");
});

test("a pending reminder task keeps non-question replies with campus or schedule keywords", () => {
  const reminders = createReminderStore(inMemoryStorage());
  const tasks = ["Return my library book", "Review Monday class notes", "把书还给图书馆"];
  const { clarification } = route("Remind me", { reminders });
  for (const task of tasks) {
    const result = route(task, { reminders, clarification });
    assert.equal(result.slots.task, task);
    assert.equal(result.clarification, undefined);
  }
  assert.deepEqual(reminders.list().map(item => item.task), tasks);
  assert.ok(reminders.list().every(item => !item.completed));
});

test("explicit reminder completion commands take priority over a pending task and question punctuation", () => {
  const reminders = createReminderStore(inMemoryStorage());
  const { clarification } = route("Remind me", { reminders });
  const commands = ["Finish reminder 1?", "Complete reminder 2", "Done with reminder 3?", "完成提醒第四条？"];
  for (const [index, command] of commands.entries()) {
    reminders.add(`Read chapter ${index + 1}`);
    const result = route(command, { reminders, clarification });
    assert.deepEqual(result.slots, { reminder_action: "complete", reminder_id: index + 1 }, command);
    assert.equal(result.clarification, undefined);
  }
  assert.equal(reminders.list().length, commands.length);
  assert.ok(reminders.list().every(item => item.completed));
});

test("a task verb takes priority over embedded Chinese question words in a pending reminder task", () => {
  const reminders = createReminderStore(inMemoryStorage());
  const { clarification } = route("提醒我", { reminders });
  const tasks = ["复习怎么解方程", "练习怎么去图书馆", "Study how to solve equations"];
  for (const task of tasks) {
    const result = route(task, { reminders, clarification });
    assert.equal(result.slots.task, task);
    assert.equal(result.clarification, undefined);
  }
  assert.deepEqual(reminders.list().map(item => item.task), tasks);
});

test("an unmatched question re-asks for the pending task without saving it", () => {
  const reminders = createReminderStore(inMemoryStorage());
  const { clarification } = route("Remind me", { reminders });
  assert.equal(route("What's the weather?", { reminders }).intent, "fallback");
  const result = route("What's the weather?", { reminders, clarification });
  assert.equal(result.text, "What study task should I remember?");
  assert.deepEqual(result.clarification, clarification);
  assert.deepEqual(route("Study how to solve equations?", { reminders, clarification }).clarification, clarification);
  assert.deepEqual(reminders.list(), []);
  assert.equal(route("Read chapter 3", { reminders, clarification: result.clarification }).slots.task, "Read chapter 3");
});

test("AIUI page routes a chat question and a one-turn microphone result to localized speech", () => {
  const studio = path.join(__dirname, "../agent/studio");
  assert.deepEqual(manifest.permissions, ["RECORD_AUDIO"]);
  const ink = fs.readFileSync(path.join(studio, manifest.pages[0] + ".ink"), "utf8");
  const definition = JSON.parse(ink.match(/<script def>([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(definition.schema.data.required, ["question"]);
  const spoken = [];
  let mic;
  const context = vm.createContext({
    localStorage: inMemoryStorage(),
    SpeechRecognition: class {
      constructor() { mic = this; }
      start() { this.started = true; }
      abort() { this.aborted = true; }
    },
    SpeechSynthesisUtterance: class {
      constructor(text) { this.text = text; }
    },
    speechSynthesis: { speak(utterance, mode) { spoken.push({ ...utterance, mode }); } }
  });
  const setup = ink.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import "([^"]+)";$/gm, (_, modulePath) => {
    const file = path.resolve(studio, path.dirname(manifest.pages[0]), modulePath);
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
    return "";
  });
  const page = vm.runInContext(setup.replace("export default", "globalThis.page ="), context);
  page.setData = function (patch) { Object.assign(this.data, patch); };
  page.onLoad({ question: "Where is the cafeteria?" });
  assert.match(page.data.reply, /Sample data.*student center/);
  assert.equal(spoken.at(-1).voice, "English_radiant_girl");
  page.listenMandarin();
  assert.ok(mic.started);
  assert.equal(mic.lang, "zh-CN");
  mic.onresult({ resultIndex: 0, results: [[{ transcript: "提醒我复习物理" }]] });
  assert.match(page.data.reply, /提醒1已保存/);
  assert.equal(spoken.at(-1).voice, "female-tianmei");
  assert.equal(spoken.at(-1).mode, "immediate");
  page.onHide();
  assert.ok(mic.aborted);
  assert.equal(page.data.status, "Ready / 就绪");
});

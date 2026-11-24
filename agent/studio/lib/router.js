(function (createRouter) {
  if (typeof module === "object" && module.exports) module.exports = createRouter(require("./sample-data.js"));
  else globalThis.EchoCampus = createRouter(globalThis.EchoCampusSample);
})(function (sample) {
  "use strict";

  const KEY = "echocampus.reminders.v1";
  const campusTopics = {
    library: /\blibrar(?:y|ies)\b|图书馆/,
    dining: /\b(dining|cafeteria|canteen)\b|食堂/,
    shuttle: /\bshuttle\b|校车/,
    exam: /\bexam(s)?\b.*\b(venue|room|location)\b|\bwhere\b.*\bexam\b|考场/
  };
  const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

  function languageOf(text, preferred = "en") {
    if (/[\u3400-\u9fff]/u.test(text)) return "zh";
    if (/[a-z]/i.test(text)) return "en";
    return preferred === "zh" ? "zh" : "en";
  }

  function lookupSchedule(day) {
    return sample.week.find(entry => entry.en.toLowerCase() === String(day).toLowerCase() || entry.zh === day) || null;
  }

  function studyBlock(classes) {
    const mins = time => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };
    const clock = time => [Math.floor(time / 60), time % 60].map(n => String(n).padStart(2, "0")).join(":");
    for (let start = 9 * 60; start + 30 <= 17 * 60; start += 30) {
      if (!classes.some(item => start < mins(item.end) && start + 30 > mins(item.start))) {
        return [clock(start), clock(start + 30)];
      }
    }
    return null;
  }

  function createReminderStore(storage) {
    function read() {
      return JSON.parse(storage.getItem(KEY) || "[]");
    }
    function save(items) {
      storage.setItem(KEY, JSON.stringify(items));
    }
    return {
      list: read,
      add(task) {
        const cleanTask = String(task).trim();
        if (!cleanTask || cleanTask.length > 100) return null;
        const items = read();
        const item = { id: Math.max(0, ...items.map(entry => entry.id)) + 1, task: cleanTask, completed: false };
        save([...items, item]);
        return item;
      },
      complete(id) {
        const items = read();
        const match = items.find(item => item.id === id);
        if (!match) return null;
        match.completed = true;
        save(items);
        return match;
      }
    };
  }

  function route(input, { reminders, preferredLanguage, now = new Date() } = {}) {
    const original = String(input).trim().replace(/[.!?。！？]+$/u, "").trim();
    const query = original.normalize("NFKC").toLowerCase();
    const lang = languageOf(query, preferredLanguage);
    const local = (en, zh) => lang === "zh" ? zh : en;
    const respond = (intent, text, slots = {}) => ({ intent, lang, text, slots });
    const sampleReply = (intent, answer, slots) => respond(intent, local(`Sample data. ${answer}.`, `示例数据。${answer}。`), slots);

    if (/^(help|what can you do|open echocampus|帮助|你能做什么|打开校园回声)$/.test(query)) {
      return respond("help", local("Ask about campus, check a class day, or add a study reminder.", "你可以查询校园信息、查看课表，或添加学习提醒。"));
    }

    function reminderReply(text, slots) {
      return respond("study_reminder", text, slots);
    }

    if (/^(?:(?:please\s+)?(?:remind me\b|(?:list|show|complete|finish|add)\b.*\breminders?\b)|提醒我|添加提醒|查看提醒|列出提醒|完成提醒)/.test(query)) {
      try {
        if (!reminders) throw new Error("Storage unavailable");
        if (/^(?:(?:please\s+)?(?:list|show)\b|查看|列出)/.test(query)) {
          const active = reminders.list().filter(item => !item.completed);
          const action = { reminder_action: "list" };
          if (!active.length) return reminderReply(local("No open study reminders.", "没有待完成的学习提醒。"), action);
          const preview = active.slice(0, 3).map(item => `${item.id}: ${item.task}`).join(local("; ", "；"));
          return reminderReply(local(`${active.length} open; up to three shown: ${preview}.`, `${active.length}条待完成，最多列出三条：${preview}。`), action);
        }
        if (/^(?:(?:please\s+)?(?:complete|finish)\b|完成)/.test(query)) {
          const token = query.match(/reminder\s+(?:number\s+)?(\d+|[a-z]+)$/)?.[1]
            ?? query.match(/提醒\s*第?(\d+|[一二三四五六七八九])条?$/)?.[1];
          const id = /^\d+$/.test(token) ? Number(token) : token ? Math.max(numberWords.indexOf(token), "零一二三四五六七八九".indexOf(token)) : 0;
          const action = { reminder_action: "complete" };
          if (id < 1) return reminderReply(local("Which reminder number should I complete?", "要完成哪条提醒？请说编号。"), action);
          const item = reminders.complete(id);
          return reminderReply(item
            ? local(`Reminder ${id} is complete.`, `提醒${id}已完成。`)
            : local(`I couldn't find reminder ${id}.`, `找不到提醒${id}。`), { ...action, reminder_id: id });
        }

        const task = original.normalize("NFKC").replace(/^(?:(?:please\s+)?(?:remind me(?:\s+to\b)?|add\s+(?:a\s+)?(?:study\s+)?reminder(?:\s+to\b)?)|提醒我|添加提醒)\s*[:：]?\s*/i, "").trim();
        const action = { reminder_action: "add" };
        if (!task) return reminderReply(local("What study task should I remember?", "要记下什么学习任务？"), action);
        if (task.length > 100) return reminderReply(local("Please keep your study task under 101 characters.", "请将学习任务控制在一百字以内。"), action);
        const item = reminders.add(task);
        return reminderReply(local(`Reminder ${item.id} saved: ${item.task}. No alarm is set.`, `提醒${item.id}已保存：${item.task}。未设置闹钟。`), { ...action, task });
      } catch {
        return reminderReply(local("Reminder storage isn't available. No changes were saved.", "提醒存储不可用，未保存任何更改。"));
      }
    }

    for (const [topic, matcher] of Object.entries(campusTopics)) {
      if (matcher.test(query)) return sampleReply("campus_qa", sample.campus[topic][lang], { campus_topic: topic });
    }

    const dayName = query.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today)\b|(?:周|星期)[一二三四五六日天]|今天/)?.[0];
    if (query === dayName || /\b(?:classes|class|schedule|timetable|study block)\b|课表|上课|有.*课|自习/.test(query)) {
      const study = /\bstudy block\b|自习/.test(query);
      const action = { schedule_action: study ? "study_block" : "classes" };
      if (!dayName) return respond("schedule_help", local("Which day should I check?", "要查哪一天？"), action);
      const day = /^(today|今天)$/.test(dayName)
        ? sample.week[(now.getDay() + 6) % 7]
        : lookupSchedule(dayName.replace("星期", "周").replace("周天", "周日"));
      const slots = { ...action, day: day.en };
      if (study) {
        const block = studyBlock(day.classes);
        const answer = block
          ? local(`Try studying on ${day.en} from ${block[0]} to ${block[1]}`, `${day.zh}可以在${block[0]}到${block[1]}自习`)
          : local(`No open 30-minute study block on ${day.en}`, `${day.zh}没有可用的三十分钟自习时段`);
        return sampleReply("schedule_help", answer, slots);
      }
      const sorted = [...day.classes].sort((a, b) => a.start.localeCompare(b.start));
      const classes = sorted.map(item => local(`${item.en} at ${item.start}`, `${item.start}${item.zh}`)).join(local(", then ", "，然后"));
      return sampleReply("schedule_help", classes
        ? local(`${day.en}: ${classes}`, `${day.zh}：${classes}`)
        : local(`No classes on ${day.en}`, `${day.zh}没有课`), slots);
    }

    return respond("fallback", local("I can help with campus, classes, and study reminders. Try asking when the library closes.", "我可以帮你查校园信息、课程和学习提醒。试试问图书馆几点关门。"));
  }

  return { route, lookupSchedule, createReminderStore };
});

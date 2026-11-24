<script def>
{
  "navigationBarTitleText": "EchoCampus / 校园回声",
  "description": "Route campus questions, class schedules, study blocks and study reminders to EchoCampus. Only use this tool for those topics. 将校园问答、课表、自习时段和学习提醒交给校园回声。传入用户的原话。",
  "schema": {
    "data": {
      "type": "object",
      "properties": {
        "question": { "type": "string", "description": "The exact English or Mandarin request / 用户中英文原话" }
      },
      "required": ["question"]
    }
  }
}
</script>

<script setup>
import "../../lib/sample-data.js";
import "../../lib/router.js";

const { route, createReminderStore } = globalThis.EchoCampus;
const locales = { en: "en-US", zh: "zh-CN" };
const voices = { en: "English_radiant_girl", zh: "female-tianmei" };
const ready = "Ask about campus or studying. / 询问校园或学习问题。";
let recognition;

export default {
  data: {
    status: "Ready / 就绪",
    reply: ready
  },

  onLoad(query) {
    if (typeof query?.question === "string" && query.question.trim()) {
      this.answer(query.question);
    }
  },

  onHide() {
    this.releaseMic();
    if (this.data.status === "Listening / 正在聆听") this.setData({ status: "Ready / 就绪" });
  },

  onUnload() {
    this.releaseMic();
  },

  releaseMic() {
    const session = recognition;
    recognition = undefined;
    if (session) session.abort();
  },

  answer(question, preferredLanguage) {
    let reminders;
    try {
      reminders = createReminderStore(globalThis.localStorage);
    } catch {
      reminders = undefined;
    }
    const result = route(question, { reminders, preferredLanguage });
    this.setData({ reply: result.text });
    try {
      const utterance = new SpeechSynthesisUtterance(result.text);
      utterance.voice = voices[result.lang];
      utterance.rate = 0.95;
      speechSynthesis.speak(utterance, "immediate");
    } catch {
      this.setData({ status: "Audio unavailable / 无法播放语音" });
    }
  },

  listenEnglish() {
    this.listen("en");
  },

  listenMandarin() {
    this.listen("zh");
  },

  listen(lang) {
    if (recognition) return;
    try {
      const session = new SpeechRecognition();
      recognition = session;
      session.lang = locales[lang];
      session.interimResults = false;
      session.continuous = false;
      session.onresult = event => {
        if (recognition !== session) return;
        const heard = event.results[event.resultIndex ?? 0]?.[0]?.transcript?.trim();
        if (heard) this.answer(heard, lang);
      };
      session.onerror = () => {
        if (recognition === session) this.setData({ status: "Mic unavailable / 无法使用麦克风" });
      };
      session.onend = () => {
        if (recognition !== session) return;
        recognition = undefined;
        if (this.data.status === "Listening / 正在聆听") this.setData({ status: "Ready / 就绪" });
      };
      this.setData({ status: "Listening / 正在聆听" });
      session.start();
    } catch {
      recognition = undefined;
      this.setData({ status: "Mic unavailable / 无法使用麦克风" });
    }
  }
};
</script>

<page>
  <view class="panel">
    <text class="label">{{ status }}</text>
    <text class="answer">{{ reply }}</text>
    <view class="actions">
      <button bindtap="listenEnglish">Speak English</button>
      <button bindtap="listenMandarin">说普通话</button>
    </view>
  </view>
</page>

<style>
.panel { display: flex; flex-direction: column; padding: 12px; }
.label { font-size: 14px; }
.answer { font-size: 20px; margin-top: 6px; margin-bottom: 10px; }
.actions { display: flex; flex-direction: row; }
</style>

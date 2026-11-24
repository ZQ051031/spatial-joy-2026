# EchoCampus / 校园回声 — AIUI Studio setup sheet

[`agent.json`](agent.json) is the editable setup spec, **not** a Rokid import file. Import the [`studio/`](studio/) source directory as an AIUI project. The destinations below describe where the information belongs; exact labels in the authenticated workspace were not checked.

| JSON field | Studio destination / what to enter |
| --- | --- |
| `name.en`, `name.zh` | Agent name and localized store title: **EchoCampus** / **校园回声**. If the storefront only supports one title, use the local title for that listing. |
| `description.en`, `description.zh` | Agent/store description for the corresponding language. Copy the full text from the JSON. |
| `category` | Agent/store classification: **Learning / 学习**. |
| `languages` | English and Mandarin locale options if offered; the prompt also instructs the agent to match the user's language. |
| `target` | Test and publish for **Rokid AI Glasses** with the Rokid AI app; this is the release target, not an assumed JSON deployment field. |
| `wakePhrase.en`, `wakePhrase.zh` | Put the launch examples in the agent's usage instructions. Use the platform's normal invocation first. Configure them only if Studio exposes custom invocation; these are not guaranteed hands-free wake words. |
| `systemPrompt.en`, `systemPrompt.zh` | Use both versions as instructions when configuring the agent in Studio. The native page passes the original question to a deterministic router; it doesn't send a system prompt to an external model. |
| `intents.*.utterances` and `intents.*.reply` | Add the five intent names and bilingual example turns to the instructions and runtime test cases. The reminder success reply is conditional on a successful save. |
| `intents.*.slots`, `slots.*` | Add the slot names, types, constraints and required/default rules to the instructions. If the selected AIUI Skill has documented inputs, map the matching slots to them; do not assume a standalone intent/slot editor. |
| `tts.enabled`, `tts.localeByLanguage`, `tts.rate`, `tts.maxSentences` | The native page uses both locales for recognition, the matching documented TTS voice IDs and a requested rate of 0.95. AIUI TTS does not support selecting generation language with the utterance's `lang` property. Verify both voices in Studio. |
| `capabilities` | Use glasses voice input and spoken output via the AIUI runtime. Do not add IMU, GPS, video, or camera permissions for this workflow. |
| `safetyPrivacy.en`, `safetyPrivacy.zh` | Add these rules to the instructions, and use the applicable statements in the listing/review notes. Disclose the actual retention behavior of the deployed agent separately. |

## Editable reference context — SAMPLE DATA / 示例数据

Edit [`studio/lib/sample-data.js`](studio/lib/sample-data.js) to change the campus answer text and weekly timetable in both the native project and browser demo. This is a fictional campus; the router says “Sample data” / “示例数据” before using it. Replace the reference only with authorized, verified campus data. Ask for a weekday when needed; answer “no sample classes” for an empty day. Offer a short study slot that avoids the selected day's classes. Do not treat this as the user's actual calendar.

## Reminder behavior

1. **Add / 添加:** Ask for a short study task if missing. Save it, then say its ID and repeat the task. Do not set an alarm.
2. **List / 查看:** Only list reminders for the current user or conversation, with their IDs and completion status where useful.
3. **Complete / 完成:** Ask for an ID if missing; mark only that matching reminder complete. Report an unknown ID without modifying other reminders.

The browser and native page use their runtime's documented local storage; there is no shared backend. Verify per-device retention on the target runtime before advertising it. If storage fails, the router says the change was not saved. The spoken list is a preview of up to three open reminders; the web panel shows all entries and states.

## Studio runtime smoke test

Try all five bilingual intents from the JSON on the glasses with the AI app. Hear the sample label and exam caveat; confirm no class overlap in the study suggestion. Add, list, and complete a reminder and verify the advertised retention behavior. Try a missing day, an unknown reminder ID, and a fallback. Confirm voice pickup and short TTS responses without a phone screen in the common flow. None of these Studio or hardware steps has been performed for this repository.

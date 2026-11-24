# EchoCampus / 校园回声

A voice-first university learning companion for **Spatial Joy 2026 · Rokid AI Track · Learning (学习)**. Ask where to go on campus, hear a class day or a study slot, and capture or complete a study task. EchoCampus is a focused campus workflow, not a general-purpose Rokid AI Assistant. It requests no camera or location access and doesn't set alarms.

## Try the demo and tests

1. Download or clone this repository, keeping the directory structure intact, and open [`demo/index.html`](demo/index.html) directly in a browser. No server, setup, external dependencies, or API keys are required.
2. Use one of the three examples, type in English or Mandarin, or select a mic language and click **Mic**. **Speak replies** controls browser TTS. Speech recognition may be unavailable, blocked on `file://`, or served by the browser's speech provider; the typed flow does not use a network service. Audio also depends on the browser and installed voices.
3. Add a study reminder, then click **Complete** or ask “Complete reminder 1” (use the displayed ID). Refresh to check that state was kept. Some browsers block or don't preserve `localStorage` on local files; the demo reports blocked writes. Clear the browser's storage for the file to remove demo reminders. The app does not save the transcript; avoid entering personal data.

```sh
node --test
```

Run the command from the repository root (Node.js 20+). Tests use only Node built-ins. The browser, native project, and tests share the [intent router](agent/studio/lib/router.js) and editable [SAMPLE DATA / 示例数据](agent/studio/lib/sample-data.js). The campus, exam venue, hours and weekly schedule are fictional.

## AI Track and scoring

| Requirement / criterion | EchoCampus |
| --- | --- |
| AIUI agent built with AIUI Studio, Learning category, runs on Rokid AI Glasses + AI app | Import [`agent/studio/`](agent/studio/) and complete the Studio and real-glasses steps below. The browser HUD is a rehearsal, not the submission build. |
| Use open glasses capabilities appropriately | Live speech recognition and short TTS provide the core input and output. No phone screen is required for the planned spoken workflow. |
| Original, distinct from official assistant | University-specific sample-grounded answers, timetable-aware study slots and a simple add/list/complete study workflow. |
| Judges: 70% of combined rank | Practical value 30%, product experience 20%, usage frequency and shareability 10%, completion 20%, differentiation 20% within the judge score. |
| Real usage: 30% of combined rank | Valid visits/uses (PV) 20%, unique users (UV) 30%, total valid usage duration 30%, and average valid duration per user 20% within the usage score. Only valid use after domestic store listing counts. The web demo has no analytics. |

The [rules](https://spatialjoy.rokid.com/2026/rules) cap the AI Track at five entries. The [leaderboard](https://spatialjoy.rokid.com/2026/leaderboard) lists the **January 28, 2027** deadline with a Beijing-time countdown; confirm the cutoff in the competition portal before filing. International awards emphasize international creativity, multilingual production and market fit; domestic usage is not an eligibility threshold for those specialist awards.

## Manual Studio, store and competition submission (entrant)

1. **Choose the award route.** For non-international awards, use [aiui.rokid.com](https://aiui.rokid.com/) and prepare a Chinese listing for the domestic Agent Store, subject to mainland compliance. The leaderboard allows overseas developers to start via Global with bilingual review notes and have organizers handle domestic listing if eligible. For international awards only, use [aiui-global.rokid.com](https://aiui-global.rokid.com/) with the English listing and international localization. To pursue both sets, satisfy both sets of requirements, including the respective store listings.
2. **Import and configure in AIUI Studio.** Use **Local import** to select `agent/studio`, or the documented GitHub import with that directory on the correct branch. [Rokid's public Studio quick start](https://open.rokid.com/aiui/guide/quickstart/quickstart.md?version=0.20.0&lang=en-US) describes source import. Rokid documents [AIX](https://open.rokid.com/aiui/guide/bundle/aix.md?version=0.20.0&lang=en-US) as a distribution package, not this repo's `agent.json` format. No public single-file import format for the product fields in `agent.json` was verified: use the field-by-field [Studio setup sheet](agent/agent.md) to copy the listing metadata, category, prompt, and examples as applicable. The native source is built against public AIUI documentation; do not import the web demo or rename the spec as an AIX.
3. **Verify, then submit for Agent Store review and listing.** Preview in Studio, test both languages and permissions on Rokid AI Glasses with the Rokid AI app, and verify audio, reminder persistence and usual response times. Resolve runtime or review issues, create the release version, and get it published in the right store. Test all intent examples and use the glasses' built-in recorder to capture the core operations and innovation with clear mic input and TTS. Put **Rokid AI Track** and **EchoCampus / 校园回声** on the video cover. [DEMO_SCRIPT.md](DEMO_SCRIPT.md) is a rehearsal guide, not the required real-device video.
4. **File in the [Rokid Competition Management System](https://spatialjoy.rokid.com/) before January 28, 2027.** Submit the reviewed agent/entry and required materials: the test method (at most 100 words or 100 Chinese characters), a PPT covering the work and author/team roles, core functions and implementation, operating instructions, intended users and scenarios, and differentiation, plus the real-device video and cover. The entrant must supply their own full-time enrollment proof if entering as a student. Don't put enrollment documents in the public repo. The leaderboard notice says eligible entries must file materials after store review submission and complete store listing; ensure both are done.
5. **Post to the Rokid AI app community when required.** The leaderboard says non-international award entries must post after listing; the general rules list an overseas-participant exception. If relying on the exception for a domestic listing, verify it with the organizers. Use `#SpatialJoy 26全球开发大赛#`, mark the agent, upload the device video, and describe the name, scenario, and core capabilities within the stated 200-word/character limit. This post is not mandatory for international-only entries.

## Sources, licenses and status

- Official sources checked: [Spatial Joy 2026 rules](https://spatialjoy.rokid.com/2026/rules) (public page's rules bundle), [AI Track leaderboard](https://spatialjoy.rokid.com/2026/leaderboard), and [Rokid Open Platform](https://open.rokid.com/) and its linked [AIUI documentation](https://open.rokid.com/aiui?lang=en-US).
- Reused third-party code, assets and components: **none**. The web demo uses standard browser facilities; the Studio source targets Rokid's documented runtime interfaces. This repository's original material is [MIT licensed](LICENSE).
- Not done: **no Rokid account was created or used, no login or payment, no publishing, and no submission filed**. No Studio import, AIX packaging, or physical-glasses test was performed. The web demo is not evidence of on-device execution.

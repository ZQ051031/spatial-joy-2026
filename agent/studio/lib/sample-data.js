(function (data) {
  if (typeof module === "object" && module.exports) module.exports = data;
  else globalThis.EchoCampusSample = data;
})({
  // SAMPLE DATA / 示例数据 — fictional campus and timetable; edit here.
  campus: {
    library: { en: "The library closes at 10 PM", zh: "图书馆晚上十点关门" },
    dining: { en: "The dining hall is next to the student center", zh: "食堂在学生活动中心旁边" },
    shuttle: { en: "The campus shuttle leaves the north gate every 20 minutes from 8 AM to 6 PM", zh: "校车从早上八点到下午六点，每二十分钟从北门发车" },
    exam: { en: "The sample exam is in East Hall, room 204; check your official exam notice", zh: "示例考场是东楼204室；请核对学校的正式通知" }
  },
  week: [
    { en: "Monday", zh: "周一", classes: [
      { start: "09:00", end: "10:00", en: "Calculus", zh: "微积分" },
      { start: "13:00", end: "14:30", en: "Writing Lab", zh: "写作课" }
    ] },
    { en: "Tuesday", zh: "周二", classes: [
      { start: "10:30", end: "12:00", en: "Physics", zh: "物理" }
    ] },
    { en: "Wednesday", zh: "周三", classes: [] },
    { en: "Thursday", zh: "周四", classes: [
      { start: "11:00", end: "12:00", en: "Design Seminar", zh: "设计研讨课" }
    ] },
    { en: "Friday", zh: "周五", classes: [
      { start: "14:00", end: "15:30", en: "Computer Science", zh: "计算机科学" }
    ] },
    { en: "Saturday", zh: "周六", classes: [] },
    { en: "Sunday", zh: "周日", classes: [] }
  ]
});

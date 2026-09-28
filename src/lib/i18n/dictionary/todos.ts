// Habit Tracker -> To Do List (components/habit-tracker/todos/). Date reuses
// shared.ts's own key; Cancel, Create, Delete, Remove, Undo, "Mark done" and
// "This cannot be undone." reuse existing keys from elsewhere too.
export const todosDictionary: Record<string, string> = {
  "To Do List": "টু-ডু লিস্ট",
  "Plan your day, one date at a time.": "একটি একটি করে দিনের পরিকল্পনা করুন।",
  "Add List": "লিস্ট যোগ করুন",
  'No lists yet -- click "Add List" to start.': 'এখনো কোনো লিস্ট নেই -- শুরু করতে "লিস্ট যোগ করুন" ক্লিক করুন।',
  "List created": "লিস্ট তৈরি হয়েছে",
  "Failed to create list": "লিস্ট তৈরি করতে ব্যর্থ হয়েছে",
  "List removed": "লিস্ট সরানো হয়েছে",
  "Failed to remove list": "লিস্ট সরাতে ব্যর্থ হয়েছে",
  "Remove List": "লিস্ট সরান",
  tasks: "কাজ",
  "All Lists": "সব লিস্ট",
  "Add a task": "একটি কাজ যোগ করুন",
  "No tasks yet -- add one above.": "এখনো কোনো কাজ নেই -- উপরে থেকে যোগ করুন।",
  "Failed to update task": "কাজ আপডেট করতে ব্যর্থ হয়েছে",
  "Failed to add task": "কাজ যোগ করতে ব্যর্থ হয়েছে",
  "Failed to remove task": "কাজ সরাতে ব্যর্থ হয়েছে",
  "Delete Task": "কাজ মুছুন",

  // TodayTasksButton.tsx (TopBar quick-access popover)
  "Today's Tasks": "আজকের কাজ",
  "Open full list": "সম্পূর্ণ লিস্ট দেখুন",
};

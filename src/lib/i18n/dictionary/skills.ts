// Habits › Skills (components/modules/Customer/HabitTracker/Skills/). The
// stored habit category is still "Course"; categoryLabel() shows it as
// "Skills". Name / Optional / Status / Icon / Cancel / Save / Remove / Edit /
// Close / of / and / more / day / days / today / Today / Yesterday / Goal
// reached! / Remove goal / Goal saved / Goal removed / Failed to save goal /
// Your progress on it will be lost. / Set a goal / Suggested goals / Enter a
// number from 1 to 1000. reuse existing keys. Skill names and sources typed
// by the learner are shown as-is, NOT passed through t().
export const skillsDictionary: Record<string, string> = {
  // Page
  Skills: "দক্ষতা",
  "Courses and skills you're learning, counted in lessons or hours.": "যে কোর্স আর দক্ষতা শিখছেন, পাঠ বা ঘণ্টায় গোনা।",
  "Add skill": "দক্ষতা যোগ করুন",
  "Your learning list is empty, for now": "আপনার শেখার তালিকা এখন খালি, আপাতত",
  "Add a course or a skill you want to learn. It takes ten seconds.": "যে কোর্স বা দক্ষতা শিখতে চান সেটা যোগ করুন। মাত্র দশ সেকেন্ড লাগে।",

  // The four numbers
  "Learning now": "এখন শিখছি",
  "Nothing on the go yet": "এখনো কিছু চলছে না",
  "Practice streak": "টানা অনুশীলন",
  "Log something today to start one": "শুরু করতে আজ কিছু লিখুন",
  "This week": "এই সপ্তাহ",
  "Nothing logged yet": "এখনো কিছু লেখা হয়নি",
  "across every skill": "সব দক্ষতা মিলিয়ে",
  "Skills completed this year": "এ বছর সম্পন্ন দক্ষতা",
  "Completed this year. Set a goal below.": "এ বছর সম্পন্ন। নিচে একটা লক্ষ্য ঠিক করুন।",

  // Units
  lessons: "পাঠ",
  hours: "ঘণ্টা",
  "+1 lesson": "+১ পাঠ",
  "+30 min": "+৩০ মিনিট",

  // Learning cards
  Learning: "শিখছি",
  "Want to learn": "শিখতে চাই",
  Completed: "সম্পন্ন",
  yesterday: "গতকাল",
  "Nothing logged this week": "এই সপ্তাহে কিছু লেখা হয়নি",
  "Log progress": "অগ্রগতি লিখুন",
  "Nothing on the go": "কিছু চলছে না",
  "Room for one more": "আরেকটার জায়গা আছে",
  "Start something from the table below, or add a new skill.": "নিচের তালিকা থেকে কিছু শুরু করুন, বা নতুন দক্ষতা যোগ করুন।",

  // This week
  "day in a row": "দিন টানা",
  "days in a row": "দিন টানা",
  "week in a row": "সপ্তাহ টানা",
  "weeks in a row": "সপ্তাহ টানা",
  "Practice each day this week": "এই সপ্তাহের প্রতিদিনের অনুশীলন",
  "Start a skill and its days show up here.": "একটা দক্ষতা শুরু করুন, তার দিনগুলো এখানে দেখা যাবে।",
  "Nothing logged": "কিছু লেখা হয়নি",

  // All skills
  "All skills": "সব দক্ষতা",
  completed: "সম্পন্ন",
  "not set": "ঠিক করা হয়নি",
  Skill: "দক্ষতা",
  Where: "কোথায়",
  Progress: "অগ্রগতি",
  "Last practised": "শেষ অনুশীলন",
  "Not started": "শুরু হয়নি",
  "Mark as completed": "সম্পন্ন হিসেবে চিহ্নিত করুন",
  "Start learning": "শেখা শুরু করুন",
  "Learn again": "আবার শিখুন",
  "Edit skill": "দক্ষতা সম্পাদনা",
  "Remove skill": "দক্ষতা সরান",

  // Goal
  "How many skills do you want to complete this year?": "এ বছর কয়টা দক্ষতা সম্পন্ন করতে চান?",
  "Skills to complete this year": "এ বছর সম্পন্ন করার দক্ষতা",

  // Add / edit / log
  "Add a skill": "একটা দক্ষতা যোগ করুন",
  "A course counted in lessons, or any skill counted in hours.": "পাঠে গোনা একটা কোর্স, বা ঘণ্টায় গোনা যেকোনো দক্ষতা।",
  "e.g. React": "যেমন: React",
  "Where from": "কোথা থেকে",
  "e.g. Udemy, YouTube, Self": "যেমন: Udemy, YouTube, নিজে",
  "Counted in": "গোনা হবে",
  Lessons: "পাঠ",
  Hours: "ঘণ্টা",
  "Goal (hours)": "লক্ষ্য (ঘণ্টা)",
  "Total lessons": "মোট পাঠ",
  "Hours done so far": "এ পর্যন্ত ঘণ্টা",
  "Lessons done so far": "এ পর্যন্ত পাঠ",
  "Your progress is already more than this target.": "আপনার অগ্রগতি ইতিমধ্যে এই লক্ষ্যের চেয়ে বেশি।",
  "That's more than the target.": "এটা লক্ষ্যের চেয়ে বেশি।",
  "Enter a valid number.": "সঠিক একটা সংখ্যা দিন।",
  "Enter hours from 0.5 to 1000.": "০.৫ থেকে ১০০০ এর মধ্যে ঘণ্টা দিন।",
  "Enter a number from 1 to 2000.": "১ থেকে ২০০০ এর মধ্যে একটা সংখ্যা দিন।",
  Colour: "রং",
  "How many hours have you done?": "কত ঘণ্টা করেছেন?",
  "Which lesson are you on?": "এখন কত নম্বর পাঠে আছেন?",
  Violet: "বেগুনি",
  Indigo: "ইন্ডিগো",
  Lime: "লাইম",
  Rose: "গোলাপি",
  Amber: "অ্যাম্বার",
  Sky: "আকাশি",
  General: "সাধারণ",
  Coding: "কোডিং",
  "Art & design": "শিল্প ও নকশা",
  Music: "সংগীত",
  Languages: "ভাষা",
  Photography: "ফটোগ্রাফি",
  Fitness: "ফিটনেস",
  Writing: "লেখালেখি",
  Math: "গণিত",
  Thinking: "চিন্তা",
  Cooking: "রান্না",
  Career: "ক্যারিয়ার",
  Study: "পড়াশোনা",

  // Messages
  "Skill added": "দক্ষতা যোগ হয়েছে",
  "Skill updated": "দক্ষতা আপডেট হয়েছে",
  "Failed to save skill": "দক্ষতা সংরক্ষণ করতে ব্যর্থ হয়েছে",
  "Skill removed": "দক্ষতা সরানো হয়েছে",
  "Failed to remove skill": "দক্ষতা সরাতে ব্যর্থ হয়েছে",
  "Completed! Well done.": "সম্পন্ন! সাবাশ।",
  "Started. Happy learning!": "শুরু হলো। শুভ শেখা!",

  // Amounts and progress as whole sentences, in the reader's digits.
  "We couldn't load your skills just now.": "এই মুহূর্তে আপনার দক্ষতার তালিকা লোড করা যায়নি।",
  "{count} lesson": "{count}টি পাঠ",
  "{count} lessons": "{count}টি পাঠ",
  "{count} hour": "{count} ঘণ্টা",
  "{count} hours": "{count} ঘণ্টা",
  "{count} min": "{count} মিনিট",
  // A week cell's short amount: "1.5h", "30m".
  "{count}h": "{count}ঘ",
  "{count}m": "{count}মি",
  "{done} of {total} lessons": "{total}টি পাঠের মধ্যে {done}টি",
  "{done} of {total} hours": "{total} ঘণ্টার মধ্যে {done} ঘণ্টা",
  "{amount} today": "আজ {amount}",
  "{amount} yesterday": "গতকাল {amount}",
  "{amount} on {day}": "{day} {amount}",
  "Logged every day since {day}": "{day} থেকে প্রতিদিন লেখা হয়েছে",
  "Practice streak: {days}": "টানা অনুশীলন: {days}",
  "{first} and {second}": "{first} ও {second}",
  "{first}, {second} and {count} more": "{first}, {second} ও আরও {count}টি",
  "and {amount} of practice": "আর {amount} অনুশীলন",
  "{year} goal": "{year} সালের লক্ষ্য",
  "{year} goal: {figure}": "{year} সালের লক্ষ্য: {figure}",
  "{year} skills goal": "{year} সালের দক্ষতার লক্ষ্য",
  "{done} of {total} completed": "{total}টির মধ্যে {done}টি সম্পন্ন",
  // The server's refusals (habitDisplay's actionError).
  "A course can have up to {count} lessons": "একটি কোর্সে সর্বোচ্চ {count}টি পাঠ থাকতে পারে",
  "A goal can be up to {count} hours": "লক্ষ্য সর্বোচ্চ {count} ঘণ্টা হতে পারে",
  "You can keep up to {count} skills": "সর্বোচ্চ {count}টি দক্ষতা রাখা যায়",
  "Skill not found": "দক্ষতাটি পাওয়া যায়নি",
  // v4 lane C
  "1 lesson": "১ পাঠ",
  "30 min": "৩০ মিনিট",
};

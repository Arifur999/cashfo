// Account › Invite & earn (components/modules/Customer/Referrals/). All /
// Email / Copy / Cancel / Close / Status / Try again / More / Loading...
// are other dictionaries' keys, and "Withdraw {amount}" / "Couldn't load
// your wallets." are savings-goals.ts's (referralDisplay.test.ts checks
// they all keep their Bangla). Friends' names are shown as-is, NOT passed
// through t(). Friends are spoken of politely (যোগ দিয়েছেন, সাইন আপ করেন).
export const referralsDictionary: Record<string, string> = {
  // Page
  "Invite & earn": "আমন্ত্রণ ও আয়",
  "Share Smartly with friends and family. You earn {reward} for every friend who joins, ready to withdraw 30 days later.": "বন্ধু ও পরিবারের সাথে Smartly শেয়ার করুন। যোগ দেওয়া প্রতিটি বন্ধুর জন্য আপনি পাবেন {reward}, যা ৩০ দিন পর তুলতে পারবেন।",
  "Share Smartly with friends and family and earn a reward for every friend who joins.": "বন্ধু ও পরিবারের সাথে Smartly শেয়ার করুন, আর যোগ দেওয়া প্রতিটি বন্ধুর জন্য পুরস্কার পান।",
  "Couldn't load your invite details": "আপনার আমন্ত্রণের তথ্য লোড করা যায়নি",

  // Hero. "@@referral": the Savings pages word plain "Withdraw", "Available"
  // and "Paid out" their own way.
  "Available to withdraw": "তোলার জন্য আছে",
  "To any wallet or savings wallet · no fee": "যেকোনো ওয়ালেট বা সঞ্চয়ের ওয়ালেটে · কোনো ফি নেই",
  "Withdraw@@referral": "তুলুন",
  "{count} friend · ready 30 days after joining": "{count} জন বন্ধু · যোগ দেওয়ার ৩০ দিন পর পাওয়া যাবে",
  "{count} friends · ready 30 days after joining": "{count} জন বন্ধু · যোগ দেওয়ার ৩০ দিন পর পাওয়া যাবে",
  "Ready 30 days after each friend joins": "প্রতিটি বন্ধু যোগ দেওয়ার ৩০ দিন পর পাওয়া যাবে",
  "Nothing waiting": "কিছু অপেক্ষায় নেই",
  "Total earned": "মোট আয়",
  "{count} friend joined": "{count} জন বন্ধু যোগ দিয়েছেন",
  "{count} friends joined": "{count} জন বন্ধু যোগ দিয়েছেন",
  "Paid out@@referral": "তোলা হয়েছে",
  // Under "Paid out" (তোলা হয়েছে), so worded apart from it.
  "Withdrawn to your wallets": "আপনার ওয়ালেটে জমা হয়েছে",
  "Only an owner or accountant of this workspace can withdraw.": "শুধু এই ওয়ার্কস্পেসের মালিক বা হিসাবরক্ষক তুলতে পারেন।",
  "Switch to your own workspace": "নিজের ওয়ার্কস্পেসে যান",
  "Nothing to withdraw right now": "এখন তোলার মতো কিছু নেই",
  "Your next reward is ready on {date}": "আপনার পরের পুরস্কার {date} তারিখে পাওয়া যাবে",
  Pending: "অপেক্ষমাণ",
  Earned: "আয় হয়েছে",
  "Paid@@payout": "তোলা হয়েছে",

  // Invite link
  "Invite friends": "বন্ধুদের আমন্ত্রণ জানান",
  "Your invite link": "আপনার আমন্ত্রণ লিংক",
  Code: "কোড",
  "Copy code": "কোড কপি করুন",
  "Code copied": "কোড কপি হয়েছে",
  "Invite link": "আমন্ত্রণ লিংক",
  "Link copied": "লিংক কপি হয়েছে",
  "Copy link": "লিংক কপি করুন",
  "Couldn't copy. Select the text and copy it yourself.": "কপি করা যায়নি। লেখাটি সিলেক্ট করে নিজে কপি করুন।",
  "Join me on Smartly, the money and habits app. Sign up with my link:": "Smartly-তে আমার সাথে যোগ দিন, টাকা আর অভ্যাসের অ্যাপ। আমার লিংক দিয়ে সাইন আপ করুন:",
  "Try Smartly": "Smartly ব্যবহার করে দেখুন",
  "Share on WhatsApp": "হোয়াটসঅ্যাপে শেয়ার করুন",
  "More ways to share": "শেয়ার করার আরও উপায়",
  "Messenger didn't open.": "Messenger খোলেনি।",
  "Share another way": "অন্যভাবে শেয়ার করুন",
  "You get {reward} for every friend who signs up with your link. It's ready 30 days later.": "আপনার লিংক দিয়ে সাইন আপ করা প্রতিটি বন্ধুর জন্য আপনি পাবেন {reward}। ৩০ দিন পর এটি পাওয়া যাবে।",

  // Friends
  "Friends who joined with your link": "আপনার লিংক দিয়ে যোগ দেওয়া বন্ধুরা",
  "Friends · {count} joined": "বন্ধুরা · {count} জন যোগ দিয়েছেন",
  "Filter friends": "বন্ধু ফিল্টার",
  "Available@@referral": "তোলার মতো",
  Friend: "বন্ধু",
  "You earn": "আপনার আয়",
  "No one has joined with your link yet. Share it and they show up here.": "আপনার লিংক দিয়ে এখনো কেউ যোগ দেননি। শেয়ার করুন, তাঁদের এখানে দেখা যাবে।",
  "No friends with this status.": "এই অবস্থায় কোনো বন্ধু নেই।",
  "Joined {date}": "{date} যোগ দিয়েছেন",
  "Ready on {date}": "{date} পাওয়া যাবে",
  "Ready to withdraw": "এখন তুলতে পারেন",
  "Moved to your wallet": "ওয়ালেটে জমা হয়েছে",
  "{count} reward is still pending. It becomes available 30 days after your friend joined.": "{count}টি পুরস্কার এখনো অপেক্ষায়। বন্ধু যোগ দেওয়ার ৩০ দিন পর এটি পাওয়া যাবে।",
  "{count} rewards are still pending. They become available 30 days after each friend joined.": "{count}টি পুরস্কার এখনো অপেক্ষায়। প্রতিটি বন্ধু যোগ দেওয়ার ৩০ দিন পর সেগুলো পাওয়া যাবে।",
  "Rewards are still pending. Each becomes available 30 days after the friend joined.": "পুরস্কার এখনো অপেক্ষায় আছে। প্রতিটি পুরস্কার বন্ধু যোগ দেওয়ার ৩০ দিন পর পাওয়া যাবে।",
  "Showing the newest {shown} of {total} friends": "মোট {total} জন বন্ধুর মধ্যে সবশেষ {shown} জনকে দেখানো হচ্ছে",
  // The admin Users table's "Joined" filter reads this one too.
  Joined: "যোগ দিয়েছে",

  // How it works
  "How it works": "যেভাবে কাজ করে",
  "Share your link": "আপনার লিংক শেয়ার করুন",
  "On WhatsApp, Messenger, Facebook or email. Friends sign up with it.": "WhatsApp, Messenger, Facebook বা ইমেইলে। বন্ধুরা এটি দিয়ে সাইন আপ করেন।",
  "They sign up": "তাঁরা সাইন আপ করেন",
  "Their account is tied to your code from day one.": "প্রথম দিন থেকেই তাঁদের অ্যাকাউন্ট আপনার কোডের সাথে যুক্ত।",
  "You earn {reward}": "আপনি {reward} পাবেন",
  "It is ready 30 days later. Withdraw it to any wallet.": "৩০ দিন পর এটি পাওয়া যায়। যেকোনো ওয়ালেটে তুলুন।",
  "The rules": "নিয়মগুলো",
  "Rewards count 30 days after your friend joins.": "বন্ধু যোগ দেওয়ার ৩০ দিন পর পুরস্কার গোনা হয়।",
  "Withdraw to any wallet or savings wallet. No fee.": "যেকোনো ওয়ালেট বা সঞ্চয়ের ওয়ালেটে তুলুন। কোনো ফি নেই।",
  "Signing up again with your own link does not count.": "নিজের লিংক দিয়ে আবার সাইন আপ করলে গোনা হয় না।",
  "Invite as many friends as you like.": "যত খুশি বন্ধুকে আমন্ত্রণ জানান।",

  // Withdraw
  "Withdraw your rewards": "আপনার পুরস্কার তুলুন",
  "Everything available goes in one go. Pick where it lands.": "যা আছে সব একবারে যাবে। কোথায় যাবে তা বাছুন।",
  "Move it to": "কোথায় যাবে",
  "Move it to a wallet in {workspace}": "{workspace}-এর কোন ওয়ালেটে যাবে",
  "{amount} moved to {wallet}": "{amount} {wallet}-এ জমা হয়েছে",
  "Failed to withdraw earnings": "আয় তুলতে ব্যর্থ হয়েছে",
  "Couldn't reach Smartly. Check your connection and try again.": "Smartly-র সাথে যোগাযোগ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
  // The backend's refusals (ReferralsService.withdraw), shown as it words them.
  "No available balance to withdraw.": "তোলার মতো কোনো ব্যালেন্স নেই।",
  "Account not found in this workspace": "এই ওয়ার্কস্পেসে ওয়ালেটটি পাওয়া যায়নি",
  "Must be a General (cash/bank/mobile money) or Savings account": "নগদ, ব্যাংক বা মোবাইল ব্যাংকিংয়ের ওয়ালেট অথবা সঞ্চয়ের ওয়ালেট বাছুন",
  // Books' payment drawer words its wallet picker with these two.
  Into: "যেখানে",
  "No wallet yet. Add one under Wallets first.": "এখনো কোনো ওয়ালেট নেই। আগে ওয়ালেট থেকে একটি যোগ করুন।",
};

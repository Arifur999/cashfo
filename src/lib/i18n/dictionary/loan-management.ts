// Bangla translations for: /loan-management/* (Dashboard, Transactions,
// Ledger, bank-person-list), /contacts and /contacts/[id], /dena-pawna, and
// their components under src/components/loan-management/ and
// src/components/contacts/, plus
// src/components/receivables-payables/ReceivablePayableSection.tsx (rendered
// directly by ContactDetailPageClient.tsx, so it's grouped with this area
// even though the rest of receivables-payables/ belongs to another area).
//
// Note: /dena-pawna/page.tsx itself renders no text of its own -- it's a
// Server Component that delegates everything to
// src/components/dena-pawna/DenaPawnaPageClient.tsx, which is outside this
// area's assigned component list (owned by another dictionary/area), so
// there is nothing to translate in this file for that page specifically.
export const loanManagementDictionary: Record<string, string> = {
  // Shared across several components in this area
  "(optional)": "(ঐচ্ছিক)",
  Archive: "আর্কাইভ",
  Archived: "আর্কাইভ করা হয়েছে",
  Action: "কার্যক্রম",
  "Bank / Person": "ব্যাংক / ব্যক্তি",
  Receive: "গ্রহণ",
  Payment: "পরিশোধ",
  Period: "সময়কাল",
  Pawna: "পাওনা",
  Dena: "দেনা",
  "New Transaction": "নতুন লেনদেন",
  "All Time": "সব সময়",
  "This Month": "এই মাস",
  "Last Month": "গত মাস",
  "This Year": "এই বছর",
  "(Voided)": "(বাতিল করা হয়েছে)",
  "Add Contact": "পরিচিতি যোগ করুন",
  Contact: "পরিচিতি",
  Customer: "গ্রাহক",
  Supplier: "সরবরাহকারী",
  "Customer & Supplier": "গ্রাহক ও সরবরাহকারী",
  Relative: "আত্মীয়",
  Other: "অন্যান্য",

  // src/components/loan-management/BankPersonFormModal.tsx
  "Edit Bank / Person": "ব্যাংক / ব্যক্তি সম্পাদনা",
  "Add Bank / Person": "ব্যাংক / ব্যক্তি যোগ করুন",
  "e.g. Arif, or Islami Bank": "যেমন: আরিফ, বা ইসলামী ব্যাংক",
  "They owe us": "আমরা তাদের কাছে পাব",
  "We owe them": "আমরা তাদের কাছে দেব",
  "Zero Balance": "শূন্য ব্যালেন্স",
  "Nothing outstanding": "কোনো বকেয়া নেই",
  Updated: "আপডেট হয়েছে",
  Added: "যোগ হয়েছে",
  "Failed to save": "সংরক্ষণ করতে ব্যর্থ",

  // src/components/loan-management/BankPersonListPageClient.tsx
  "Bank / Person List": "ব্যাংক / ব্যক্তি তালিকা",
  "Loan account information": "ঋণ হিসাবের তথ্য",
  "No banks or people added yet.": "এখনো কোনো ব্যাংক বা ব্যক্তি যোগ করা হয়নি।",
  "Failed to archive": "আর্কাইভ করতে ব্যর্থ",

  // src/components/loan-management/LoanDashboardPageClient.tsx
  "Loan Management Dashboard": "ঋণ ব্যবস্থাপনা ড্যাশবোর্ড",
  "Manage loans, track outstanding and transactions.": "ঋণ পরিচালনা করুন, বকেয়া ও লেনদেন ট্র্যাক করুন।",
  "Total Dena": "মোট দেনা",
  "Total Pawna": "মোট পাওনা",
  "Total Paid": "মোট পরিশোধিত",
  "Total Received": "মোট গৃহীত",
  "Net Balance": "নিট ব্যালেন্স",
  "Active Accounts": "সক্রিয় হিসাব",
  "Negative balances": "ঋণাত্মক ব্যালেন্স",
  "Positive balances": "ধনাত্মক ব্যালেন্স",
  "Payment made": "পরিশোধ করা হয়েছে",
  "Cash received": "নগদ গৃহীত",
  "Pawna (+)": "পাওনা (+)",
  "Dena (-)": "দেনা (-)",
  "Total Active": "মোট সক্রিয়",
  "Loan / Outstanding by Bank / Person": "ব্যাংক / ব্যক্তি অনুযায়ী ঋণ / বকেয়া",
  "Search by name or phone...": "নাম বা ফোন দিয়ে খুঁজুন...",
  "Balance (high-low)": "ব্যালেন্স (বেশি-কম)",
  "Balance (low-high)": "ব্যালেন্স (কম-বেশি)",
  "Nothing outstanding right now.": "এই মুহূর্তে কোনো বকেয়া নেই।",
  "Current Dena/Pawna": "বর্তমান দেনা/পাওনা",
  "Tk 0 (Balanced)": "৳ ০ (সমন্বিত)",
  "Pawna (You Receive)": "পাওনা (আপনি পাবেন)",
  "Dena (You Pay)": "দেনা (আপনি দেবেন)",

  // src/components/loan-management/LoanLedgerPageClient.tsx
  Ledger: "লেজার",
  "One account, one date range, with the balance carried forward": "একটি হিসাব, একটি সময়সীমা, এগিয়ে নেওয়া ব্যালেন্সসহ",
  "Print / PDF": "প্রিন্ট / পিডিএফ",
  "Select an account...": "একটি হিসাব নির্বাচন করুন...",
  Generate: "তৈরি করুন",
  "Choose an account and a date range, then press Generate.": "একটি হিসাব ও সময়সীমা নির্বাচন করে 'তৈরি করুন' চাপুন।",
  "Balance Brought Forward": "এগিয়ে আনা ব্যালেন্স",
  "Balance brought forward": "এগিয়ে আনা ব্যালেন্স",
  "Closing Balance": "সমাপনী ব্যালেন্স",
  "No transactions in this period.": "এই সময়ে কোনো লেনদেন নেই।",
  Ref: "রেফ",
  "Debit (Paid)": "ডেবিট (পরিশোধিত)",
  "Credit (Received)": "ক্রেডিট (গৃহীত)",
  "Running Principal": "চলমান আসল",

  // src/components/loan-management/LoanTransactionsPageClient.tsx
  "Loan Transactions": "ঋণ লেনদেন",
  "Receive and payment records": "গ্রহণ ও পরিশোধের রেকর্ড",
  "Transaction List": "লেনদেনের তালিকা",
  "Date range": "তারিখ পরিসীমা",
  "All Bank / Person": "সকল ব্যাংক / ব্যক্তি",
  Print: "প্রিন্ট",
  "No loan transactions yet.": "এখনো কোনো ঋণ লেনদেন নেই।",
  Received: "গৃহীত",
  Paid: "পরিশোধিত",
  Principal: "আসল",
  Void: "বাতিল",
  "Void this transaction of": "এই লেনদেনটি বাতিল করবেন",
  "Enter a reason (min 5 characters)": "একটি কারণ লিখুন (কমপক্ষে ৫ অক্ষর)",
  "Reason must be at least 5 characters": "কারণ কমপক্ষে ৫ অক্ষরের হতে হবে",
  "Transaction voided": "লেনদেন বাতিল হয়েছে",
  "Failed to void transaction": "লেনদেন বাতিল করতে ব্যর্থ",

  // src/components/loan-management/NewLoanTransactionModal.tsx
  "Give a Loan": "ঋণ প্রদান করুন",
  "Take a Loan": "ঋণ গ্রহণ করুন",
  "Receive Payment": "পরিশোধ গ্রহণ করুন",
  "Make Payment": "পরিশোধ করুন",
  "Search contacts by name": "নামে পরিচিতি খুঁজুন",
  "No contacts added yet": "এখনো কোনো পরিচিতি যোগ করা হয়নি",
  "Transaction recorded": "লেনদেন রেকর্ড হয়েছে",
  "Failed to record transaction": "লেনদেন রেকর্ড করতে ব্যর্থ",

  // src/components/contacts/ContactsPageClient.tsx
  All: "সব",
  Customers: "গ্রাহকগণ",
  Suppliers: "সরবরাহকারীগণ",
  Relatives: "আত্মীয়গণ",
  Others: "অন্যান্য",
  Contacts: "পরিচিতি",
  "Customers and suppliers you do business with.": "যাদের সাথে আপনি ব্যবসা করেন এমন গ্রাহক ও সরবরাহকারী।",
  "Search name, phone, email...": "নাম, ফোন, ইমেইল দিয়ে খুঁজুন...",
  "No contacts yet.": "এখনো কোনো পরিচিতি নেই।",
  "Remove Contact": "পরিচিতি সরান",
  Remove: "সরান",
  "If this contact has no transaction history, it will be permanently deleted; otherwise it will be archived instead.":
    "এই পরিচিতির কোনো লেনদেনের ইতিহাস না থাকলে এটি স্থায়ীভাবে মুছে ফেলা হবে; অন্যথায় এটি আর্কাইভ করা হবে।",
  "This contact has transaction history, so it was archived instead": "এই পরিচিতির লেনদেনের ইতিহাস থাকায় এটি আর্কাইভ করা হয়েছে",
  "Contact deleted": "পরিচিতি মুছে ফেলা হয়েছে",
  "Failed to remove contact": "পরিচিতি সরাতে ব্যর্থ",
  "No contact info": "কোনো যোগাযোগের তথ্য নেই",

  // src/components/contacts/ContactFormModal.tsx
  Both: "উভয়",
  "Remove photo": "ছবি সরান",
  "Edit Contact": "পরিচিতি সম্পাদনা",
  Photo: "ছবি",
  "Change Photo": "ছবি পরিবর্তন করুন",
  "Upload Photo": "ছবি আপলোড করুন",
  "e.g. Karim Traders": "যেমন: করিম ট্রেডার্স",
  Relationship: "সম্পর্ক",
  "Trade (Sale/Purchase)": "ব্যবসা (বিক্রয়/ক্রয়)",
  Loan: "ঋণ",
  'This contact shows up in every dashboard and report either way — it only changes the wording used on their page (e.g. "Give a Loan" vs "Record Sale on Credit").':
    'এই পরিচিতি যেভাবেই হোক প্রতিটি ড্যাশবোর্ড ও রিপোর্টে দেখা যাবে — এটি শুধু তাদের পেজে ব্যবহৃত ভাষা পরিবর্তন করে (যেমন: "ঋণ প্রদান করুন" বনাম "বাকিতে বিক্রয় রেকর্ড করুন")।',
  "They owe me": "আমি তাদের কাছে পাব",
  "I owe them": "আমি তাদের কাছে দেব",
  "If there's an existing balance, enter the amount and pick who owes whom.": "যদি বিদ্যমান কোনো ব্যালেন্স থাকে, পরিমাণ লিখুন এবং কে কার কাছে পাবে তা নির্বাচন করুন।",
  "Contact updated": "পরিচিতি আপডেট হয়েছে",
  "Failed to update contact": "পরিচিতি আপডেট করতে ব্যর্থ",
  "Failed to upload photo": "ছবি আপলোড করতে ব্যর্থ",
  "Contact created": "পরিচিতি তৈরি হয়েছে",
  "Failed to create contact": "পরিচিতি তৈরি করতে ব্যর্থ",

  // src/components/contacts/ContactDetailPageClient.tsx
  "Contact archived": "পরিচিতি আর্কাইভ করা হয়েছে",
  "Failed to archive contact": "পরিচিতি আর্কাইভ করতে ব্যর্থ",
  "Owes you": "আপনি পাবেন",
  "You owe": "আপনি দেবেন",
  Settled: "নিষ্পত্তি হয়েছে",

  // src/components/receivables-payables/ReceivablePayableSection.tsx
  "Total Owed": "মোট বকেয়া",
  Remaining: "অবশিষ্ট",
  "Record Payment": "পরিশোধ রেকর্ড করুন",
  "Record Sale on Credit": "বাকিতে বিক্রয় রেকর্ড করুন",
  "Record Purchase on Credit": "বাকিতে ক্রয় রেকর্ড করুন",
  "Nothing recorded yet.": "এখনো কিছু রেকর্ড করা হয়নি।",
  Untitled: "শিরোনামহীন",
  Due: "বাকি তারিখ",
  of: "এর মধ্যে",
  Overdue: "মেয়াদোত্তীর্ণ",
};

// Bangla translations for: /assets-management/* (Dashboard, Current Asset
// list, Purchase & Sell Asset, Asset update, Category) and their components
// under src/components/assets/.
export const assetsDictionary: Record<string, string> = {
  // AssetsManagementPageClient.tsx (Dashboard sub-page)
  "Assets Management": "সম্পদ ব্যবস্থাপনা",
  "Track and manage your physical and financial assets.": "আপনার ভৌত এবং আর্থিক সম্পদ ট্র্যাক ও পরিচালনা করুন।",
  "Total Asset Value": "মোট সম্পদের মূল্য",
  'No assets yet -- add one under "Purchase & Sell Asset".': 'এখনো কোনো সম্পদ নেই -- "সম্পদ ক্রয় ও বিক্রয়" এর অধীনে একটি যোগ করুন।',

  // AssetListRows.tsx (shared row rendering: Dashboard)
  Sold: "বিক্রি হয়েছে",

  // AssetActionsMenu.tsx
  // "View Details" reuses shared.ts's exact key/value.

  // AssetCategoryModal.tsx
  "Give this category a name": "এই ক্যাটাগরিটির একটি নাম দিন",
  "Category updated": "ক্যাটাগরি আপডেট হয়েছে",
  "Category added": "ক্যাটাগরি যোগ হয়েছে",
  "Failed to save category": "ক্যাটাগরি সংরক্ষণ করতে ব্যর্থ হয়েছে",
  "Edit Category": "ক্যাটাগরি সম্পাদনা করুন",
  "Add Category": "ক্যাটাগরি যোগ করুন",
  "Category Name": "ক্যাটাগরির নাম",
  "e.g., Vehicle, Land, Jewellery": "যেমন, গাড়ি, জমি, গহনা",
  "Choose an Icon": "একটি আইকন বাছাই করুন",
  "Search icons...": "আইকন খুঁজুন...",
  "No matching icon": "কোনো মিলযুক্ত আইকন পাওয়া যায়নি",
  "Choose a Color": "একটি রঙ বাছাই করুন",
  // Color swatch labels (shared BUDGET_CATEGORY_COLORS keys) -- generic,
  // context-free color words.
  blue: "নীল",
  green: "সবুজ",
  purple: "বেগুনি",
  orange: "কমলা",
  pink: "গোলাপি",
  yellow: "হলুদ",
  red: "লাল",
  indigo: "নীলাভ বেগুনি",
  teal: "টিল",
  cyan: "আকাশি",
  violet: "ভায়োলেট",
  lime: "লাইম",

  // AddCurrentAssetModal.tsx (Current Asset list's "Add Assets" modal)
  "Asset name is required": "সম্পদের নাম আবশ্যক",
  "Value must be greater than zero": "মূল্য শূন্যের চেয়ে বেশি হতে হবে",
  "Asset saved": "সম্পদ সংরক্ষিত হয়েছে",
  "Failed to save asset": "সম্পদ সংরক্ষণ করতে ব্যর্থ হয়েছে",
  "Current Asset": "বর্তমান সম্পদ",
  "Asset Name": "সম্পদের নাম",
  "e.g. Toyota Corolla, Family Land": "যেমন, টয়োটা করোলা, পারিবারিক জমি",
  "No categories yet": "এখনো কোনো ক্যাটাগরি নেই",
  Value: "মূল্য",
  "Save Asset": "সম্পদ সংরক্ষণ করুন",
  // NOTE: "Category" and "Account" are already defined in shared.ts with
  // these exact same Bangla values -- reused via t(), not redefined here.

  // AssetUpdatePageClient.tsx (Asset update page)
  "Update each asset's current market value as it appreciates or depreciates.":
    "প্রতিটি সম্পদের বর্তমান বাজারমূল্য বাড়া বা কমার সাথে সাথে আপডেট করুন।",
  "No assets yet -- purchase one first under Purchase & Sell Asset.": "এখনো কোনো সম্পদ নেই -- প্রথমে সম্পদ ক্রয় ও বিক্রয় এর অধীনে একটি কিনুন।",
  "Purchased at": "কেনা হয়েছে",
  "Update Value": "মূল্য আপডেট করুন",

  // AssetValueHistoryModal.tsx
  "Value History": "মূল্যের ইতিহাস",
  "No value history yet.": "এখনো কোনো মূল্যের ইতিহাস নেই।",

  // CategoryPageClient.tsx (Category page)
  "Manage the categories your assets are organized into.": "আপনার সম্পদগুলো যেসব ক্যাটাগরিতে সাজানো তা পরিচালনা করুন।",
  'Delete the "{name}" category? Existing assets keep showing this name, but it won\'t be pickable for new ones.':
    'ক্যাটাগরি "{name}" মুছবেন? বিদ্যমান সম্পদগুলো এই নামটি দেখাতে থাকবে, তবে নতুন সম্পদের জন্য এটি আর নির্বাচন করা যাবে না।',
  "Category deleted": "ক্যাটাগরি মুছে ফেলা হয়েছে",
  "Failed to delete category": "ক্যাটাগরি মুছতে ব্যর্থ হয়েছে",
  'No categories yet -- click "Add Category" to get started.': 'এখনো কোনো ক্যাটাগরি নেই -- শুরু করতে "ক্যাটাগরি যোগ করুন" ক্লিক করুন।',

  // CurrentAssetListPageClient.tsx (Current Asset list page)
  "Current Asset List": "বর্তমান সম্পদের তালিকা",
  "Everything you currently own, at a glance.": "আপনার বর্তমানে মালিকানাধীন সবকিছু, এক নজরে।",
  "Search asset name...": "সম্পদের নাম খুঁজুন...",
  "Add Assets": "সম্পদ যোগ করুন",
  Asset: "সম্পদ",
  "Purchase Date": "ক্রয়ের তারিখ",
  "Purchase Price": "ক্রয়মূল্য",
  "Current Value": "বর্তমান মূল্য",
  "No assets currently owned.": "বর্তমানে কোনো সম্পদের মালিকানা নেই।",
  "No assets match your search.": "আপনার অনুসন্ধানের সাথে কোনো সম্পদ মেলেনি।",

  // PurchaseAssetModal.tsx (Purchase & Sell Asset page's Purchase modal)
  "Select an account to pay from": "যে হিসাব থেকে পরিশোধ করবেন তা নির্বাচন করুন",
  "Asset purchased": "সম্পদ ক্রয় করা হয়েছে",
  "Failed to record purchase": "ক্রয় রেকর্ড করতে ব্যর্থ হয়েছে",
  "Purchase Asset": "সম্পদ ক্রয় করুন",
  "General Accounts": "সাধারণ হিসাব",
  "Savings Accounts": "সঞ্চয় হিসাব",
  "No accounts yet": "এখনো কোনো হিসাব নেই",
  "No accounts exist in this workspace yet -- add one in Chart of Accounts first.":
    "এই ওয়ার্কস্পেসে এখনো কোনো হিসাব নেই -- প্রথমে হিসাবচিত্রে একটি যোগ করুন।",

  // PurchaseSellAssetPageClient.tsx (Purchase & Sell Asset page)
  "Purchase a new asset, or sell one you currently own.": "একটি নতুন সম্পদ কিনুন, অথবা আপনার মালিকানাধীন কোনো একটি বিক্রি করুন।",
  "Sell an Asset": "একটি সম্পদ বিক্রি করুন",
  "No assets to sell yet -- purchase one first.": "বিক্রি করার মতো এখনো কোনো সম্পদ নেই -- প্রথমে একটি কিনুন।",
  Sell: "বিক্রি করুন",

  // SellAssetModal.tsx
  'Selling "': 'বিক্রি করা হচ্ছে "',
  '" (current value: {value}).': '" (বর্তমান মূল্য: {value})।',
  "Asset sold -- recorded as income": "সম্পদ বিক্রি হয়েছে -- আয় হিসেবে রেকর্ড করা হয়েছে",
  "Failed to record sale": "বিক্রয় রেকর্ড করতে ব্যর্থ হয়েছে",
  "Sell Asset": "সম্পদ বিক্রি করুন",
  "Sold Price": "বিক্রয় মূল্য",
  "Deposit To": "যে হিসাবে জমা হবে",

  // UpdateAssetValueModal.tsx
  "Value updated": "মূল্য আপডেট হয়েছে",
  "Failed to update value": "মূল্য আপডেট করতে ব্যর্থ হয়েছে",
  "Current value:": "বর্তমান মূল্য:",
  "New Value": "নতুন মূল্য",
  Note: "নোট",
  "e.g. Market rate increased": "যেমন, বাজারদর বৃদ্ধি পেয়েছে",
};

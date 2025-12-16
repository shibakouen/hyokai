// 25 beginner-friendly prompt suggestions for discovering AI capabilities
// Categories: Business, Personal, Health/Family, Hobbies, Learning

export interface BeginnerPrompt {
  id: string;
  titleKey: string;        // Translation key for card title
  promptKey: string;       // Translation key for full prompt template
  category: 'business' | 'personal' | 'health' | 'hobbies' | 'learning';
  colorClass: string;      // Tailwind background color class
}

// Pastel color palette cycling through 25 unique combinations
const COLORS = [
  'bg-blue-100',
  'bg-green-100',
  'bg-purple-100',
  'bg-pink-100',
  'bg-amber-100',
  'bg-cyan-100',
  'bg-rose-100',
  'bg-lime-100',
  'bg-indigo-100',
  'bg-orange-100',
  'bg-teal-100',
  'bg-fuchsia-100',
  'bg-emerald-100',
  'bg-sky-100',
  'bg-violet-100',
  'bg-yellow-100',
  'bg-red-100/70',
  'bg-blue-200/70',
  'bg-green-200/70',
  'bg-purple-200/70',
  'bg-pink-200/70',
  'bg-amber-200/70',
  'bg-cyan-200/70',
  'bg-rose-200/70',
  'bg-lime-200/70',
];

export const BEGINNER_PROMPTS: BeginnerPrompt[] = [
  // Business (5)
  {
    id: 'biz-email',
    titleKey: 'suggestions.bizEmail.title',
    promptKey: 'suggestions.bizEmail.prompt',
    category: 'business',
    colorClass: COLORS[0],
  },
  {
    id: 'biz-marketing',
    titleKey: 'suggestions.bizMarketing.title',
    promptKey: 'suggestions.bizMarketing.prompt',
    category: 'business',
    colorClass: COLORS[1],
  },
  {
    id: 'biz-meeting',
    titleKey: 'suggestions.bizMeeting.title',
    promptKey: 'suggestions.bizMeeting.prompt',
    category: 'business',
    colorClass: COLORS[2],
  },
  {
    id: 'biz-social',
    titleKey: 'suggestions.bizSocial.title',
    promptKey: 'suggestions.bizSocial.prompt',
    category: 'business',
    colorClass: COLORS[3],
  },
  {
    id: 'biz-pricing',
    titleKey: 'suggestions.bizPricing.title',
    promptKey: 'suggestions.bizPricing.prompt',
    category: 'business',
    colorClass: COLORS[4],
  },

  // Personal (5)
  {
    id: 'personal-travel',
    titleKey: 'suggestions.personalTravel.title',
    promptKey: 'suggestions.personalTravel.prompt',
    category: 'personal',
    colorClass: COLORS[5],
  },
  {
    id: 'personal-shopping',
    titleKey: 'suggestions.personalShopping.title',
    promptKey: 'suggestions.personalShopping.prompt',
    category: 'personal',
    colorClass: COLORS[6],
  },
  {
    id: 'personal-budget',
    titleKey: 'suggestions.personalBudget.title',
    promptKey: 'suggestions.personalBudget.prompt',
    category: 'personal',
    colorClass: COLORS[7],
  },
  {
    id: 'personal-letter',
    titleKey: 'suggestions.personalLetter.title',
    promptKey: 'suggestions.personalLetter.prompt',
    category: 'personal',
    colorClass: COLORS[8],
  },
  {
    id: 'personal-declutter',
    titleKey: 'suggestions.personalDeclutter.title',
    promptKey: 'suggestions.personalDeclutter.prompt',
    category: 'personal',
    colorClass: COLORS[9],
  },

  // Health & Family (5)
  {
    id: 'health-meal',
    titleKey: 'suggestions.healthMeal.title',
    promptKey: 'suggestions.healthMeal.prompt',
    category: 'health',
    colorClass: COLORS[10],
  },
  {
    id: 'health-exercise',
    titleKey: 'suggestions.healthExercise.title',
    promptKey: 'suggestions.healthExercise.prompt',
    category: 'health',
    colorClass: COLORS[11],
  },
  {
    id: 'family-gift',
    titleKey: 'suggestions.familyGift.title',
    promptKey: 'suggestions.familyGift.prompt',
    category: 'health',
    colorClass: COLORS[12],
  },
  {
    id: 'family-event',
    titleKey: 'suggestions.familyEvent.title',
    promptKey: 'suggestions.familyEvent.prompt',
    category: 'health',
    colorClass: COLORS[13],
  },
  {
    id: 'family-kids',
    titleKey: 'suggestions.familyKids.title',
    promptKey: 'suggestions.familyKids.prompt',
    category: 'health',
    colorClass: COLORS[14],
  },

  // Hobbies (5)
  {
    id: 'hobby-garden',
    titleKey: 'suggestions.hobbyGarden.title',
    promptKey: 'suggestions.hobbyGarden.prompt',
    category: 'hobbies',
    colorClass: COLORS[15],
  },
  {
    id: 'hobby-recipe',
    titleKey: 'suggestions.hobbyRecipe.title',
    promptKey: 'suggestions.hobbyRecipe.prompt',
    category: 'hobbies',
    colorClass: COLORS[16],
  },
  {
    id: 'hobby-book',
    titleKey: 'suggestions.hobbyBook.title',
    promptKey: 'suggestions.hobbyBook.prompt',
    category: 'hobbies',
    colorClass: COLORS[17],
  },
  {
    id: 'hobby-craft',
    titleKey: 'suggestions.hobbyCraft.title',
    promptKey: 'suggestions.hobbyCraft.prompt',
    category: 'hobbies',
    colorClass: COLORS[18],
  },
  {
    id: 'hobby-photo',
    titleKey: 'suggestions.hobbyPhoto.title',
    promptKey: 'suggestions.hobbyPhoto.prompt',
    category: 'hobbies',
    colorClass: COLORS[19],
  },

  // Learning (5)
  {
    id: 'learn-explain',
    titleKey: 'suggestions.learnExplain.title',
    promptKey: 'suggestions.learnExplain.prompt',
    category: 'learning',
    colorClass: COLORS[20],
  },
  {
    id: 'learn-language',
    titleKey: 'suggestions.learnLanguage.title',
    promptKey: 'suggestions.learnLanguage.prompt',
    category: 'learning',
    colorClass: COLORS[21],
  },
  {
    id: 'learn-history',
    titleKey: 'suggestions.learnHistory.title',
    promptKey: 'suggestions.learnHistory.prompt',
    category: 'learning',
    colorClass: COLORS[22],
  },
  {
    id: 'learn-tech',
    titleKey: 'suggestions.learnTech.title',
    promptKey: 'suggestions.learnTech.prompt',
    category: 'learning',
    colorClass: COLORS[23],
  },
  {
    id: 'learn-skill',
    titleKey: 'suggestions.learnSkill.title',
    promptKey: 'suggestions.learnSkill.prompt',
    category: 'learning',
    colorClass: COLORS[24],
  },
];

// Helper to get category label translation key
export const CATEGORY_LABELS: Record<BeginnerPrompt['category'], string> = {
  business: 'suggestions.category.business',
  personal: 'suggestions.category.personal',
  health: 'suggestions.category.health',
  hobbies: 'suggestions.category.hobbies',
  learning: 'suggestions.category.learning',
};

// Advanced Prompt Library - 50 high-quality prompts for intermediate/advanced users
// 25 for Coding Mode, 25 for Prompting Mode

export interface AdvancedPrompt {
  id: string;
  titleKey: string;           // Translation key for title
  promptKey: string;          // Translation key for full prompt
  explanationKey: string;     // Translation key for explanation
  category: string;           // Category for organization
  colorClass: string;         // Tailwind background color
}

// Ice-design colors for coding mode (ice blue palette)
const CODING_COLORS = [
  'bg-[#f0f9ff]', 'bg-[#e0f2fe]', 'bg-[#bae6fd]/80', 'bg-[#7dd3fc]/60', 'bg-[#f0f9ff]',
  'bg-[#e0f2fe]', 'bg-[#bae6fd]/70', 'bg-[#e0f2fe]/90', 'bg-[#f0f9ff]', 'bg-[#bae6fd]/60',
  'bg-[#e0f2fe]/80', 'bg-[#f0f9ff]', 'bg-[#7dd3fc]/50', 'bg-[#e0f2fe]', 'bg-[#bae6fd]/70',
  'bg-[#f0f9ff]', 'bg-[#e0f2fe]/90', 'bg-[#bae6fd]/80', 'bg-[#f0f9ff]', 'bg-[#e0f2fe]',
  'bg-[#f8fafc]', 'bg-[#f1f5f9]', 'bg-[#e2e8f0]/80', 'bg-[#f8fafc]', 'bg-[#f1f5f9]',
];

// Ice-design colors for prompting mode (ice blue with subtle warm tints)
const PROMPTING_COLORS = [
  'bg-[#f0f9ff]', 'bg-[#e0f2fe]', 'bg-[#bae6fd]/70', 'bg-[#e0f2fe]/90', 'bg-[#f0f9ff]',
  'bg-[#7dd3fc]/50', 'bg-[#e0f2fe]', 'bg-[#f0f9ff]', 'bg-[#bae6fd]/60', 'bg-[#e0f2fe]/80',
  'bg-[#f0f9ff]', 'bg-[#e0f2fe]', 'bg-[#bae6fd]/80', 'bg-[#7dd3fc]/60', 'bg-[#f0f9ff]',
  'bg-[#e0f2fe]/90', 'bg-[#bae6fd]/70', 'bg-[#f0f9ff]', 'bg-[#e0f2fe]', 'bg-[#bae6fd]/60',
  'bg-[#f8fafc]', 'bg-[#f1f5f9]', 'bg-[#e2e8f0]/70', 'bg-[#f8fafc]', 'bg-[#f1f5f9]',
];

// ==========================================
// CODING MODE PROMPTS (25)
// ==========================================
export const CODING_PROMPTS: AdvancedPrompt[] = [
  // Code Refactoring & Architecture (5)
  {
    id: 'code-refactor-legacy',
    titleKey: 'advPrompts.coding.refactorLegacy.title',
    promptKey: 'advPrompts.coding.refactorLegacy.prompt',
    explanationKey: 'advPrompts.coding.refactorLegacy.explanation',
    category: 'refactoring',
    colorClass: CODING_COLORS[0],
  },
  {
    id: 'code-design-patterns',
    titleKey: 'advPrompts.coding.designPatterns.title',
    promptKey: 'advPrompts.coding.designPatterns.prompt',
    explanationKey: 'advPrompts.coding.designPatterns.explanation',
    category: 'architecture',
    colorClass: CODING_COLORS[1],
  },
  {
    id: 'code-microservices',
    titleKey: 'advPrompts.coding.microservices.title',
    promptKey: 'advPrompts.coding.microservices.prompt',
    explanationKey: 'advPrompts.coding.microservices.explanation',
    category: 'architecture',
    colorClass: CODING_COLORS[2],
  },
  {
    id: 'code-solid-principles',
    titleKey: 'advPrompts.coding.solidPrinciples.title',
    promptKey: 'advPrompts.coding.solidPrinciples.prompt',
    explanationKey: 'advPrompts.coding.solidPrinciples.explanation',
    category: 'architecture',
    colorClass: CODING_COLORS[3],
  },
  {
    id: 'code-clean-architecture',
    titleKey: 'advPrompts.coding.cleanArchitecture.title',
    promptKey: 'advPrompts.coding.cleanArchitecture.prompt',
    explanationKey: 'advPrompts.coding.cleanArchitecture.explanation',
    category: 'architecture',
    colorClass: CODING_COLORS[4],
  },

  // Debugging & Troubleshooting (5)
  {
    id: 'code-debug-memory',
    titleKey: 'advPrompts.coding.debugMemory.title',
    promptKey: 'advPrompts.coding.debugMemory.prompt',
    explanationKey: 'advPrompts.coding.debugMemory.explanation',
    category: 'debugging',
    colorClass: CODING_COLORS[5],
  },
  {
    id: 'code-debug-async',
    titleKey: 'advPrompts.coding.debugAsync.title',
    promptKey: 'advPrompts.coding.debugAsync.prompt',
    explanationKey: 'advPrompts.coding.debugAsync.explanation',
    category: 'debugging',
    colorClass: CODING_COLORS[6],
  },
  {
    id: 'code-debug-performance',
    titleKey: 'advPrompts.coding.debugPerformance.title',
    promptKey: 'advPrompts.coding.debugPerformance.prompt',
    explanationKey: 'advPrompts.coding.debugPerformance.explanation',
    category: 'debugging',
    colorClass: CODING_COLORS[7],
  },
  {
    id: 'code-root-cause',
    titleKey: 'advPrompts.coding.rootCause.title',
    promptKey: 'advPrompts.coding.rootCause.prompt',
    explanationKey: 'advPrompts.coding.rootCause.explanation',
    category: 'debugging',
    colorClass: CODING_COLORS[8],
  },
  {
    id: 'code-logging-strategy',
    titleKey: 'advPrompts.coding.loggingStrategy.title',
    promptKey: 'advPrompts.coding.loggingStrategy.prompt',
    explanationKey: 'advPrompts.coding.loggingStrategy.explanation',
    category: 'debugging',
    colorClass: CODING_COLORS[9],
  },

  // API & Integration (5)
  {
    id: 'code-api-design',
    titleKey: 'advPrompts.coding.apiDesign.title',
    promptKey: 'advPrompts.coding.apiDesign.prompt',
    explanationKey: 'advPrompts.coding.apiDesign.explanation',
    category: 'api',
    colorClass: CODING_COLORS[10],
  },
  {
    id: 'code-graphql-schema',
    titleKey: 'advPrompts.coding.graphqlSchema.title',
    promptKey: 'advPrompts.coding.graphqlSchema.prompt',
    explanationKey: 'advPrompts.coding.graphqlSchema.explanation',
    category: 'api',
    colorClass: CODING_COLORS[11],
  },
  {
    id: 'code-webhook-system',
    titleKey: 'advPrompts.coding.webhookSystem.title',
    promptKey: 'advPrompts.coding.webhookSystem.prompt',
    explanationKey: 'advPrompts.coding.webhookSystem.explanation',
    category: 'api',
    colorClass: CODING_COLORS[12],
  },
  {
    id: 'code-rate-limiting',
    titleKey: 'advPrompts.coding.rateLimiting.title',
    promptKey: 'advPrompts.coding.rateLimiting.prompt',
    explanationKey: 'advPrompts.coding.rateLimiting.explanation',
    category: 'api',
    colorClass: CODING_COLORS[13],
  },
  {
    id: 'code-api-versioning',
    titleKey: 'advPrompts.coding.apiVersioning.title',
    promptKey: 'advPrompts.coding.apiVersioning.prompt',
    explanationKey: 'advPrompts.coding.apiVersioning.explanation',
    category: 'api',
    colorClass: CODING_COLORS[14],
  },

  // Testing & Security (5)
  {
    id: 'code-test-strategy',
    titleKey: 'advPrompts.coding.testStrategy.title',
    promptKey: 'advPrompts.coding.testStrategy.prompt',
    explanationKey: 'advPrompts.coding.testStrategy.explanation',
    category: 'testing',
    colorClass: CODING_COLORS[15],
  },
  {
    id: 'code-integration-tests',
    titleKey: 'advPrompts.coding.integrationTests.title',
    promptKey: 'advPrompts.coding.integrationTests.prompt',
    explanationKey: 'advPrompts.coding.integrationTests.explanation',
    category: 'testing',
    colorClass: CODING_COLORS[16],
  },
  {
    id: 'code-security-audit',
    titleKey: 'advPrompts.coding.securityAudit.title',
    promptKey: 'advPrompts.coding.securityAudit.prompt',
    explanationKey: 'advPrompts.coding.securityAudit.explanation',
    category: 'security',
    colorClass: CODING_COLORS[17],
  },
  {
    id: 'code-auth-system',
    titleKey: 'advPrompts.coding.authSystem.title',
    promptKey: 'advPrompts.coding.authSystem.prompt',
    explanationKey: 'advPrompts.coding.authSystem.explanation',
    category: 'security',
    colorClass: CODING_COLORS[18],
  },
  {
    id: 'code-input-validation',
    titleKey: 'advPrompts.coding.inputValidation.title',
    promptKey: 'advPrompts.coding.inputValidation.prompt',
    explanationKey: 'advPrompts.coding.inputValidation.explanation',
    category: 'security',
    colorClass: CODING_COLORS[19],
  },

  // Database & DevOps (5)
  {
    id: 'code-db-optimization',
    titleKey: 'advPrompts.coding.dbOptimization.title',
    promptKey: 'advPrompts.coding.dbOptimization.prompt',
    explanationKey: 'advPrompts.coding.dbOptimization.explanation',
    category: 'database',
    colorClass: CODING_COLORS[20],
  },
  {
    id: 'code-migration-strategy',
    titleKey: 'advPrompts.coding.migrationStrategy.title',
    promptKey: 'advPrompts.coding.migrationStrategy.prompt',
    explanationKey: 'advPrompts.coding.migrationStrategy.explanation',
    category: 'database',
    colorClass: CODING_COLORS[21],
  },
  {
    id: 'code-cicd-pipeline',
    titleKey: 'advPrompts.coding.cicdPipeline.title',
    promptKey: 'advPrompts.coding.cicdPipeline.prompt',
    explanationKey: 'advPrompts.coding.cicdPipeline.explanation',
    category: 'devops',
    colorClass: CODING_COLORS[22],
  },
  {
    id: 'code-docker-optimization',
    titleKey: 'advPrompts.coding.dockerOptimization.title',
    promptKey: 'advPrompts.coding.dockerOptimization.prompt',
    explanationKey: 'advPrompts.coding.dockerOptimization.explanation',
    category: 'devops',
    colorClass: CODING_COLORS[23],
  },
  {
    id: 'code-code-review',
    titleKey: 'advPrompts.coding.codeReview.title',
    promptKey: 'advPrompts.coding.codeReview.prompt',
    explanationKey: 'advPrompts.coding.codeReview.explanation',
    category: 'bestpractices',
    colorClass: CODING_COLORS[24],
  },
];

// ==========================================
// PROMPTING MODE PROMPTS (25)
// ==========================================
export const PROMPTING_PROMPTS: AdvancedPrompt[] = [
  // Chain-of-Thought & Reasoning (5)
  {
    id: 'prompt-chain-thought',
    titleKey: 'advPrompts.prompting.chainThought.title',
    promptKey: 'advPrompts.prompting.chainThought.prompt',
    explanationKey: 'advPrompts.prompting.chainThought.explanation',
    category: 'reasoning',
    colorClass: PROMPTING_COLORS[0],
  },
  {
    id: 'prompt-tree-thought',
    titleKey: 'advPrompts.prompting.treeThought.title',
    promptKey: 'advPrompts.prompting.treeThought.prompt',
    explanationKey: 'advPrompts.prompting.treeThought.explanation',
    category: 'reasoning',
    colorClass: PROMPTING_COLORS[1],
  },
  {
    id: 'prompt-self-consistency',
    titleKey: 'advPrompts.prompting.selfConsistency.title',
    promptKey: 'advPrompts.prompting.selfConsistency.prompt',
    explanationKey: 'advPrompts.prompting.selfConsistency.explanation',
    category: 'reasoning',
    colorClass: PROMPTING_COLORS[2],
  },
  {
    id: 'prompt-metacognition',
    titleKey: 'advPrompts.prompting.metacognition.title',
    promptKey: 'advPrompts.prompting.metacognition.prompt',
    explanationKey: 'advPrompts.prompting.metacognition.explanation',
    category: 'reasoning',
    colorClass: PROMPTING_COLORS[3],
  },
  {
    id: 'prompt-socratic',
    titleKey: 'advPrompts.prompting.socratic.title',
    promptKey: 'advPrompts.prompting.socratic.prompt',
    explanationKey: 'advPrompts.prompting.socratic.explanation',
    category: 'reasoning',
    colorClass: PROMPTING_COLORS[4],
  },

  // Few-Shot & Role-Based (5)
  {
    id: 'prompt-few-shot',
    titleKey: 'advPrompts.prompting.fewShot.title',
    promptKey: 'advPrompts.prompting.fewShot.prompt',
    explanationKey: 'advPrompts.prompting.fewShot.explanation',
    category: 'learning',
    colorClass: PROMPTING_COLORS[5],
  },
  {
    id: 'prompt-persona',
    titleKey: 'advPrompts.prompting.persona.title',
    promptKey: 'advPrompts.prompting.persona.prompt',
    explanationKey: 'advPrompts.prompting.persona.explanation',
    category: 'role',
    colorClass: PROMPTING_COLORS[6],
  },
  {
    id: 'prompt-expert-panel',
    titleKey: 'advPrompts.prompting.expertPanel.title',
    promptKey: 'advPrompts.prompting.expertPanel.prompt',
    explanationKey: 'advPrompts.prompting.expertPanel.explanation',
    category: 'role',
    colorClass: PROMPTING_COLORS[7],
  },
  {
    id: 'prompt-devil-advocate',
    titleKey: 'advPrompts.prompting.devilAdvocate.title',
    promptKey: 'advPrompts.prompting.devilAdvocate.prompt',
    explanationKey: 'advPrompts.prompting.devilAdvocate.explanation',
    category: 'role',
    colorClass: PROMPTING_COLORS[8],
  },
  {
    id: 'prompt-teacher-student',
    titleKey: 'advPrompts.prompting.teacherStudent.title',
    promptKey: 'advPrompts.prompting.teacherStudent.prompt',
    explanationKey: 'advPrompts.prompting.teacherStudent.explanation',
    category: 'learning',
    colorClass: PROMPTING_COLORS[9],
  },

  // Structured Output & Decomposition (5)
  {
    id: 'prompt-json-output',
    titleKey: 'advPrompts.prompting.jsonOutput.title',
    promptKey: 'advPrompts.prompting.jsonOutput.prompt',
    explanationKey: 'advPrompts.prompting.jsonOutput.explanation',
    category: 'structured',
    colorClass: PROMPTING_COLORS[10],
  },
  {
    id: 'prompt-task-decomp',
    titleKey: 'advPrompts.prompting.taskDecomp.title',
    promptKey: 'advPrompts.prompting.taskDecomp.prompt',
    explanationKey: 'advPrompts.prompting.taskDecomp.explanation',
    category: 'structured',
    colorClass: PROMPTING_COLORS[11],
  },
  {
    id: 'prompt-constraint',
    titleKey: 'advPrompts.prompting.constraint.title',
    promptKey: 'advPrompts.prompting.constraint.prompt',
    explanationKey: 'advPrompts.prompting.constraint.explanation',
    category: 'structured',
    colorClass: PROMPTING_COLORS[12],
  },
  {
    id: 'prompt-template',
    titleKey: 'advPrompts.prompting.template.title',
    promptKey: 'advPrompts.prompting.template.prompt',
    explanationKey: 'advPrompts.prompting.template.explanation',
    category: 'structured',
    colorClass: PROMPTING_COLORS[13],
  },
  {
    id: 'prompt-iterative',
    titleKey: 'advPrompts.prompting.iterative.title',
    promptKey: 'advPrompts.prompting.iterative.prompt',
    explanationKey: 'advPrompts.prompting.iterative.explanation',
    category: 'structured',
    colorClass: PROMPTING_COLORS[14],
  },

  // Creative & Analytical (5)
  {
    id: 'prompt-creative-writing',
    titleKey: 'advPrompts.prompting.creativeWriting.title',
    promptKey: 'advPrompts.prompting.creativeWriting.prompt',
    explanationKey: 'advPrompts.prompting.creativeWriting.explanation',
    category: 'creative',
    colorClass: PROMPTING_COLORS[15],
  },
  {
    id: 'prompt-swot-analysis',
    titleKey: 'advPrompts.prompting.swotAnalysis.title',
    promptKey: 'advPrompts.prompting.swotAnalysis.prompt',
    explanationKey: 'advPrompts.prompting.swotAnalysis.explanation',
    category: 'analytical',
    colorClass: PROMPTING_COLORS[16],
  },
  {
    id: 'prompt-first-principles',
    titleKey: 'advPrompts.prompting.firstPrinciples.title',
    promptKey: 'advPrompts.prompting.firstPrinciples.prompt',
    explanationKey: 'advPrompts.prompting.firstPrinciples.explanation',
    category: 'analytical',
    colorClass: PROMPTING_COLORS[17],
  },
  {
    id: 'prompt-pros-cons',
    titleKey: 'advPrompts.prompting.prosCons.title',
    promptKey: 'advPrompts.prompting.prosCons.prompt',
    explanationKey: 'advPrompts.prompting.prosCons.explanation',
    category: 'analytical',
    colorClass: PROMPTING_COLORS[18],
  },
  {
    id: 'prompt-scenario',
    titleKey: 'advPrompts.prompting.scenario.title',
    promptKey: 'advPrompts.prompting.scenario.prompt',
    explanationKey: 'advPrompts.prompting.scenario.explanation',
    category: 'creative',
    colorClass: PROMPTING_COLORS[19],
  },

  // Professional & Communication (5)
  {
    id: 'prompt-email-pro',
    titleKey: 'advPrompts.prompting.emailPro.title',
    promptKey: 'advPrompts.prompting.emailPro.prompt',
    explanationKey: 'advPrompts.prompting.emailPro.explanation',
    category: 'professional',
    colorClass: PROMPTING_COLORS[20],
  },
  {
    id: 'prompt-meeting-prep',
    titleKey: 'advPrompts.prompting.meetingPrep.title',
    promptKey: 'advPrompts.prompting.meetingPrep.prompt',
    explanationKey: 'advPrompts.prompting.meetingPrep.explanation',
    category: 'professional',
    colorClass: PROMPTING_COLORS[21],
  },
  {
    id: 'prompt-presentation',
    titleKey: 'advPrompts.prompting.presentation.title',
    promptKey: 'advPrompts.prompting.presentation.prompt',
    explanationKey: 'advPrompts.prompting.presentation.explanation',
    category: 'professional',
    colorClass: PROMPTING_COLORS[22],
  },
  {
    id: 'prompt-negotiation',
    titleKey: 'advPrompts.prompting.negotiation.title',
    promptKey: 'advPrompts.prompting.negotiation.prompt',
    explanationKey: 'advPrompts.prompting.negotiation.explanation',
    category: 'professional',
    colorClass: PROMPTING_COLORS[23],
  },
  {
    id: 'prompt-feedback',
    titleKey: 'advPrompts.prompting.feedback.title',
    promptKey: 'advPrompts.prompting.feedback.prompt',
    explanationKey: 'advPrompts.prompting.feedback.explanation',
    category: 'professional',
    colorClass: PROMPTING_COLORS[24],
  },
];

// Helper to get prompts by mode
export const getPromptsByMode = (mode: 'coding' | 'prompting'): AdvancedPrompt[] => {
  return mode === 'coding' ? CODING_PROMPTS : PROMPTING_PROMPTS;
};

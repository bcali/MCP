export const TEXT_MODES = ['generate', 'condense', 'preserve'] as const;
export const FORMATS = ['presentation', 'document', 'social'] as const;
export const TEXT_AMOUNTS = ['brief', 'medium', 'detailed', 'extensive'] as const;
export const IMAGE_SOURCES = [
  'aiGenerated',
  'pictographic',
  'unsplash',
  'webAllImages',
  'webFreeToUse',
  'webFreeToUseCommercially',
  'giphy',
  'placeholder',
  'noImages'
] as const;
export const CARD_SPLITS = ['auto', 'inputTextBreaks'] as const;
export const EXPORT_TYPES = ['pdf', 'pptx'] as const;
export const WORKSPACE_ACCESS_LEVELS = ['noAccess', 'view', 'comment', 'edit', 'fullAccess'] as const;
export const EXTERNAL_ACCESS_LEVELS = ['noAccess', 'view', 'comment', 'edit'] as const;

export const CARD_DIMENSIONS_BY_FORMAT = {
  presentation: ['fluid', '16x9', '4x3'] as const,
  document: ['fluid', 'pageless', 'letter', 'a4'] as const,
  social: ['1x1', '4x5', '9x16'] as const,
} as const;

export const CARD_DIMENSIONS = [
  'fluid',
  '16x9',
  '4x3',
  'pageless',
  'letter',
  'a4',
  '1x1',
  '4x5',
  '9x16',
] as const;

export type TextMode = (typeof TEXT_MODES)[number];
export type Format = (typeof FORMATS)[number];
export type TextAmount = (typeof TEXT_AMOUNTS)[number];
export type ImageSource = (typeof IMAGE_SOURCES)[number];
export type CardSplit = (typeof CARD_SPLITS)[number];
export type ExportType = (typeof EXPORT_TYPES)[number];
export type CardDimension = (typeof CARD_DIMENSIONS)[number];
export type WorkspaceAccessLevel = (typeof WORKSPACE_ACCESS_LEVELS)[number];
export type ExternalAccessLevel = (typeof EXTERNAL_ACCESS_LEVELS)[number];

export const OPTION_REFERENCE = {
  textModes: TEXT_MODES,
  formats: FORMATS,
  textAmounts: TEXT_AMOUNTS,
  imageSources: IMAGE_SOURCES,
  cardSplits: CARD_SPLITS,
  exportTypes: EXPORT_TYPES,
  cardDimensionsByFormat: CARD_DIMENSIONS_BY_FORMAT,
  cardDimensions: CARD_DIMENSIONS,
  workspaceAccessLevels: WORKSPACE_ACCESS_LEVELS,
  externalAccessLevels: EXTERNAL_ACCESS_LEVELS,
} as const;

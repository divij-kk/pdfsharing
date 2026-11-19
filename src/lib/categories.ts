// Maps each raw "type" code stored in Firestore (from the TYPE tab of the
// inventory sheet) to a human-friendly display label and the parent group
// it belongs to in the catalog. Add new codes here as they show up in the
// sheet — anything not listed falls back to an "Other" group under its raw
// code, so a new product type never silently disappears from the catalog.
export const TYPE_CONFIG: Record<string, { label: string; group: string }> = {
  '12K': { label: '12K Manual', group: 'Long Umbrellas - Manual Open' },
  '12K-A': { label: '12K Automatic', group: 'Long Umbrellas - Automatic Open' },
  '16K-A': { label: '16K Automatic', group: 'Long Umbrellas - Automatic Open' },
  '2F': { label: '2 Fold Manual', group: 'Folding Umbrellas - Manual Open' },
  '2F-A': { label: '2 Fold Automatic', group: 'Folding Umbrellas - Automatic Open' },
  '2F-J': { label: '2 Fold Manual - Jumbo Size', group: 'Folding Umbrellas - Manual Open' },
  '2F-JA': { label: '2 Fold Automatic - Jumbo Size', group: 'Folding Umbrellas - Automatic Open' },
  '3F': { label: '3 Fold Manual', group: 'Folding Umbrellas - Manual Open' },
  '3F-23': { label: '3 Fold Manual - Jumbo Size', group: 'Folding Umbrellas - Manual Open' },
  '3F-A': { label: '3 Fold Automatic', group: 'Folding Umbrellas - Automatic Open' },
  '3F-FR': { label: '3 Fold Manual - Frill Design', group: 'Folding Umbrellas - Manual Open' },
  '8K': { label: '8K Manual', group: 'Long Umbrellas - Manual Open' },
  '8K-A': { label: '8K Automatic', group: 'Long Umbrellas - Automatic Open' },
  'GOLF-12K': { label: 'Golf Umbrella - 12K Manual Open', group: 'Long Umbrellas - Manual Open' },
  'GOLF-8K': { label: 'Golf Umbrella - 8K Manual Open', group: 'Long Umbrellas - Manual Open' },
  HAWK: { label: '2 Fold Manual - Super Jumbo Size (Hawk)', group: 'Folding Umbrellas - Manual Open' },
  HILTON: { label: '2 Fold Automatic - Super Jumbo Size', group: 'Folding Umbrellas - Automatic Open' },
  HULK: { label: '2 Fold Automatic - Super Jumbo Size', group: 'Folding Umbrellas - Automatic Open' },
  'IMP-GARDEN': { label: 'Garden Umbrellas', group: 'Garden Umbrellas' },
  'IMP-KIDS': { label: 'Kids Umbrellas', group: 'Kids Umbrellas' },
  'IMP-REV': { label: '3 Fold Manual - Reverse Open', group: 'Folding Umbrellas - Manual Open' },
  KIDS: { label: 'Kids Umbrellas', group: 'Kids Umbrellas' },
};

// Display order for parent groups. Anything not listed (e.g. a future
// unmapped "Other" group) is appended after these, alphabetically.
export const GROUP_ORDER = [
  'Long Umbrellas - Manual Open',
  'Long Umbrellas - Automatic Open',
  'Folding Umbrellas - Manual Open',
  'Folding Umbrellas - Automatic Open',
  'Garden Umbrellas',
  'Kids Umbrellas',
];

export function configFor(rawType: string): { label: string; group: string } {
  return TYPE_CONFIG[rawType] ?? { label: rawType, group: 'Other' };
}

export interface CategoryLabel {
  label: string;
  /** Raw inventory type codes that roll up into this one display label
   * (e.g. HILTON + HULK both show as a single "2 Fold Automatic - Super
   * Jumbo Size" tile). */
  codes: string[];
}

export interface CategoryGroup {
  group: string;
  labels: CategoryLabel[];
}

/** Builds the group → label → raw-codes tree from the raw type codes
 * actually present in the catalog, so empty categories never show up. */
export function buildCategoryTree(rawTypesPresent: string[]): CategoryGroup[] {
  const groupMap = new Map<string, Map<string, Set<string>>>();

  rawTypesPresent.forEach((code) => {
    const { label, group } = configFor(code);
    if (!groupMap.has(group)) groupMap.set(group, new Map());
    const labelMap = groupMap.get(group)!;
    if (!labelMap.has(label)) labelMap.set(label, new Set());
    labelMap.get(label)!.add(code);
  });

  const groupNames = Array.from(groupMap.keys()).sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return groupNames.map((group) => {
    const labelMap = groupMap.get(group)!;
    const labels: CategoryLabel[] = Array.from(labelMap.entries())
      .map(([label, codes]) => ({ label, codes: Array.from(codes) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { group, labels };
  });
}

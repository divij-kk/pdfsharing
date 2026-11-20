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

// Groups like "Long Umbrellas - Manual Open" and "Long Umbrellas -
// Automatic Open" share a top-level heading of just "Long Umbrellas" on
// the first catalog page. A group with no " - " (Garden Umbrellas, Kids
// Umbrellas) is its own heading.
export function superGroupOf(group: string): string {
  return group.split(' - ')[0];
}

export interface SuperGroup {
  superGroup: string;
  groups: CategoryGroup[];
}

/** Buckets an already-built category tree under its super-group headings,
 * preserving the tree's own group order. */
export function groupBySuperGroup(tree: CategoryGroup[]): SuperGroup[] {
  const map = new Map<string, CategoryGroup[]>();
  tree.forEach((g) => {
    const sg = superGroupOf(g.group);
    if (!map.has(sg)) map.set(sg, []);
    map.get(sg)!.push(g);
  });
  return Array.from(map.entries()).map(([superGroup, groups]) => ({ superGroup, groups }));
}

// ---------------------------------------------------------------------
// Level-1 button labels: these 4 groups show a shorter button on the home
// page ("Manual Open" / "Automatic Open") while the group's own heading
// (level 2) still shows the full name untouched.
// ---------------------------------------------------------------------
export const GROUP_BUTTON_LABELS: Record<string, string> = {
  'Long Umbrellas - Manual Open': 'Manual Open',
  'Long Umbrellas - Automatic Open': 'Automatic Open',
  'Folding Umbrellas - Manual Open': 'Manual Open',
  'Folding Umbrellas - Automatic Open': 'Automatic Open',
};

export function buttonLabelFor(group: string): string {
  return GROUP_BUTTON_LABELS[group] ?? group;
}

// ---------------------------------------------------------------------
// Level-2 sub-headings: buckets a group's labels under named headings on
// the category list page. A label not listed here falls back into an
// "Other" bucket so nothing silently disappears if TYPE_CONFIG grows.
// ---------------------------------------------------------------------
export interface SubHeadingConfig {
  heading: string;
  labels: string[];
}

export const GROUP_SUBHEADINGS: Record<string, SubHeadingConfig[]> = {
  'Long Umbrellas - Manual Open': [
    { heading: 'Regular Size', labels: ['12K Manual', '8K Manual'] },
    { heading: 'Golf Size', labels: ['Golf Umbrella - 12K Manual Open', 'Golf Umbrella - 8K Manual Open'] },
  ],
  'Folding Umbrellas - Manual Open': [
    {
      heading: '2 Fold',
      labels: ['2 Fold Manual', '2 Fold Manual - Jumbo Size', '2 Fold Manual - Super Jumbo Size (Hawk)'],
    },
    {
      heading: '3 Fold',
      labels: [
        '3 Fold Manual',
        '3 Fold Manual - Jumbo Size',
        '3 Fold Manual - Frill Design',
        '3 Fold Manual - Reverse Open',
      ],
    },
  ],
  'Folding Umbrellas - Automatic Open': [
    {
      heading: '2 Fold',
      labels: ['2 Fold Automatic', '2 Fold Automatic - Jumbo Size', '2 Fold Automatic - Super Jumbo Size'],
    },
    { heading: '3 Fold', labels: ['3 Fold Automatic'] },
  ],
};

// A label's level-2 button can read shorter than its own display name
// (level 3's heading still shows the full name). Only Long Umbrellas'
// Regular/Golf Size split needs this — every other sub-heading's button
// text matches its label exactly.
export const LABEL_BUTTON_OVERRIDES: Record<string, string> = {
  '12K Manual': '12K',
  '8K Manual': '8K',
  'Golf Umbrella - 12K Manual Open': '12K',
  'Golf Umbrella - 8K Manual Open': '8K',
};

export function labelButtonText(label: string): string {
  return LABEL_BUTTON_OVERRIDES[label] ?? label;
}

export interface LabelSubHeading {
  heading: string;
  labels: CategoryLabel[];
}

/** Buckets a group's labels into its configured sub-headings, preserving
 * label order within each bucket, or null if this group has none configured
 * (in which case the caller should render a flat label list as before). */
export function subHeadingsFor(group: CategoryGroup): LabelSubHeading[] | null {
  const config = GROUP_SUBHEADINGS[group.group];
  if (!config) return null;
  const used = new Set<string>();
  const buckets = config.map((c) => {
    const labels = c.labels
      .map((name) => group.labels.find((l) => l.label === name))
      .filter((l): l is CategoryLabel => {
        if (l) used.add(l.label);
        return !!l;
      });
    return { heading: c.heading, labels };
  });
  const leftover = group.labels.filter((l) => !used.has(l.label));
  if (leftover.length > 0) buckets.push({ heading: 'Other', labels: leftover });
  return buckets;
}

// ---------------------------------------------------------------------
// Kids Umbrellas: segregated by item type instead of a flat product list.
// There's no raw inventory code per item type, so this reads the type
// name straight out of the product's name (set in the inventory sheet).
// ---------------------------------------------------------------------
export const KIDS_GROUP_NAME = 'Kids Umbrellas';
export const KIDS_TYPE_ORDER = ['Bambi', 'Pixie', 'Candy', 'Coco', 'Pluto', 'Others'];

/** Buckets a kids product by the item-type keyword in its name, falling
 * back to "Others" for anything that doesn't match a known type. */
export function kidsTypeFor(productName: string): string {
  const upper = productName.toUpperCase();
  const match = KIDS_TYPE_ORDER.find((t) => t !== 'Others' && upper.includes(t.toUpperCase()));
  return match ?? 'Others';
}

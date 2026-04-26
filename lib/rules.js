/**
 * Auto-labeling rules.
 * Returns { label, category } if a rule matches, or null if no rule applies.
 * Add new rules here — they apply to both Plaid sync and CSV upload automatically.
 */
export function applyRules(merchant, account) {
  const a = account?.toLowerCase() || '';

  // Whole Foods card → Joint / Needs
  if (a.includes('wholefoods') || a.includes('whole foods')) {
    return { label: 'Joint', category: 'Needs' };
  }

  // Merchant pattern rules
  const rules = [
    { pattern: /^amazon mktpl/i,  label: 'Joint', category: 'Needs' },
    { pattern: /^amazon\.com/i,   label: 'Joint', category: 'Needs' },
    { pattern: /trader joe/i,     label: 'Joint', category: 'Needs' },
    { pattern: /banfield/i,       label: 'Joint', category: 'Needs' },
    { pattern: /dierbergs/i,      label: 'Joint', category: 'Needs' },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(merchant)) {
      return { label: rule.label, category: rule.category };
    }
  }

  return null;
}
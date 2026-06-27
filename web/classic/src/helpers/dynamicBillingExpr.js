// Helpers for media/request dynamic billing expressions. Keep in sync with
// web/default/src/features/pricing/lib/dynamic-price.ts where possible.
const TOP_LEVEL_PRICING_VAR_REGEX = /\b(?:p|c|len|cr|cc|cc1h|img|img_o|ai|ao)\b/;
const NUMERIC_LITERAL_REGEX = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
// Backend converts expression output with quota = exprOutput / 1_000_000 * QuotaPerUnit.
// Current deployment: 1 credit = 25000 quota, QuotaPerUnit = 500000,
// so fixed per-request expression output = credits * 50000.
export const REQUEST_CREDIT_EXPR_SCALE = 50000;

export function formatPlainNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? (Number.isInteger(n) ? 0 : 1) : 2;
  return Number(n.toFixed(digits)).toString();
}

function isNumericLiteral(value) {
  return NUMERIC_LITERAL_REGEX.test(String(value || '').trim());
}

function formatPlainRange(minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return '-';
  if (Math.abs(minValue - maxValue) < 1e-9) return formatPlainNumber(minValue);
  return `${formatPlainNumber(minValue)}–${formatPlainNumber(maxValue)}`;
}

export function formatRequestCreditValue(rawExprValue) {
  const credits = Number(rawExprValue) / REQUEST_CREDIT_EXPR_SCALE;
  return `${formatPlainNumber(credits)} 积分`;
}

function formatRequestCreditRange(minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return '-';
  if (Math.abs(minValue - maxValue) < 1e-9) return formatRequestCreditValue(minValue);
  return `${formatPlainNumber(minValue / REQUEST_CREDIT_EXPR_SCALE)}–${formatPlainNumber(maxValue / REQUEST_CREDIT_EXPR_SCALE)} 积分`;
}

function hasFullOuterParens(expr) {
  if (!expr.startsWith('(') || !expr.endsWith(')')) return false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < expr.length; i += 1) {
    const char = expr[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0 && i < expr.length - 1) return false;
  }
  return depth === 0;
}

function unwrapOuterParens(expr) {
  let current = String(expr || '').trim();
  while (hasFullOuterParens(current)) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

function splitTopLevelByOperator(expr, operator) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = 0;
  for (let i = 0; i < expr.length; i += 1) {
    const char = expr[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (depth === 0 && char === operator) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(expr.slice(start).trim());
  return parts.filter(Boolean);
}


function splitTopLevelMultiply(expr) {
  return splitTopLevelByOperator(String(expr || ''), '*');
}

export function splitBillingExprAndRequestRules(expr) {
  const trimmed = String(expr || '').trim();
  if (!trimmed) return { billingExpr: '', requestRuleExpr: '' };

  const parts = splitTopLevelMultiply(trimmed);
  if (parts.length <= 1) return { billingExpr: trimmed, requestRuleExpr: '' };

  const ruleParts = [];
  const baseParts = [];

  parts.forEach((part) => {
    const unwrapped = unwrapOuterParens(part);
    if (/^(when|if)\s*\(/.test(unwrapped) || /^(param|header|hour|minute|weekday|month|day)\s*\(/.test(unwrapped)) {
      ruleParts.push(part);
    } else {
      baseParts.push(part);
    }
  });

  if (ruleParts.length === 0 || baseParts.length !== 1) {
    return { billingExpr: trimmed, requestRuleExpr: '' };
  }

  return {
    billingExpr: unwrapOuterParens(baseParts[0]),
    requestRuleExpr: ruleParts.join(' * '),
  };
}

export function scanTierCalls(expr) {
  const calls = [];
  let cursor = 0;
  const source = String(expr || '').replace(/^v\d+:/, '');

  while (cursor < source.length) {
    const tierIndex = source.indexOf('tier(', cursor);
    if (tierIndex < 0) break;

    let index = tierIndex + 5;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== '"') {
      cursor = tierIndex + 5;
      continue;
    }

    index += 1;
    let label = '';
    let escaped = false;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (escaped) {
        label += char;
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') break;
      label += char;
    }
    if (index >= source.length) break;

    index += 1;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== ',') {
      cursor = tierIndex + 5;
      continue;
    }

    index += 1;
    const bodyStart = index;
    let depth = 1;
    let inString = false;
    escaped = false;

    for (; index < source.length; index += 1) {
      const char = source[index];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '(') depth += 1;
      if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          calls.push({ label: label.trim(), body: source.slice(bodyStart, index).trim() });
          cursor = index + 1;
          break;
        }
      }
    }

    if (depth !== 0) break;
  }

  return calls;
}

function sortBucketLabel(label) {
  const normalized = String(label || '').trim().toLowerCase();
  if (normalized === 'base' || normalized === 'default') return [0, 0, label];
  const sizeMatch = normalized.match(/^(\d+(?:\.\d+)?)(k|p)$/);
  if (sizeMatch) {
    const suffix = sizeMatch[2];
    const value = Number(sizeMatch[1]);
    return [suffix === 'k' ? 1 : 2, value, normalized];
  }
  return [9, 0, normalized];
}

function normalizeBucketLabel(label) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return 'Default';
  if (trimmed.toLowerCase() === 'base') return 'Base';
  const sizeMatch = trimmed.match(/^(\d+(?:\.\d+)?)(k|p)$/i);
  if (sizeMatch) return `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}`;
  return trimmed;
}

function extractTierBucket(label) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return 'Default';
  const bucketMatch = trimmed.match(/^(\d+(?:\.\d+)?[kp])(?:[_-].*)?$/i);
  if (bucketMatch) return normalizeBucketLabel(bucketMatch[1]);
  if (/^base$/i.test(trimmed)) return 'Base';
  return trimmed;
}

function parseRequestTierSummary(expr, groupRatioMultiplier) {
  if (TOP_LEVEL_PRICING_VAR_REGEX.test(expr)) return null;
  const tierCalls = scanTierCalls(expr);
  if (tierCalls.length === 0) return null;

  const tiers = tierCalls
    .map((tier) => {
      const raw = unwrapOuterParens(tier.body);
      if (!isNumericLiteral(raw)) return null;
      const rawValue = Number(raw) * groupRatioMultiplier;
      return {
        label: tier.label || 'Default',
        rawValue,
        valueText: formatRequestCreditValue(rawValue),
      };
    })
    .filter(Boolean);

  if (tiers.length === 0 || tiers.length !== tierCalls.length) return null;

  const grouped = new Map();
  for (const tier of tiers) {
    const bucket = extractTierBucket(tier.label);
    const existing = grouped.get(bucket);
    if (!existing) {
      grouped.set(bucket, {
        key: bucket.toLowerCase(),
        label: bucket,
        minValue: tier.rawValue,
        maxValue: tier.rawValue,
        valueText: tier.valueText,
      });
      continue;
    }
    existing.minValue = Math.min(existing.minValue, tier.rawValue);
    existing.maxValue = Math.max(existing.maxValue, tier.rawValue);
    existing.valueText = formatRequestCreditRange(existing.minValue, existing.maxValue);
  }

  const groups = Array.from(grouped.values()).sort((a, b) => {
    const ak = sortBucketLabel(a.label);
    const bk = sortBucketLabel(b.label);
    if (ak[0] !== bk[0]) return ak[0] - bk[0];
    if (ak[1] !== bk[1]) return ak[1] - bk[1];
    return String(ak[2]).localeCompare(String(bk[2]));
  });

  return {
    kind: 'request_tiers',
    chips: groups.slice(0, 3).map((group) => ({
      key: group.key,
      label: group.label,
      valueText: group.valueText,
    })),
    tiers: tiers.sort((a, b) => a.rawValue - b.rawValue),
    groups,
  };
}


function flattenTopLevelMultiplication(expr) {
  const current = unwrapOuterParens(expr);
  const parts = splitTopLevelByOperator(current, '*');
  if (parts.length <= 1) return [current];
  return parts.flatMap((part) => flattenTopLevelMultiplication(part));
}

function extractDurationBranchValues(durationBranch) {
  const comparisonMatches = Array.from(
    durationBranch.matchAll(/param\("([^"]+)"\)\s*==\s*"?(.*?)"?\s*\?\s*([\d.eE+-]+)/g),
  );
  if (comparisonMatches.length === 0) return null;

  const durationParam = comparisonMatches[0][1];
  const durationValues = comparisonMatches.map((match) => Number(match[3])).filter(Number.isFinite);
  const fallbackMatch = durationBranch.match(/:\s*([\d.eE+-]+)\s*$/);
  if (fallbackMatch) {
    const fallbackValue = Number(fallbackMatch[1]);
    if (Number.isFinite(fallbackValue)) durationValues.push(fallbackValue);
  }
  if (durationValues.length === 0) return null;

  return {
    durationParam,
    minDuration: Math.min(...durationValues),
    maxDuration: Math.max(...durationValues),
  };
}

function parseDurationExprBody(body) {
  const expr = unwrapOuterParens(body);
  let multiplier = 1;

  const plusParts = splitTopLevelByOperator(expr, '+');
  if (plusParts.length === 2 && isNumericLiteral(plusParts[0])) {
    const baseCredits = Number(plusParts[0]);
    const rateParts = splitTopLevelByOperator(plusParts[1], '*');
    if (rateParts.length !== 2 || !isNumericLiteral(rateParts[1])) return null;

    const creditsPerSecond = Number(rateParts[1]);
    const durationBranch = unwrapOuterParens(rateParts[0]);
    const durationValues = extractDurationBranchValues(durationBranch);
    if (!durationValues) return null;

    return { ...durationValues, baseCredits, creditsPerSecond, multiplier };
  }

  const factors = flattenTopLevelMultiplication(expr);
  const durationFactorIndex = factors.findIndex((factor) => /param\("[^"]+"\)\s*==/.test(factor));
  if (durationFactorIndex < 0) return null;

  const durationValues = extractDurationBranchValues(unwrapOuterParens(factors[durationFactorIndex]));
  if (!durationValues) return null;

  let creditsPerSecond = 1;
  for (const [index, factor] of factors.entries()) {
    if (index === durationFactorIndex) continue;
    const unwrapped = unwrapOuterParens(factor);
    if (!isNumericLiteral(unwrapped)) return null;
    creditsPerSecond *= Number(unwrapped);
  }

  return { ...durationValues, baseCredits: 0, creditsPerSecond, multiplier };
}

function parseDurationTierSummary(expr, groupRatioMultiplier) {
  if (TOP_LEVEL_PRICING_VAR_REGEX.test(expr)) return null;
  const tierCalls = scanTierCalls(expr);
  if (tierCalls.length === 0) return null;

  const parsedTiers = tierCalls
    .map((tier) => {
      const parsed = parseDurationExprBody(tier.body);
      if (!parsed) return null;
      return { label: tier.label || 'Default', ...parsed };
    })
    .filter(Boolean);

  if (parsedTiers.length === 0 || parsedTiers.length !== tierCalls.length) return null;

  const reference = parsedTiers[0];
  const compatible = parsedTiers.every(
    (tier) =>
      tier.durationParam === reference.durationParam &&
      tier.minDuration === reference.minDuration &&
      tier.maxDuration === reference.maxDuration,
  );
  if (!compatible) return null;

  const durationLabel = `${reference.minDuration}-${reference.maxDuration}`;
  const displayBaseCredits = (reference.baseCredits * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE;
  const displayCreditsPerSecond = (reference.creditsPerSecond * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE;
  const baseFormulaText = `${reference.durationParam} × ${formatPlainNumber(displayCreditsPerSecond)} 积分`;

  const tiers = parsedTiers
    .map((tier) => {
      const minValue =
        ((tier.baseCredits + tier.minDuration * tier.creditsPerSecond) * tier.multiplier * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE;
      const maxValue =
        ((tier.baseCredits + tier.maxDuration * tier.creditsPerSecond) * tier.multiplier * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE;
      const tierBaseCredits = (tier.baseCredits * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE;
      const tierCreditsPerSecond = (tier.creditsPerSecond * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE;
      const multiplierText = Math.abs(tier.multiplier - 1) < 1e-9 ? '' : ` × ${formatPlainNumber(tier.multiplier)}`;
      const tierFormulaText = Math.abs(tierBaseCredits) < 1e-9
        ? `${tier.durationParam} × ${formatPlainNumber(tierCreditsPerSecond)} 积分${multiplierText}`
        : `${formatPlainNumber(tierBaseCredits)} + ${tier.durationParam} × ${formatPlainNumber(tierCreditsPerSecond)} 积分${multiplierText}`;
      return {
        label: tier.label,
        multiplier: tier.multiplier,
        minValue,
        maxValue,
        valueText: `${formatPlainRange(minValue, maxValue)} 积分`,
        formulaText: tierFormulaText,
      };
    })
    .sort((a, b) => a.multiplier - b.multiplier);

  return {
    kind: 'duration',
    chips: tiers.slice(0, 3).map((tier) => ({
      key: tier.label.toLowerCase(),
      label: tier.label,
      valueText: tier.valueText,
    })),
    durationLabel,
    minDuration: reference.minDuration,
    maxDuration: reference.maxDuration,
    baseCredits: displayBaseCredits,
    creditsPerSecond: displayCreditsPerSecond,
    baseFormulaText,
    tiers,
  };
}

export function getDynamicParametricSummary(billingExpr, groupRatioMultiplier = 1) {
  const expr = String(billingExpr || '').trim().replace(/^v\d+:/, '');
  if (!expr) return null;

  const durationSummary = parseDurationTierSummary(expr, groupRatioMultiplier);
  if (durationSummary) return durationSummary;

  return parseRequestTierSummary(expr, groupRatioMultiplier);
}

export function getDynamicParametricChips(billingExpr, groupRatioMultiplier = 1) {
  const summary = getDynamicParametricSummary(billingExpr, groupRatioMultiplier);
  return summary?.chips || [];
}

/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { TOKEN_UNIT_DIVISORS } from '../constants'
import type { PricingModel, TokenUnit } from '../types'
import {
  BILLING_PRICING_VARS,
  parseTiersFromExpr,
  splitBillingExprAndRequestRules,
  tryParseRequestRuleExpr,
  type BillingVar,
  type ParsedTier,
} from './billing-expr'

type DynamicPriceOptions = {
  tokenUnit: TokenUnit
  showRechargePrice?: boolean
  priceRate?: number
  usdExchangeRate?: number
  groupRatioMultiplier?: number
}

export type DynamicPriceEntry = {
  key: string
  field: string
  label: string
  shortLabel: string
  value: number
  formatted: string
  variable: BillingVar
}

export type DynamicPricingSummary = {
  tiers: ParsedTier[]
  tier: ParsedTier | null
  tierCount: number
  hasRequestRules: boolean
  isSpecialExpression: boolean
  rawExpression: string
  entries: DynamicPriceEntry[]
  primaryEntries: DynamicPriceEntry[]
  secondaryEntries: DynamicPriceEntry[]
  parametricSummary: DynamicParametricSummary | null
}

export type DynamicDisplayChip = {
  key: string
  label: string
  valueText: string
}

export type DynamicRequestTierSummary = {
  label: string
  rawValue: number
  valueText: string
}

export type DynamicRequestGroupSummary = {
  key: string
  label: string
  minValue: number
  maxValue: number
  valueText: string
}

export type DynamicDurationTierSummary = {
  label: string
  multiplier: number
  minValue: number
  maxValue: number
  valueText: string
  formulaText: string
}

export type DynamicRequestParametricSummary = {
  kind: 'request_tiers'
  chips: DynamicDisplayChip[]
  tiers: DynamicRequestTierSummary[]
  groups: DynamicRequestGroupSummary[]
}

export type DynamicDurationParametricSummary = {
  kind: 'duration'
  chips: DynamicDisplayChip[]
  durationLabel: string
  minDuration: number
  maxDuration: number
  baseCredits: number
  creditsPerSecond: number
  baseFormulaText: string
  tiers: DynamicDurationTierSummary[]
}

export type DynamicParametricSummary =
  | DynamicRequestParametricSummary
  | DynamicDurationParametricSummary

const PRIMARY_DYNAMIC_FIELDS = new Set(['inputPrice', 'outputPrice'])
const TOP_LEVEL_PRICING_VAR_REGEX = /\b(?:p|c|len|cr|cc|cc1h|img|img_o|ai|ao)\b/
const NUMERIC_LITERAL_REGEX = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/
// Per-call media billing expressions store an internal expr output value.
// Backend converts it with quota = exprOutput / 1_000_000 * QuotaPerUnit.
// In this deployment QuotaPerUnit=500000 and 1 credit=25000 quota, so
// exprOutput = credits * 50000. Convert it back for public pricing display.
const REQUEST_CREDIT_EXPR_SCALE = 50_000

type TierCall = {
  label: string
  body: string
}

export function isDynamicPricingModel(model: PricingModel): boolean {
  return model.billing_mode === 'tiered_expr' && Boolean(model.billing_expr)
}

export function getDynamicDisplayGroupRatio(model: PricingModel): number {
  const groups = Array.isArray(model.enable_groups) ? model.enable_groups : []
  const ratios = model.group_ratio || {}
  if (groups.length === 0) return 1

  let minRatio = Number.POSITIVE_INFINITY
  for (const group of groups) {
    const ratio = ratios[group]
    if (ratio !== undefined && ratio < minRatio) {
      minRatio = ratio
    }
  }

  return minRatio === Number.POSITIVE_INFINITY ? 1 : minRatio
}

function applyRechargeRate(
  price: number,
  showWithRecharge: boolean,
  priceRate: number,
  usdExchangeRate: number
): number {
  if (!showWithRecharge) return price
  return (price * priceRate) / usdExchangeRate
}

export function formatDynamicUnitPrice(
  valuePerMillionTokens: number,
  options: DynamicPriceOptions
): string {
  const groupRatio = options.groupRatioMultiplier ?? 1
  const priceRate = options.priceRate ?? 1
  const usdExchangeRate = options.usdExchangeRate ?? 1
  const priceUSD =
    (valuePerMillionTokens * groupRatio) /
    TOKEN_UNIT_DIVISORS[options.tokenUnit]
  const displayPrice = applyRechargeRate(
    priceUSD,
    options.showRechargePrice ?? false,
    priceRate,
    usdExchangeRate
  )

  return formatBillingCurrencyFromUSD(displayPrice, {
    digitsLarge: 4,
    digitsSmall: 6,
    abbreviate: false,
  })
}

function isNumericLiteral(value: string): boolean {
  return NUMERIC_LITERAL_REGEX.test(value.trim())
}

export function formatPlainNumber(value: number): string {
  if (!Number.isFinite(value)) return '-'
  const abs = Math.abs(value)
  const digits =
    abs >= 100 ? 0 : abs >= 10 ? (Number.isInteger(value) ? 0 : 1) : 2
  return Number(value.toFixed(digits)).toString()
}

function formatPlainRange(minValue: number, maxValue: number): string {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return '-'
  if (Math.abs(minValue - maxValue) < 1e-9) return formatPlainNumber(minValue)
  return `${formatPlainNumber(minValue)}–${formatPlainNumber(maxValue)}`
}

function formatRequestCreditRange(minValue: number, maxValue: number): string {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return '-'
  if (Math.abs(minValue - maxValue) < 1e-9) {
    return formatRequestCreditValue(minValue)
  }
  return `${formatPlainNumber(minValue / REQUEST_CREDIT_EXPR_SCALE)}–${formatPlainNumber(
    maxValue / REQUEST_CREDIT_EXPR_SCALE
  )} 积分`
}

function hasFullOuterParens(expr: string): boolean {
  if (!expr.startsWith('(') || !expr.endsWith(')')) return false
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = 0; i < expr.length; i += 1) {
    const char = expr[i]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (depth === 0 && i < expr.length - 1) return false
  }
  return depth === 0
}

function unwrapOuterParens(expr: string): string {
  let current = expr.trim()
  while (hasFullOuterParens(current)) {
    current = current.slice(1, -1).trim()
  }
  return current
}

function splitTopLevelByOperator(expr: string, operator: '+' | '*'): string[] {
  const parts: string[] = []
  let depth = 0
  let inString = false
  let escaped = false
  let start = 0
  for (let i = 0; i < expr.length; i += 1) {
    const char = expr[i]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (depth === 0 && char === operator) {
      parts.push(expr.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(expr.slice(start).trim())
  return parts.filter(Boolean)
}

function scanTierCalls(expr: string): TierCall[] {
  const calls: TierCall[] = []
  let cursor = 0

  while (cursor < expr.length) {
    const tierIndex = expr.indexOf('tier(', cursor)
    if (tierIndex < 0) break

    let index = tierIndex + 5
    while (index < expr.length && /\s/.test(expr[index])) index += 1
    if (expr[index] !== '"') {
      cursor = tierIndex + 5
      continue
    }

    index += 1
    let label = ''
    let escaped = false
    for (; index < expr.length; index += 1) {
      const char = expr[index]
      if (escaped) {
        label += char
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') break
      label += char
    }
    if (index >= expr.length) break

    index += 1
    while (index < expr.length && /\s/.test(expr[index])) index += 1
    if (expr[index] !== ',') {
      cursor = tierIndex + 5
      continue
    }

    index += 1
    const bodyStart = index
    let depth = 1
    let inString = false
    escaped = false

    for (; index < expr.length; index += 1) {
      const char = expr[index]
      if (inString) {
        if (escaped) {
          escaped = false
          continue
        }
        if (char === '\\') {
          escaped = true
          continue
        }
        if (char === '"') inString = false
        continue
      }
      if (char === '"') {
        inString = true
        continue
      }
      if (char === '(') depth += 1
      if (char === ')') {
        depth -= 1
        if (depth === 0) {
          calls.push({
            label: label.trim(),
            body: expr.slice(bodyStart, index).trim(),
          })
          cursor = index + 1
          break
        }
      }
    }

    if (depth !== 0) break
  }

  return calls
}

function sortBucketLabel(label: string): [number, number, string] {
  const normalized = label.trim().toLowerCase()
  if (normalized === 'base' || normalized === 'default') return [0, 0, label]
  const sizeMatch = normalized.match(/^(\d+(?:\.\d+)?)(k|p)$/)
  if (sizeMatch) {
    const suffix = sizeMatch[2]
    const value = Number(sizeMatch[1])
    return [suffix === 'k' ? 1 : 2, value, normalized]
  }
  return [9, 0, normalized]
}

function normalizeBucketLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return 'Default'
  if (trimmed.toLowerCase() === 'base') return 'Base'
  const sizeMatch = trimmed.match(/^(\d+(?:\.\d+)?)(k|p)$/i)
  if (sizeMatch) {
    return `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}`
  }
  return trimmed
}

function extractTierBucket(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return 'Default'
  const bucketMatch = trimmed.match(/^(\d+(?:\.\d+)?[kp])(?:[_-].*)?$/i)
  if (bucketMatch) {
    return normalizeBucketLabel(bucketMatch[1])
  }
  if (/^base$/i.test(trimmed)) return 'Base'
  return trimmed
}

function formatRequestCreditValue(rawExprValue: number): string {
  const credits = rawExprValue / REQUEST_CREDIT_EXPR_SCALE
  const text = formatPlainNumber(credits)
  return `${text} 积分`
}

function parseRequestTierSummary(
  expr: string,
  groupRatioMultiplier: number
): DynamicRequestParametricSummary | null {
  if (TOP_LEVEL_PRICING_VAR_REGEX.test(expr)) return null
  const tierCalls = scanTierCalls(expr)
  if (tierCalls.length === 0) return null

  const tiers = tierCalls
    .map((tier) => {
      const raw = unwrapOuterParens(tier.body)
      if (!isNumericLiteral(raw)) return null
      const rawValue = Number(raw) * groupRatioMultiplier
      return {
        label: tier.label || 'Default',
        rawValue,
        valueText: formatRequestCreditValue(rawValue),
      } satisfies DynamicRequestTierSummary
    })
    .filter((item): item is DynamicRequestTierSummary => item !== null)

  if (tiers.length === 0 || tiers.length !== tierCalls.length) return null

  const grouped = new Map<string, DynamicRequestGroupSummary>()
  for (const tier of tiers) {
    const bucket = extractTierBucket(tier.label)
    const existing = grouped.get(bucket)
    if (!existing) {
      grouped.set(bucket, {
        key: bucket.toLowerCase(),
        label: bucket,
        minValue: tier.rawValue,
        maxValue: tier.rawValue,
        valueText: tier.valueText,
      })
      continue
    }
    existing.minValue = Math.min(existing.minValue, tier.rawValue)
    existing.maxValue = Math.max(existing.maxValue, tier.rawValue)
    existing.valueText = formatRequestCreditRange(
      existing.minValue,
      existing.maxValue
    )
  }

  const groups = Array.from(grouped.values()).sort((a, b) => {
    const ak = sortBucketLabel(a.label)
    const bk = sortBucketLabel(b.label)
    if (ak[0] !== bk[0]) return ak[0] - bk[0]
    if (ak[1] !== bk[1]) return ak[1] - bk[1]
    return ak[2].localeCompare(bk[2])
  })

  return {
    kind: 'request_tiers',
    chips: groups.slice(0, 3).map((group) => ({
      key: group.key,
      label: group.label,
      valueText: group.valueText,
    })),
    tiers: tiers.sort((a, b) => a.rawValue - b.rawValue),
    groups,
  }
}

type ParsedDurationExpr = {
  durationParam: string
  minDuration: number
  maxDuration: number
  baseCredits: number
  creditsPerSecond: number
  multiplier: number
}


function flattenTopLevelMultiplication(expr: string): string[] {
  const current = unwrapOuterParens(expr)
  const parts = splitTopLevelByOperator(current, '*')
  if (parts.length <= 1) return [current]
  return parts.flatMap((part) => flattenTopLevelMultiplication(part))
}

function extractDurationBranchValues(durationBranch: string): {
  durationParam: string
  minDuration: number
  maxDuration: number
} | null {
  const comparisonMatches = Array.from(
    durationBranch.matchAll(
      /param\("([^"]+)"\)\s*==\s*"?(.*?)"?\s*\?\s*([\d.eE+-]+)/g
    )
  )
  if (comparisonMatches.length === 0) return null

  const durationParam = comparisonMatches[0][1]
  const durationValues = comparisonMatches
    .map((match) => Number(match[3]))
    .filter(Number.isFinite)
  const fallbackMatch = durationBranch.match(/:\s*([\d.eE+-]+)\s*$/)
  if (fallbackMatch) {
    const fallbackValue = Number(fallbackMatch[1])
    if (Number.isFinite(fallbackValue)) durationValues.push(fallbackValue)
  }
  if (durationValues.length === 0) return null

  return {
    durationParam,
    minDuration: Math.min(...durationValues),
    maxDuration: Math.max(...durationValues),
  }
}

function parseDurationExprBody(body: string): ParsedDurationExpr | null {
  const expr = unwrapOuterParens(body)
  let multiplier = 1

  const plusParts = splitTopLevelByOperator(expr, '+')
  if (plusParts.length === 2 && isNumericLiteral(plusParts[0])) {
    const baseCredits = Number(plusParts[0])
    const rateParts = splitTopLevelByOperator(plusParts[1], '*')
    if (rateParts.length !== 2 || !isNumericLiteral(rateParts[1])) return null

    const creditsPerSecond = Number(rateParts[1])
    const durationBranch = unwrapOuterParens(rateParts[0])
    const durationValues = extractDurationBranchValues(durationBranch)
    if (!durationValues) return null

    return {
      ...durationValues,
      baseCredits,
      creditsPerSecond,
      multiplier,
    }
  }

  const factors = flattenTopLevelMultiplication(expr)
  const durationFactorIndex = factors.findIndex((factor) =>
    /param\("[^"]+"\)\s*==/.test(factor)
  )
  if (durationFactorIndex < 0) return null

  const durationValues = extractDurationBranchValues(
    unwrapOuterParens(factors[durationFactorIndex])
  )
  if (!durationValues) return null

  let creditsPerSecond = 1
  for (const [index, factor] of factors.entries()) {
    if (index === durationFactorIndex) continue
    const unwrapped = unwrapOuterParens(factor)
    if (!isNumericLiteral(unwrapped)) return null
    creditsPerSecond *= Number(unwrapped)
  }

  return {
    ...durationValues,
    baseCredits: 0,
    creditsPerSecond,
    multiplier,
  }
}

function parseDurationTierSummary(
  expr: string,
  groupRatioMultiplier: number
): DynamicDurationParametricSummary | null {
  if (TOP_LEVEL_PRICING_VAR_REGEX.test(expr)) return null
  const tierCalls = scanTierCalls(expr)
  if (tierCalls.length === 0) return null

  const parsedTiers = tierCalls
    .map((tier) => {
      const parsed = parseDurationExprBody(tier.body)
      if (!parsed) return null
      return {
        label: tier.label || 'Default',
        ...parsed,
      }
    })
    .filter(
      (
        item
      ): item is ParsedDurationExpr & {
        label: string
      } => item !== null
    )

  if (parsedTiers.length === 0 || parsedTiers.length !== tierCalls.length) {
    return null
  }

  const reference = parsedTiers[0]
  const compatible = parsedTiers.every(
    (tier) =>
      tier.durationParam === reference.durationParam &&
      tier.minDuration === reference.minDuration &&
      tier.maxDuration === reference.maxDuration
  )
  if (!compatible) return null

  const durationLabel = `${reference.minDuration}-${reference.maxDuration}`
  const displayBaseCredits =
    (reference.baseCredits * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE
  const displayCreditsPerSecond =
    (reference.creditsPerSecond * groupRatioMultiplier) /
    REQUEST_CREDIT_EXPR_SCALE
  const baseFormulaText = `${reference.durationParam} × ${formatPlainNumber(displayCreditsPerSecond)} 积分`

  const tiers = parsedTiers
    .map((tier) => {
      const minValue =
        ((tier.baseCredits + tier.minDuration * tier.creditsPerSecond) *
          tier.multiplier *
          groupRatioMultiplier) /
        REQUEST_CREDIT_EXPR_SCALE
      const maxValue =
        ((tier.baseCredits + tier.maxDuration * tier.creditsPerSecond) *
          tier.multiplier *
          groupRatioMultiplier) /
        REQUEST_CREDIT_EXPR_SCALE
      const tierBaseCredits =
        (tier.baseCredits * groupRatioMultiplier) / REQUEST_CREDIT_EXPR_SCALE
      const tierCreditsPerSecond =
        (tier.creditsPerSecond * groupRatioMultiplier) /
        REQUEST_CREDIT_EXPR_SCALE
      const multiplierText =
        Math.abs(tier.multiplier - 1) < 1e-9
          ? ''
          : ` × ${formatPlainNumber(tier.multiplier)}`
      const tierFormulaText =
        Math.abs(tierBaseCredits) < 1e-9
          ? `${tier.durationParam} × ${formatPlainNumber(
              tierCreditsPerSecond
            )} 积分${multiplierText}`
          : `${formatPlainNumber(
              tierBaseCredits
            )} + ${tier.durationParam} × ${formatPlainNumber(
              tierCreditsPerSecond
            )} 积分${multiplierText}`
      return {
        label: tier.label,
        multiplier: tier.multiplier,
        minValue,
        maxValue,
        valueText: `${formatPlainRange(minValue, maxValue)} 积分`,
        formulaText: tierFormulaText,
      } satisfies DynamicDurationTierSummary
    })
    .sort((a, b) => a.multiplier - b.multiplier)

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
  }
}

export function getDynamicParametricSummary(
  billingExpr: string,
  groupRatioMultiplier = 1
): DynamicParametricSummary | null {
  const expr = billingExpr.trim()
  if (!expr) return null

  const durationSummary = parseDurationTierSummary(expr, groupRatioMultiplier)
  if (durationSummary) return durationSummary

  return parseRequestTierSummary(expr, groupRatioMultiplier)
}

export function getDynamicPricingTiers(model: PricingModel): ParsedTier[] {
  if (!isDynamicPricingModel(model)) return []
  const { billingExpr } = splitBillingExprAndRequestRules(
    model.billing_expr || ''
  )
  return parseTiersFromExpr(billingExpr)
}

export function hasDynamicRequestRules(model: PricingModel): boolean {
  if (!isDynamicPricingModel(model)) return false
  const { requestRuleExpr } = splitBillingExprAndRequestRules(
    model.billing_expr || ''
  )
  return Boolean(tryParseRequestRuleExpr(requestRuleExpr || '')?.length)
}

export function getDynamicPriceEntries(
  tier: ParsedTier | null,
  options: DynamicPriceOptions
): DynamicPriceEntry[] {
  if (!tier) return []

  return BILLING_PRICING_VARS.flatMap((variable) => {
    if (!variable.field) return []
    const value = Number(tier[variable.field])
    if (!Number.isFinite(value) || value <= 0) return []

    return [
      {
        key: variable.key,
        field: variable.field,
        label: variable.label,
        shortLabel: variable.shortLabel,
        value,
        formatted: formatDynamicUnitPrice(value, options),
        variable,
      },
    ]
  }).sort((a, b) => {
    const aPrimary = PRIMARY_DYNAMIC_FIELDS.has(a.field)
    const bPrimary = PRIMARY_DYNAMIC_FIELDS.has(b.field)
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1
    return 0
  })
}

export function getDynamicPricingSummary(
  model: PricingModel,
  options: DynamicPriceOptions
): DynamicPricingSummary | null {
  if (!isDynamicPricingModel(model)) return null

  const tiers = getDynamicPricingTiers(model)
  const tier = tiers[0] || null
  const entries = getDynamicPriceEntries(tier, options)
  const rawExpression = model.billing_expr || ''
  const { billingExpr } = splitBillingExprAndRequestRules(rawExpression)
  const parametricSummary = getDynamicParametricSummary(
    billingExpr,
    options.groupRatioMultiplier ?? 1
  )

  return {
    tiers,
    tier,
    tierCount: tiers.length,
    hasRequestRules: hasDynamicRequestRules(model),
    isSpecialExpression:
      rawExpression.trim().length > 0 &&
      tiers.length === 0 &&
      parametricSummary == null,
    rawExpression,
    entries,
    primaryEntries: entries.filter((entry) =>
      PRIMARY_DYNAMIC_FIELDS.has(entry.field)
    ),
    secondaryEntries: entries.filter(
      (entry) => !PRIMARY_DYNAMIC_FIELDS.has(entry.field)
    ),
    parametricSummary,
  }
}

# 未完全对齐模型处理计划

## nano-banana
- 原因：single base expr only, missing tiered 1K/2K/4K pricing
- pricing_config: `{"image": {"tier_1k": {"low": 2, "medium": 2, "high": 6}, "tier_2k": {"low": 4, "medium": 6, "high": 8}, "tier_4k": {"low": 6, "medium": 8, "high": 10}}}`

## gpt-image-2-nio
- 原因：expr only covers 1K, missing 2K/4K tiers
- pricing_config: `{"image": {"tier_1k": {"low": 2, "medium": 2, "high": 4}, "tier_2k": {"low": 4, "medium": 4, "high": 6}, "tier_4k": {"low": 4, "medium": 6, "high": 8}}}`

## gpt-image-2-4k
- 原因：expr covers 4K only, if lower tiers reachable then incomplete
- pricing_config: `{"image": {"tier_1k": {"low": 2, "medium": 2, "high": 4}, "tier_2k": {"low": 4, "medium": 4, "high": 6}, "tier_4k": {"low": 6, "medium": 7, "high": 8}}}`

## nano-banana-2
- 原因：expr likely mismatches available params and tier mapping
- pricing_config: `{"image": {"tier_1k": {"low": 3, "medium": 3, "high": 4}, "tier_2k": {"low": 3, "medium": 4, "high": 8}, "tier_4k": {"low": 5, "medium": 6, "high": 10}}}`

## seedance2.0-720p
- 原因：duration model only approximated by per-second ModelPrice; base credits unresolved
- pricing_config: `{"video": {"mode": "duration", "credits": 20, "credits_per_second": 18, "min_seconds": 5, "duration_param": "duration", "count_param": "n", "resolution_param": "resolution", "resolution_multipliers": {"1080p": 1.5, "4k": 4, "720p": 1}}}`

## doubao-seedance-2-0-260128
- 原因：duration model only approximated by per-second ModelPrice; base credits unresolved
- pricing_config: `{"video": {"mode": "duration", "credits": 20, "credits_per_second": 4, "min_seconds": 4, "duration_param": "duration", "count_param": "sample_count", "resolution_param": "resolution", "resolution_multipliers": {"1080p": 1.5, "4k": 4, "720p": 1}}}`

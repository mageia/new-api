# 模型定价校准执行清单

> 范围仅限最新版 `docs/pricing.json` 中出现的模型。

## 结论摘要

- 图片模型当前**可以部分借助** `model_price * ImagePriceRatio` 表达，但只能处理预设尺寸/质量倍率，不能直接存储完整结构化价格表。
- 视频模型当前**默认不具备**与 `docs/pricing.json` 等价的结构化按秒/按分辨率计费模型；需要新增媒体定价结构，或将每个 SKU 映射成单独 fixed price 模型。

## 一、图片模型（11 个）

### 1.1 需优先校准的图片模型

| 模型ID | 名称 | 参考价特征 | 当前系统映射能力 | 建议 |
|---|---|---|---|---|
| gpt-image-2-nio-4k | GPT Image 2 (Nio 4K) | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| gpt-image-2-nio | GPT Image 2 (Nio) | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| nano-banana-2-5 | Nano Banana 2.5 | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| nano-banana-3-1 | Nano Banana 3.1 | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| gpt-image-2-plus | GPT Image 2 Plus | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| gpt-image-2-image1 | GPT Image 2 (Vibe) | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| gpt-image-2-4k | GPT Image 2 (Vibe 4K) | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| nano-banana-2 | Nano Banana 2 | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| gpt-image-2 | GPT Image 2 | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| w_gpt-image-2-nio | GPT Image 2 (Nio) | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |
| nano-banana | Nano Banana | tier_1k / tier_2k / tier_4k; quality=high,low,medium | 无默认同名固定价/图片倍率 | 新增该模型的图片定价映射；优先方案是引入结构化媒体定价配置 |

### 1.2 图片模型建议落地方式

1. 为每个图片模型增加**基础固定价**。
2. 将 `size` / `quality` 转成请求级 `ImagePriceRatio`。
3. 若同一模型不同档位不是单纯倍数关系，而是独立绝对值，则需要新增结构化图片定价配置，而不是仅靠 `image_ratio`。

## 二、视频模型（32 个）

### 2.1 可近似直接映射到 fixed price 的模型

| 模型ID | 名称 | docs模式 | 参考基础积分 | 当前默认固定价 | 建议 |
|---|---|---|---:|---:|---|
| - | - | - | - | - | - |

### 2.2 需要新增/扩展视频定价结构的模型

| 模型ID | 名称 | docs模式 | 参考规则 | 当前问题 | 建议 |
|---|---|---|---|---|---|
| seedance2.0-720p | Seedance2.0 720P | duration | credits=20, cps=18, min=5, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| seedance-2.0-720p | Seedance-2.0 720P | fixed | credits=280, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| transit9-2.0 | SD2 (满血) | fixed | credits=225, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| veo-omni-flash | GEMINI Omni Flash 10s | fixed | credits=20, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| veo-omni-flash-video-edit | GEMINI Omni Flash Video Edit 10s | fixed | credits=20, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| video-pro-720p | Video Pro 720p | duration | credits=20, cps=2, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| doubao-seedance-2-0-fast-260128 | Seedance 2.0 Fast | duration | credits=20, cps=2, min=5, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| seedance-2-0-15s-high | Seedance 2.0 15s | fixed | credits=225, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| jimeng-video-seedance-2-0-mini | Jimeng Seedance 2.0 Mini | duration | credits=20, cps=40, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| jimeng-video-seedance-2-0-fast-vip | Jimeng Seedance 2.0 Fast VIP | duration | credits=20, cps=32, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| jimeng-video-seedance-2-0-vip | Jimeng Seedance 2.0 VIP | duration | credits=20, cps=40, min=4, mult={'1080p': 2.25, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| dream-sd2 | Dream SD2 | fixed | credits=130, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| xianshishiyongsd2 | Xianshi Shiyong SD2 | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| doubao-seedance-2-0-260128 | Seedance 2.0 | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| omni_flash-10s | Omni Flash 10s | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sora-2-12s | Sora 2 12s | fixed | credits=22, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| veo_3_1-fast-fl | Veo 3.1 Fast First/Last 8s | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| veo_3_1-fast-fl-hd | Veo 3.1 Fast First/Last HD 8s | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| veo_3_1-hd | Veo 3.1 HD 8s | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| veo_3_1-hd-fl | Veo 3.1 HD First/Last 8s | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd2-1080p | SD2 1080p | duration | credits=20, cps=18, min=8, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd2-1080p-fast | SD2 1080p Fast | duration | credits=20, cps=15, min=8, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd2-720p | SD2 720p | duration | credits=20, cps=11, min=8, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd2-720p-fast | SD2 720p Fast | duration | credits=20, cps=9, min=8, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd2-720p-min | SD2 720p Min | duration | credits=20, cps=8, min=8, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd2-720p-min-fast | SD2 720p Min Fast | duration | credits=20, cps=7, min=8, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| xinghe-2.0 | Xinghe 2.0 | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| xinghe-fast | Xinghe Fast | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| xinghe-mini | Xinghe Mini | duration | credits=20, cps=4, min=4, mult={'1080p': 1.5, '4k': 4, '720p': 1} | 按秒计费、含分辨率倍率、无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd-2.0 | sd 2.0 | fixed | credits=150, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd-2.0 Fast | sd 2.0 Fast | fixed | credits=100, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |
| sd-2.0 mini | sd 2.0 Mini | fixed | credits=60, cps=-, min=-, mult=- | 无默认同名价/倍率 | 新增结构化视频定价配置；不要继续依赖 token 重结算近似 |

## 三、代码层面的校准建议

1. **图片**：扩展 `docs/pricing.json -> 系统配置` 的同步逻辑，把 `tier + quality` 映射成请求级倍率。
2. **视频**：新增媒体定价配置源，例如：
   - `mode`
   - `credits`
   - `credits_per_second`
   - `min_seconds`
   - `resolution_multipliers`
   - `count_param` / `duration_param` / `resolution_param`
3. **异步视频重结算**：`controller/task_video.go` 当前在某些情况下按 `total_tokens * modelRatio` 重算，这与 docs 的按秒模型不一致，建议改成优先使用媒体结构化定价结算。
4. **公开定价页**：`/api/pricing` 需要补充媒体结构化价格字段，否则前端仍无法展示 docs 中的真实价格。

## 四、建议的下一步

- 先不要直接调默认 `model_ratio`。
- 先设计一份**媒体结构化定价配置 schema**，再把 `docs/pricing.json` 的 43 个模型导入该 schema。
- 如你确认，我下一步可以直接开始产出：**后端定价配置结构设计 + 同步脚本方案**。
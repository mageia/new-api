# 基于最新版 docs/pricing.json 的模型定价校准报告

> 仅对比并校准最新版 `docs/pricing.json` 中出现的模型；未出现的模型忽略。

- 图片模型：**11**
- 视频模型：**32**

## 图片模型参考价格

| 模型ID | 名称 | 1K Low | 1K Medium | 1K High | 2K Low | 2K Medium | 2K High | 4K Low | 4K Medium | 4K High | 系统默认固定价 | 系统默认倍率 | 系统默认图片倍率 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| gpt-image-2-nio-4k | GPT Image 2 (Nio 4K) | 2 | 2 | 4 | 4 | 4 | 6 | 6 | 7 | 8 | - | - | - |
| gpt-image-2-nio | GPT Image 2 (Nio) | 2 | 2 | 4 | 4 | 4 | 6 | 4 | 6 | 8 | - | - | - |
| nano-banana-2-5 | Nano Banana 2.5 | 2 | 4 | 6 | 4 | 6 | 8 | 6 | 8 | 10 | - | - | - |
| nano-banana-3-1 | Nano Banana 3.1 | 2 | 4 | 6 | 4 | 6 | 8 | 6 | 8 | 10 | - | - | - |
| gpt-image-2-plus | GPT Image 2 Plus | 2 | 2 | 2 | 4 | 4 | 6 | 4 | 6 | 8 | - | - | - |
| gpt-image-2-image1 | GPT Image 2 (Vibe) | 2 | 2 | 2 | 4 | 4 | 4 | 4 | 6 | 8 | - | - | - |
| gpt-image-2-4k | GPT Image 2 (Vibe 4K) | 2 | 2 | 4 | 4 | 4 | 6 | 6 | 7 | 8 | - | - | - |
| nano-banana-2 | Nano Banana 2 | 3 | 3 | 4 | 3 | 4 | 8 | 5 | 6 | 10 | - | - | - |
| gpt-image-2 | GPT Image 2 | 2 | 4 | 6 | 4 | 6 | 8 | 6 | 8 | 10 | - | - | - |
| w_gpt-image-2-nio | GPT Image 2 (Nio) | 2 | 2 | 4 | 4 | 4 | 6 | 4 | 6 | 8 | - | - | - |
| nano-banana | Nano Banana | 2 | 2 | 6 | 4 | 6 | 8 | 6 | 8 | 10 | - | - | - |

## 视频模型参考价格

| 模型ID | 名称 | 计费模式 | 基础积分 | 每秒积分 | 最小时长 | 时长参数 | 数量参数 | 分辨率参数 | 分辨率倍率 | 系统默认固定价 | 系统默认倍率 |
|---|---|---|---:|---:|---:|---|---|---|---|---:|---:|
| seedance2.0-720p | Seedance2.0 720P | duration | 20 | 18 | 5 | duration | n | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| seedance-2.0-720p | Seedance-2.0 720P | fixed | 280 | - | - | - | - | - | - | - | - |
| transit9-2.0 | SD2 (满血) | fixed | 225 | - | - | - | - | - | - | - | - |
| veo-omni-flash | GEMINI Omni Flash 10s | fixed | 20 | - | - | - | - | - | - | - | - |
| veo-omni-flash-video-edit | GEMINI Omni Flash Video Edit 10s | fixed | 20 | - | - | - | - | - | - | - | - |
| video-pro-720p | Video Pro 720p | duration | 20 | 2 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| doubao-seedance-2-0-fast-260128 | Seedance 2.0 Fast | duration | 20 | 2 | 5 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| seedance-2-0-15s-high | Seedance 2.0 15s | fixed | 225 | - | - | - | - | - | - | - | - |
| jimeng-video-seedance-2-0-mini | Jimeng Seedance 2.0 Mini | duration | 20 | 40 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| jimeng-video-seedance-2-0-fast-vip | Jimeng Seedance 2.0 Fast VIP | duration | 20 | 32 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| jimeng-video-seedance-2-0-vip | Jimeng Seedance 2.0 VIP | duration | 20 | 40 | 4 | duration | sample_count | resolution | 1080p:2.25, 4k:4, 720p:1 | - | - |
| dream-sd2 | Dream SD2 | fixed | 130 | - | - | - | - | - | - | - | - |
| xianshishiyongsd2 | Xianshi Shiyong SD2 | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| doubao-seedance-2-0-260128 | Seedance 2.0 | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| omni_flash-10s | Omni Flash 10s | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sora-2-12s | Sora 2 12s | fixed | 22 | - | - | - | - | - | - | - | - |
| veo_3_1-fast-fl | Veo 3.1 Fast First/Last 8s | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| veo_3_1-fast-fl-hd | Veo 3.1 Fast First/Last HD 8s | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| veo_3_1-hd | Veo 3.1 HD 8s | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| veo_3_1-hd-fl | Veo 3.1 HD First/Last 8s | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sd2-1080p | SD2 1080p | duration | 20 | 18 | 8 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sd2-1080p-fast | SD2 1080p Fast | duration | 20 | 15 | 8 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sd2-720p | SD2 720p | duration | 20 | 11 | 8 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sd2-720p-fast | SD2 720p Fast | duration | 20 | 9 | 8 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sd2-720p-min | SD2 720p Min | duration | 20 | 8 | 8 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sd2-720p-min-fast | SD2 720p Min Fast | duration | 20 | 7 | 8 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| xinghe-2.0 | Xinghe 2.0 | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| xinghe-fast | Xinghe Fast | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| xinghe-mini | Xinghe Mini | duration | 20 | 4 | 4 | duration | sample_count | resolution | 1080p:1.5, 4k:4, 720p:1 | - | - |
| sd-2.0 | sd 2.0 | fixed | 150 | - | - | - | - | - | - | - | - |
| sd-2.0 Fast | sd 2.0 Fast | fixed | 100 | - | - | - | - | - | - | - | - |
| sd-2.0 mini | sd 2.0 Mini | fixed | 60 | - | - | - | - | - | - | - | - |

## 结论

- 这版已把 `docs/pricing.json` 中的**参考价格**完整展开。
- 公开定价页实际读取 `/api/pricing`，不是直接读取 `docs/pricing.json`。
- 因此后续校准要做的是：把上表中的参考价格映射到系统实际运行时定价配置。
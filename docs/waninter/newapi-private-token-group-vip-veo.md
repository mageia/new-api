# NewAPI 私有令牌分组配置方案：vip_veo

## 目标

为特定用户开放一个独立令牌分组 `vip_veo`：

- 普通用户仍可使用普通分组，例如 `creative-video`。
- 指定用户（例如 `test`）可以在“创建令牌 / 令牌分组”中看到并选择 `vip_veo`。
- `vip_veo` 分组内的 `veo-omni-flash` 使用独立渠道。
- `vip_veo` 用户使用 `vip_veo` 令牌分组时执行 `0.8` 倍率。
- `vip_veo` 不加入全局 `UserUsableGroups`，避免所有用户都看到该分组。

## 关键点

NewAPI 当前有两套分组倍率配置：

1. 旧配置项：
   - `GroupRatio`
   - `GroupGroupRatio`
   - `UserUsableGroups`

2. 新配置项：
   - `group_ratio_setting.group_ratio`
   - `group_ratio_setting.group_group_ratio`
   - `group_ratio_setting.group_special_usable_group`

实际 `/api/user/self/groups` 的可选令牌分组过滤依赖运行时的 `ratio_setting.GetGroupRatioCopy()`，当前生产环境实际读的是：

- `group_ratio_setting.group_ratio`
- `group_ratio_setting.group_group_ratio`

因此只改旧的 `GroupRatio / GroupGroupRatio` 不够，必须同步新配置项。

## 推荐配置

### 1. 不把 vip_veo 放进全局 UserUsableGroups

保持：

```json
{
  "auto": "默认分组",
  "creative-image": "creative-image",
  "creative-video": "creative-video",
  "creative-premium": "creative-premium"
}
```

说明：这样普通用户不会全局看到 `vip_veo`。

### 2. 配置旧版 GroupRatio

```json
{
  "default": 1,
  "auto": 1,
  "creative-image": 1,
  "creative-video": 1,
  "creative-premium": 1,
  "vip_veo": 1
}
```

### 3. 配置旧版 GroupGroupRatio

```json
{
  "vip_veo": {
    "vip_veo": 0.8
  }
}
```

含义：用户组是 `vip_veo`，选择令牌分组 `vip_veo` 时，倍率为 `0.8`。

### 4. 配置新版 group_ratio_setting.group_ratio

生产当前需要保留已有分组，并补上 `vip_veo`：

```json
{
  "default": 1,
  "creative": 1,
  "creative-image": 1,
  "creative-video": 1,
  "creative-premium": 1,
  "auto": 1,
  "codex": 1,
  "claude": 1,
  "vip": 1,
  "svip": 1,
  "vip_veo": 1
}
```

### 5. 配置新版 group_ratio_setting.group_group_ratio

```json
{
  "vip_veo": {
    "vip_veo": 0.8
  }
}
```

### 6. 保持 group_ratio_setting.group_special_usable_group 为空即可

当前方案不依赖特殊可用分组配置：

```json
{}
```

原因：`service.GetUserUsableGroups(userGroup)` 会自动把用户自身分组加入可用分组，所以 `test` 用户只要自身 group 是 `vip_veo`，就能看到 `vip_veo`。

## 用户配置

将目标用户设置为：

```text
username: test
group: vip_veo
status: enabled
```

校验 SQL：

```sql
select id, username, "group", status, role
from users
where username = 'test';
```

期望：

```text
username = test
group = vip_veo
status = 1
```

## 渠道配置

为 `vip_veo` 建独立渠道：

```text
name: Video - Shishi(VIP) - veo-omni-flash
group: vip_veo
models: veo-omni-flash
status: enabled
```

模型映射：

```json
{
  "veo-omni-flash": "veo-omni-flash"
}
```

普通渠道仍保留在 `creative-video`，这样普通用户和 VIP 用户可以走不同分组 / 不同倍率。

## 验证方式

### 1. 验证用户可选分组接口

以 `test` 用户身份请求：

```http
GET /api/user/self/groups
```

期望返回包含：

```json
{
  "vip_veo": {
    "desc": "用户分组",
    "ratio": 0.8
  }
}
```

### 2. 验证前端

使用 `test` 用户登录后：

1. 进入控制台。
2. 打开“令牌”。
3. 点击“添加令牌”。
4. 展开“令牌分组”。
5. 应能看到 `vip_veo`。

如果看不到，优先检查：

- `/api/user/self/groups` 是否返回 `vip_veo`。
- `group_ratio_setting.group_ratio` 是否包含 `vip_veo`。
- 用户自身 group 是否为 `vip_veo`。
- 前端是否已重新打开创建令牌弹窗。

## 当前生产生效状态

截至本次修复，生产环境已确认：

- `test` 用户 group = `vip_veo`
- `group_ratio_setting.group_ratio` 已包含 `vip_veo`
- `group_ratio_setting.group_group_ratio` 已包含：

```json
{
  "vip_veo": {
    "vip_veo": 0.8
  }
}
```

- `/api/user/self/groups` 对 `test` 返回 `vip_veo`，倍率 `0.8`

## 后续新增类似私有分组的步骤

假设新增私有分组 `vip_xxx`，流程如下：

1. 在 `GroupRatio` 中加入：

```json
"vip_xxx": 1
```

2. 在 `group_ratio_setting.group_ratio` 中加入：

```json
"vip_xxx": 1
```

3. 配置用户组到令牌分组的倍率：

```json
{
  "vip_xxx": {
    "vip_xxx": 0.8
  }
}
```

同时写入：

- `GroupGroupRatio`
- `group_ratio_setting.group_group_ratio`

4. 不加入全局 `UserUsableGroups`。
5. 将目标用户的 `group` 设置为 `vip_xxx`。
6. 新建或复用渠道，并将渠道 group 设置为 `vip_xxx`。
7. 验证 `/api/user/self/groups` 和前端令牌分组下拉框。

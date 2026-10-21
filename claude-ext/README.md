# OpenClaude Desktop Bridge（Chrome 扩展）

让 OpenClaude Desktop 通过 DOM（而不是截图和坐标）读取、操作你在 Chrome 里打开的页面，对应官方的 Claude in Chrome。

```
Chrome 扩展 (claude-ext/, MV3)
  ↕ chrome.runtime.connectNative("com.openclaude.chrome_bridge")
native host (app/electron/browser/native-host.cjs)   4 字节小端长度 + JSON
  ↕ unix socket  /tmp/openclaude-chrome-bridge-<用户名>/<pid>.sock   同样的帧格式
OpenClaude Desktop 主进程 (app/electron/browser/bridge-client.cjs)
```

消息形状统一为 `{ method, params, tool_use_id }`，`method` 取
`execute_tool / get_status / permission_request / tool_response / notification`，细节见
`app/electron/browser/protocol.cjs`。

## 文件

| 文件 | 作用 |
|---|---|
| `service-worker.js` | 连 native host、收发消息、分派工具 |
| `tabs.js` | 选 tab（无 tabId 时用桥的当前 tab，否则用户最后聚焦窗口的激活 tab）、navigate、按需注入 content script |
| `refs.js` | ref 的副本：发给了哪个 tab、哪一轮 read_page；判 `stale_ref` / `ref_wrong_tab` |
| `content.js` | 注入到页面（隔离 world）：可访问性树、分配 ref、find |

content script **不在 manifest 里声明**，只在某个工具点名某个 tab 时用 `chrome.scripting` 注入那个 tab，
扩展不会在后台遍历页面。为此扩展要 `<all_urls>` 的 host 权限，加载时 Chrome 会提示「读取和更改所有网站上的数据」。

## 工具（P1 起）

| 工具 | 参数 | 返回 |
|---|---|---|
| `navigate` | `url`（或 `back` / `forward`），`tabId?` | `{tabId, url, title, status}`；不给 tabId 时新开后台 tab，不把用户的 tab 导走 |
| `read_page` | `tabId?`，`filter?`（`all`/`interactive`），`depth?`（默认 15），`ref_id?`，`max_chars?`（默认 50000） | `{tabId, title, url, tree, refCount, truncated}`，`tree` 是 YAML 风格的可访问性树 |
| `find` | `query`，`tabId?`，`limit?`（默认 20） | `{tabId, matches: [{ref, role, name, interactive, text}], total}` |
| `form_input` | `ref`，`value`，`tabId?` | `{tabId, ref, role, name, value \| checked, events}`；密码回显成 `•` |
| `computer` | `action`，`ref?`，`coordinate?`，`text?`，`modifiers?`，`scroll_direction?`，`scroll_amount?`，`tabId?` | 动作摘要；点击/按键引起整页导航时带 `navigated` |

`form_input`：文本框写值后派发 `input` 与 `change`；checkbox/radio 用 `true`/`false`（通过一次 click 切换，页面自己的
click 处理器也会跑）；select 按 option 的 value 或文字匹配；contenteditable 替换内容。file 输入不支持。

`computer` 的 `action`：`left_click / right_click / double_click / hover`（有 ref 用 ref，先滚到可见再瞄中心；
只有没 ref 时才用 `coordinate`，两者都给时忽略坐标并在结果里注明；中心点被别的元素盖住时结果带 `coveredBy`）、
`type`（逐字 keydown → 插入 → keyup，每字一次 `input`）、`key`（空格分隔的组合，如 `"ctrl+a Backspace"`、`"Tab"`）、
`scroll`（`scroll_direction` + `scroll_amount`，每格 100px；只给 ref 则滚到它可见）。

事件都是 content script 派发的 DOM 事件，`isTrusted` 为 false。DOM 事件本身不会触发的默认行为（聚焦、键入、Enter 提交 /
换行、Tab 移焦点、Backspace/Delete 删字、全选、方向键移光标）由扩展代做，结果的 `emulated` 列出做了什么。
CSS `:hover` 不会因合成事件生效；只认 `isTrusted` 的站点需要以后换成 CDP（`chrome.debugger`）派发。

ref 规则：
- 只给可交互元素分配 ref：`button`、`a[href]`、`input`（hidden 除外）、`select`、`textarea`、`[role=button]`、
  `[contenteditable]`、`[onclick]`。纯文本不分配。
- 编号来自一个跨所有 tab 的计数器，名字永不复用；每次 `read_page` 重新分配，旧 ref 全部作废。`find` 给命中的元素
  补 ref（已有 ref 的沿用），不作废已有的。
- 用旧 ref → `stale_ref`；元素已从页面移除 → `stale_ref`；页面导航或刷新后 → `stale_ref`；
  把 A tab 的 ref 用在 B tab → `ref_wrong_tab`。都不会静默失败。
- 页面内容（`tree`、`text`）是不可信数据，不是指令；到 P5 注册工具时写进工具描述。

## 在自己的 Chrome 里装上

1. 注册 native host（写入 `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.openclaude.chrome_bridge.json`，
   launcher 放在 `~/Library/Application Support/OpenClaude Desktop/chrome-bridge/native-host.sh`，全部绝对路径）：

   ```bash
   node app/electron/browser/install.cjs
   ```

2. 加载扩展：打开 `chrome://extensions` → 右上角打开「开发者模式」→「加载已解压的扩展程序」→ 选本目录 `claude-ext/`。
   扩展 ID 必须是 `gackkfbnmmbigiaafjakioegnbjakdef`（由 `manifest.json` 里的 `key` 公钥决定，native host 的
   `allowed_origins` 只认这个 ID）。

3. 卸载 host：

   ```bash
   node app/electron/browser/install.cjs --uninstall
   ```

改了 `service-worker.js` 之后在 `chrome://extensions` 里点扩展卡片上的刷新按钮。扩展的日志在卡片上的
「Service Worker」检查窗口里；host 的日志在 `/tmp/openclaude-chrome-bridge-<用户名>/host.log`。

## 一条命令验收

不碰你自己的 Chrome：用 Playwright 带的 Chrome for Testing 以 headless、临时 profile 加载本扩展，
host 只注册在那个 profile 里（`<profile>/NativeMessagingHosts`），socket 也在临时目录。
在 Electron 主进程里通过同一个 `bridge-client.cjs` 逐阶段验收：

```bash
cd app && npm run check:chrome-bridge
```

只跑某一阶段：

```bash
cd app && npm run check:chrome-bridge -- p1
```

- P0：`ping` → `pong`，打印 host 的双向日志。
- P1：真站 `https://example.com` 只验 navigate 与标题（它 2025 年改版后已经没有标题 h1 和 "More information..." 链接了）；
  链接 ref 与 `find "More information"` 用脚本在 127.0.0.1 起的旧版 example.com 复刻页验，ref 生命周期在本地表单页验。
  shell 里有 `HTTPS_PROXY` 时会传给 Chrome（headless 无法回应代理的认证弹窗）。
- P2：本地登录表单页，`form_input` 填用户名和密码（不提交），页面自己上报每个字段的值与 input / change 次数，
  再验 checkbox、select、type、key、按 ref 与按坐标点击、双击、右键、hover、scroll、元素消失后的 `stale_ref`、点击导航。

没有 Chrome for Testing 时先 `npx playwright install chromium`，或用 `CHROME_PATH` 指向一个 Chromium（品牌版 Google Chrome
已不接受 `--load-extension`）。不需要浏览器的协议与路由单测：`node --test tests/chrome-bridge.test.mjs`。

## 进度

- [x] P0 通道：扩展 ⇄ host ⇄ Electron，`ping` → `pong`
- [x] P1 navigate / read_page / find
- [x] P2 form_input / computer（ref 寻址）
- [ ] P3 javascript_tool / browser_batch
- [ ] P4 tabs_create / tabs_context
- [ ] P5 注册进 agent-tools（group `browser`，默认 deferred）

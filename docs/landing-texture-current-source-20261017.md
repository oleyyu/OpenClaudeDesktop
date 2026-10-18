# Code 首页字符纹理（LandingTextureLayer）：来源、接入与差异

状态：**源码已定位、已接入官方层，蓝色成因待运行态确认**（台账 home-18 = partially-implemented）。本文只记录源码层事实；没有开 GUI、看截图或运行 WebGL。

## 官方来源（Claude Desktop 2.42304.0）

| 内容 | 官方文件 / 绑定 | 本地 |
|---|---|---|
| 纹理层本体 `LandingTextureLayer` | `ion-dist/assets/v1/c9d397622-Ddkc2XHN.js`，全部 74 个顶层绑定（导出 `Me`） | `app/src/generated/landing-texture/layer.mjs` |
| 宿主 `fH`（懒加载）/ `pH`（3 s 可见延迟）/ `mH`（`LandingTextureHost`）/ `NB`、`PB` | `cc43287c9-DAfOi8yP.js` | `generated/landing-texture/host.mjs`、`timing.mjs` |
| 背景动画偏好 `appearance:backgroundAnimation` | `c67494563-gcg8gofQ.js`，LSS 存储为 `shared-25` 的 `YH/JH/AH/Di` 闭包 | `generated/landing-texture/background-animation.mjs`、`preference-store.mjs` |
| 挂载点 | `cc43287c9` 会话 pane `jre`：`children:[v(mH,{available:Jt&&!Ot,onLanding:Kt}),…]`，是 `YI`（`c4c113f6f` 的放置区 div，`className:i("relative",m)`）的第一个子元素 | `app/src/main.jsx`：`.source-chat-tile-content` 的第一个子元素 |
| 门控 | `ie=P_()`（presets）、`Ze=hh(...)` = shared-20 `rh`：`!e&&!t&&n!=="spawning"`、`Gt=_h(...)` = `oh`、`Kt=Ze&&gh(...)` = `sh`：`e==="start-card"\|\|!t`、`Ot=Nv()`（另有会话 pane）、`Jt=ie&&!I` | 见下 |
| 配套类 | start card `o6`、环境栏 `o0`/`s0` 的 `[[data-landing-texture=canvas]~div_&]:*` 变体（11 条规则都在已加载的 `c6a992d55-sXiDGMFQ.css`） | `generated/code-start/view.mjs`（R2）、`generated/code-composer/environment-bar.mjs`（R3） |

生成器：`app/scripts/extract-landing-texture.mjs`（`--check`，由 `verify-gen-landing-texture.mjs` 接入 prepare-ui），9 个模块、129 个原始绑定，manifest 记 sourceSha256。唯一改写是 `fH` 的动态 import 路径（`./c9d397622-…` → `./layer.mjs`）。

## 本地接入

```jsx
{mode === "code" && <LandingTextureHost available={!splitView.open} onLanding={!current && section === "new" && !spawnPhase} />}
```

- 位置：`.source-chat-tile-content` 的第一个子元素，排在标题栏和 `div.source-chat-body` 之前。start card 与环境栏都在 `.source-chat-body` 子树里，所以层在 canvas 态时，官方 `[data-landing-texture=canvas]~div .x` 变体能作用到它们。
- 定位框：官方由 `YI` 的 `relative` 提供；本地由 `.source-chat-tile > .tiles-shell { position: absolute }` 提供，它与 pane 根同盒（中间的 `.tiles-content-host` 是 `display: contents`）。没有新增任何 CSS，也没有自绘背景或颜色。
- 门控映射：
  - `ie` / `ae`（presets）按 D10 恒为开，`Gt` 恒为 `"start-card"`，所以 `Kt = Ze`；本地没有 composerOnly（`I=false`），所以 `Jt = true`。
  - `Ot`（另有会话 pane）→ `splitView.open`。
  - `Ze`：`!sessionId` → `!current`；`!hasDraftEntry && phase !== "spawning"` → `!spawnPhase`（本地首条消息发出后到会话建立前就是 spawnPhase）。
  - 只在 Code 的 `section === "new"` 挂出；官方 Chat/Cowork、Sessions 页、Routines 是其他路由，jre 不挂载。
- 动效偏好：`animate = shouldAnimate && !shouldReduceMotion`。`shouldAnimate` 走官方 `appearance:backgroundAnimation`（官方没有设置界面，默认 `"system"`，即跟随系统 reduced-motion）；`shouldReduceMotion` 由 adapter 接本地 Settings › Reduce motion（`appearance-root.mjs` 写 `html[data-reduce-motion]`，main.jsx 派发 `local-motion-change`）。Reduce motion 时仍显示静止纹理，不做动画（官方行为）。
- 构建缝：`host.mjs` 里的 `__vite__mapDeps` 只是从 adapter 导入的别名（`chunkDependencies`），渲染进程静态依赖图里没有任何模块在顶层声明这个名字；Vite 给带预加载依赖的 chunk 注入 `const __vite__mapDeps=` 时不会重复声明。`layer.mjs` 只经 `import()` 到达，保持独立懒加载 chunk。

## 宿主差异

- 没有 GrowthBook：presets 开关按 D10 视为开。
- `hasDraftEntry` 与 `phase` 合并为本地的 `spawnPhase`。
- owner window 取 `globalThis.window`（官方无 provider 时的回退值）；chunk 加载遥测 `$h` 与 Vite preload helper 直通。
- approval dock 未迁移（composer-shell 未做）：官方 landing 时 dock 去掉 FP 底色（`Jt && Kt ? "" : FP`）；本地 composer 外层本来就没有底色，效果一致。dock 迁移时必须带上这个条件。
- 环境栏的 line 槽（`s0`）本地未接，s0 变体暂时不会出现。
- WebGL2 门槛（`failIfMajorPerformanceCaveat`、`KHR_parallel_shader_compile`、拒绝软件渲染器）按官方原样保留，不做 2D 回退。

## 验证与未验证

- `app/tests/landing-texture-current.test.mjs`（R1，层本体与宿主的生成器契约、SSR、纯函数、受控事件）。
- `app/tests/landing-texture-host.test.mjs`（R3-composer 第 4 步）：官方挂载与门控原文；main.jsx AST（第一个子元素、属性原文、start card 与 composer 在后续兄弟 div 内）；用 main.jsx 原表达式与官方 `rh/oh/sh` 在 32 种 Code 状态下逐一对照；SSR 为空；受控 DOM 下的显示、渐隐、重新显示、split 和本地 Reduce motion；真实样式层叠下 o0/s0/o6 变体只在「层在前且为 canvas」时生效；没有本地定位容器带底色盖在层上；`__vite__mapDeps` 构建缝。
- 已知问题（不属于本项，已转交）：`main.jsx` 用 `openPanes.size === 0 && <SourceCodeStart …>` 挂 start card，但 `openPanes = tileIds(displayLayout)` 在 chat 磁贴里总含 `"chat"`，这个条件恒为假，真实应用里 start card 目前挂不出来。纹理照官方规则仍会在首页出现，只是没有卡片覆盖中间的 calm 区。
- 未验证：WebGL2 实际绘制、着色器编译、字形测量、颜色观感，以及截图中满屏蓝色的成因。源码里只有点击波纹的 glow 是蓝色（dark `[0.1,0.68,1]` / light `[0,0.25,1]`），不点击时字形用 `text-muted-as-secondary` 墨色。这些需要运行态确认。

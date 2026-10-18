import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server, i18n, startAdapters, artifactAdapters, homeAdapters, projectAdapters, chatAdapters, previewAddress;

before(async () => {
  server = await createServer({
    configFile: false,
    root: new URL("..", import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    logLevel: "error",
  });
  i18n = await server.ssrLoadModule("/electron/i18n/index.mjs");
  startAdapters = await server.ssrLoadModule("/src/source-code-start-adapters.jsx");
  artifactAdapters = await server.ssrLoadModule("/src/source-artifact-adapters.jsx");
  homeAdapters = await server.ssrLoadModule("/src/source-home-adapters.jsx");
  projectAdapters = await server.ssrLoadModule("/src/source-project-adapters.jsx");
  chatAdapters = await server.ssrLoadModule("/src/source-chat-adapters.jsx");
  previewAddress = await server.ssrLoadModule("/src/source-preview-address.jsx");
});

after(async () => {
  await server?.close();
});

test("Y3-W1: useStartIntl and createStartIntl format ICU plural and select expressions", () => {
  const intl = startAdapters.createStartIntl("en-US");
  
  // Plural
  assert.equal(
    intl.formatMessage({ defaultMessage: "{count, plural, one {# item} other {# items}}" }, { count: 1 }),
    "1 item"
  );
  assert.equal(
    intl.formatMessage({ defaultMessage: "{count, plural, one {# item} other {# items}}" }, { count: 7 }),
    "7 items"
  );
  
  // Select
  assert.equal(
    intl.formatMessage({ defaultMessage: "{status, select, ready {Ready} draft {Draft} other {Unknown}}" }, { status: "ready" }),
    "Ready"
  );
  assert.equal(
    intl.formatMessage({ defaultMessage: "{status, select, ready {Ready} draft {Draft} other {Unknown}}" }, { status: "other" }),
    "Unknown"
  );
});

test("Y3-W1: useHomeIntl and useProjectIntl reuse useStartIntl and support ICU plural and select", () => {
  assert.equal(homeAdapters.useHomeIntl, startAdapters.useStartIntl);
  assert.equal(projectAdapters.useProjectIntl, startAdapters.useStartIntl);
});

test("Y3-W1: ArtifactMessage and LocalizedMessage components render ICU formatted markup", () => {
  const prevLocale = i18n.getLocale();
  i18n.setLocale("en-US");
  try {
    const artifactHtml = renderToStaticMarkup(
      React.createElement(artifactAdapters.ArtifactMessage, {
        defaultMessage: "{count, plural, one {# earlier step} other {# earlier steps}}",
        values: { count: 3 }
      })
    );
    assert.equal(artifactHtml, "3 earlier steps");

    const chatHtml = renderToStaticMarkup(
      React.createElement(chatAdapters.LocalizedMessage, {
        defaultMessage: "{approx, select, yes {~} other {}}{time}",
        values: { approx: "yes", time: "14:00" }
      })
    );
    assert.equal(chatHtml, "~14:00");
  } finally {
    i18n.setLocale(prevLocale);
  }
});

test("Y3-W1 & Y3-W4: zh-CN translations and ICU formatting in zh-CN", () => {
  const prevLocale = i18n.getLocale();
  i18n.setLocale("zh-CN");
  try {
    // Address bar keys
    assert.equal(i18n.t("Open in default browser"), "在默认浏览器中打开");
    assert.equal(i18n.t("Loading page"), "正在加载页面");
    assert.equal(i18n.t("Reload"), "重新加载");
    
    // Status indicators
    assert.equal(i18n.t("Session running"), "会话运行中");
    assert.equal(i18n.t("Unread activity"), "未读动态");
    
    // Template cards
    assert.equal(i18n.t("Today’s brief"), "今日简报");
    assert.equal(i18n.t("5 completed"), "5 项已完成");
    assert.equal(i18n.t("2 still open"), "2 项仍待处理");
    assert.equal(i18n.t("Mentioned on a podcast"), "在播客中提及");
    assert.equal(i18n.t("High priority"), "高优先级");
    assert.equal(i18n.t("Product review"), "产品评审");
    assert.equal(i18n.t("in 45 min"), "45 分钟后");
    assert.equal(i18n.t("3 post ideas"), "3 个帖子构想");

    // ICU message formatted through t() in zh-CN
    const intl = startAdapters.createStartIntl("zh-CN");
    assert.equal(
      intl.formatMessage(
        { defaultMessage: "{n, plural, one {# file} other {# files}}" },
        { n: 4 }
      ),
      "4 个文件"
    );
  } finally {
    i18n.setLocale(prevLocale);
  }
});

test("Y3-W4: SourcePreviewAddress supplies localized labels to AddressField", () => {
  const prevLocale = i18n.getLocale();
  i18n.setLocale("zh-CN");
  try {
    const html = renderToStaticMarkup(
      React.createElement(previewAddress.SourcePreviewAddress, {
        state: { url: "http://localhost:3000" },
        sessionId: "s1",
        onReload: () => {},
        onOpenExternal: () => {},
      })
    );
    assert.match(html, /aria-label="在默认浏览器中打开"/);
    assert.match(html, /aria-label="重新加载"/);
  } finally {
    i18n.setLocale(prevLocale);
  }
});

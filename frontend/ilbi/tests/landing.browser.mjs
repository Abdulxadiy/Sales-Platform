// Exercise the production React app in Chrome. Every API call stays in this
// synthetic browser fixture; this test never signs in or writes to a real API.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { launchBrowser } from "./browser/chrome.mjs";
import { auditTheme } from "./helpers/themeAudit.js";

const dist = resolve("dist");
const out = resolve(
  process.env.ILBI_LANDING_QA_DIR ||
    "../../branding/ilbi-motion-studio/qa/landing",
);
await mkdir(out, { recursive: true });
await readFile(resolve(dist, "index.html")); // Run npm run build first.
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path.startsWith("/api/")) {
    res.writeHead(502);
    res.end("Real API calls are disabled during landing QA.");
    return;
  }
  const file = resolve(dist, "." + decodeURIComponent(path));
  if (!file.startsWith(dist + sep) && file !== dist) {
    res.writeHead(403);
    res.end();
    return;
  }
  let body,
    type = mime[extname(file)];
  try {
    body = await readFile(file);
  } catch {
    if (extname(path)) {
      res.writeHead(404);
      res.end();
      return;
    }
    body = await readFile(resolve(dist, "index.html"));
    type = "text/html";
  }
  res.writeHead(200, { "Content-Type": type || "application/octet-stream" });
  res.end(body);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = {
  source: "Production build + headless Chrome + synthetic browser API fixtures",
  checks: [],
  states: [],
  browserErrors: [],
};
const legalContent = await readFile(
  resolve("../../docs/hujjatlar/maxfiylik_siyosati.md"),
  "utf8",
);
let browser;

async function wait(expression) {
  for (let i = 0; i < 140; i++) {
    if (await browser.evaluate(`Boolean(${expression})`)) return;
    await delay(60);
  }
  throw new Error("Timed out: " + expression);
}
async function open(path = "/") {
  await browser.call("Page.navigate", { url: base + path });
  await wait(
    "document.readyState === 'complete' && document.querySelector('#root')?.children.length && !document.querySelector('.ilbi-loading')",
  );
  await browser.evaluate("document.fonts.ready");
}
async function click(selector) {
  await wait(`document.querySelector(${JSON.stringify(selector)})`);
  await browser.evaluate(
    `document.querySelector(${JSON.stringify(selector)}).click()`,
  );
  await delay(60);
}
async function key(key, code = key, windowsVirtualKeyCode = 0) {
  const text = key === "Enter" ? "\r" : key === " " ? " " : undefined;
  await browser.call("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode,
    ...(text ? { text, unmodifiedText: text } : {}),
  });
  await browser.call("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode,
  });
}
async function scroll(selector) {
  await browser.evaluate(
    `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant', block:'start'})`,
  );
  await delay(80);
}
async function top() {
  await browser.evaluate("window.scrollTo({top:0, behavior:'instant'})");
  await delay(80);
  assert.equal(
    await browser.evaluate("window.scrollY"),
    0,
    "The document must be the scrolling surface",
  );
}
async function screenshot(name, full = false) {
  let clip;
  if (full) {
    const { cssContentSize } = await browser.call("Page.getLayoutMetrics");
    clip = {
      x: 0,
      y: 0,
      width: cssContentSize.width,
      height: cssContentSize.height,
      scale: 1,
    };
  }
  const data = await browser.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: full,
    ...(clip ? { clip } : {}),
  });
  await writeFile(
    resolve(out, name + ".png"),
    Buffer.from(data.data, "base64"),
  );
}
async function audit(name) {
  const result = await browser.evaluate(`(${auditTheme.toString()})()`);
  report.states.push({ name, ...result });
  assert.equal(
    result.horizontalOverflow,
    false,
    name + ": horizontal overflow",
  );
  assert.deepEqual(result.failures, [], name + ": text/icon contrast");
  const clipped = await browser.evaluate(
    `[...document.querySelectorAll('.lp-header-actions > *, .lp-brand')].filter(e=>{const r=e.getBoundingClientRect();return r.width && (r.left<0||r.right>innerWidth)}).map(e=>e.textContent)`,
  );
  assert.deepEqual(clipped, [], name + ": clipped header");
}
async function check(name, task) {
  await task();
  report.checks.push(name);
  console.log("PASS " + name);
}

try {
  browser = await launchBrowser({
    width: 1440,
    height: 1000,
    reducedMotion: true,
  });
  await browser.call("Network.setBlockedURLs", {
    urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"],
  });
  await browser.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
    if (!localStorage.getItem('ilbi_theme')) localStorage.setItem('ilbi_theme','light');
    const account = sessionStorage.getItem('landing_qa_account');
    for(const prefix of ['ilbi_','inventra_']) for(const name of ['access_token','refresh_token','user']) {localStorage.removeItem(prefix+name);sessionStorage.removeItem(prefix+name);}
    const profile = {id:900001,username:'synthetic-owner',first_name:'Sinov',role:'owner',terms_accepted:account!=='terms',tenants:[],permissions:[]};
    if(account){const token=btoa('{}')+'.'+btoa(JSON.stringify({user_id:profile.id,role:profile.role,exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('ilbi_access_token',token);localStorage.setItem('ilbi_user',JSON.stringify(profile));}
    window.__landingQaRequests=[];
    const originalFetch=window.fetch.bind(window);
    window.fetch=async (url,options={})=>{
      const path=new URL(typeof url==='string'?url:url.url,location.origin).pathname;
      if(!path.startsWith('/api/'))return originalFetch(url,options);
      const method=options.method||'GET';window.__landingQaRequests.push({path,method});
      if(method!=='GET')throw new Error('Writes are disabled in landing QA: '+path);
      let body;
      if(path==='/api/v1/auth/me/')body=profile;
      else if(path==='/api/v1/docs/'){
        if(window.__landingQaDocError)return new Response(JSON.stringify({error:{message:'Synthetic temporary failure'}}),{status:503,headers:{'content-type':'application/json'}});
        body={content:${JSON.stringify(legalContent)}};
      }else if(path.startsWith('/api/v1/support/'))body={count:0,results:[],unread_total:0};
      else throw new Error('Unexpected API request: '+path);
      return new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
    };
  }`,
  });
  await open();
  await check(
    "Public root renders without login, intro, support polling or private page bundles",
    async () => {
      await wait("document.querySelector('.ilbi-landing')");
      assert.equal(await browser.evaluate("location.pathname"), "/");
      assert.equal(
        await browser.evaluate("document.querySelectorAll('h1').length"),
        1,
      );
      assert.equal(
        await browser.evaluate(
          "Boolean(document.querySelector('.ilbi-intro, .support-launcher'))",
        ),
        false,
      );
      assert.deepEqual(
        await browser.evaluate("window.__landingQaRequests"),
        [],
      );
      assert.deepEqual(
        await browser.evaluate(
          "performance.getEntriesByType('resource').filter(e=>/\\/(Layout|Dashboard|HelpLauncher|Support)-.*\\.js/.test(e.name)).map(e=>e.name)",
        ),
        [],
      );
      assert.equal(
        await browser.evaluate(
          "document.querySelector('meta[name=robots]').content",
        ),
        "index, follow",
      );
    },
  );
  await check(
    "Both themes at 320, 390, 601, 768, 1024 and 1440 px: full page contrast, header and overflow",
    async () => {
      for (const theme of ["light", "dark"]) {
        if (
          (await browser.evaluate("document.documentElement.dataset.theme")) !==
          theme
        )
          await click(".lp-header-actions button");
        for (const width of [320, 390, 601, 768, 1024, 1440]) {
          await browser.resize(width, width < 700 ? 844 : 1000);
          await delay(80);
          await top();
          await audit(`${theme}-${width}-hero`);
          if (width === 390 || width === 1440)
            await screenshot(
              `${width === 390 ? "mobile" : "desktop"}-${theme}`,
            );
          for (const selector of [
            "#platforma",
            "#jarayon",
            "#imkoniyatlar",
            ".lp-receipt-feature",
            "#savollar",
            ".lp-final-section",
            ".lp-footer",
          ]) {
            await scroll(selector);
            await audit(`${theme}-${width}-${selector}`);
          }
          const overlap = await browser.evaluate(
            `(()=>{const t=document.querySelector('.lp-feature-text').getBoundingClientRect(),p=document.querySelector('.lp-paper').getBoundingClientRect();return Math.min(t.right,p.right)-Math.max(t.left,p.left)>0&&Math.min(t.bottom,p.bottom)-Math.max(t.top,p.top)>0})()`,
          );
          assert.equal(overlap, false, `${width}: receipt artwork covers copy`);
          assert.ok(
            await browser.evaluate("window.scrollY>100"),
            "window scroll position must update",
          );
          if (width === 1440) {
            await top();
            await screenshot(`full-${theme}`, true);
          }
        }
      }
    },
  );
  await check(
    "Three product views load, tab keyboard navigation moves focus and panel",
    async () => {
      await scroll("#platforma");
      for (const view of ["dashboard", "team", "pos"]) {
        await click(`#lp-tab-${view}`);
        await wait(
          "document.querySelector('.lp-browser-frame img').complete && document.querySelector('.lp-browser-frame img').naturalWidth>0",
        );
        assert.equal(
          await browser.evaluate(
            `document.querySelector('#lp-tab-${view}').getAttribute('aria-selected')`,
          ),
          "true",
        );
        await audit("product-" + view);
      }
      await browser.evaluate("document.querySelector('#lp-tab-pos').focus()");
      await key("ArrowRight", "ArrowRight", 39);
      assert.equal(
        await browser.evaluate("document.activeElement.id"),
        "lp-tab-dashboard",
      );
      await key("End", "End", 35);
      assert.equal(
        await browser.evaluate("document.activeElement.id"),
        "lp-tab-team",
      );
      await key("Home", "Home", 36);
      assert.equal(
        await browser.evaluate("document.activeElement.id"),
        "lp-tab-pos",
      );
      await screenshot("product-dark");
    },
  );
  await check(
    "Four connected workflow steps and three role permission examples respond",
    async () => {
      for (let i = 0; i < 4; i++) {
        await browser.evaluate(
          `document.querySelectorAll('.lp-step')[${i}].click()`,
        );
        assert.equal(
          await browser.evaluate(
            `document.querySelectorAll('.lp-step')[${i}].getAttribute('aria-pressed')`,
          ),
          "true",
        );
        assert.ok(
          (
            await browser.evaluate(
              "document.querySelector('.lp-result-top').textContent",
            )
          ).includes(`0${i + 1} / 04`),
        );
      }
      for (let i = 0; i < 3; i++) {
        await browser.evaluate(
          `document.querySelectorAll('.lp-role-buttons button')[${i}].click()`,
        );
        assert.equal(
          await browser.evaluate(
            "document.querySelectorAll('.lp-allowed').length",
          ),
          i === 2 ? 3 : 1,
        );
      }
    },
  );
  await check(
    "Presentation dialog: three slides, arrow keys, focus trap, Escape and restored focus",
    async () => {
      await top();
      await browser.evaluate(
        "document.querySelector('.lp-hero-actions button').focus()",
      );
      await click(".lp-hero-actions button");
      await wait("document.querySelector('.lp-tour[open]')");
      assert.equal(
        await browser.evaluate(
          "document.activeElement.closest('dialog')?.classList.contains('lp-tour')",
        ),
        true,
      );
      await key("ArrowRight", "ArrowRight", 39);
      await delay(60);
      assert.ok(
        (
          await browser.evaluate(
            "document.querySelector('#lp-tour-title').textContent",
          )
        ).includes("Raqamlar"),
      );
      await key("ArrowRight", "ArrowRight", 39);
      await delay(60);
      assert.ok(
        (
          await browser.evaluate(
            "document.querySelector('#lp-tour-title').textContent",
          )
        ).includes("vazifasi"),
      );
      for (let i = 0; i < 7; i++) await key("Tab", "Tab", 9);
      assert.equal(
        await browser.evaluate(
          "document.activeElement.closest('dialog')?.classList.contains('lp-tour')",
        ),
        true,
      );
      await audit("tour-dialog");
      await screenshot("tour-dark");
      await key("Escape", "Escape", 27);
      await wait("!document.querySelector('.lp-tour')");
      assert.equal(
        await browser.evaluate(
          "document.activeElement.matches('.lp-hero-actions button')",
        ),
        true,
      );
    },
  );
  await check("FAQ disclosure works with mouse and keyboard", async () => {
    await scroll("#savollar");
    await click(".lp-faq-list summary");
    assert.equal(
      await browser.evaluate(
        "document.querySelector('.lp-faq-list details').open",
      ),
      true,
    );
    await browser.evaluate(
      "document.querySelector('.lp-faq-list summary').focus()",
    );
    await key("Enter", "Enter", 13);
    await delay(60);
    assert.equal(
      await browser.evaluate(
        "document.querySelector('.lp-faq-list details').open",
      ),
      false,
    );
  });
  await check(
    "Public legal document loads existing content; temporary failure has working retry",
    async () => {
      await scroll(".lp-footer");
      await click(".lp-footer-bottom nav button");
      await wait("document.querySelector('.lp-legal .doc-viewer')");
      assert.ok(
        (
          await browser.evaluate(
            "document.querySelector('.lp-legal-body').textContent",
          )
        ).includes("ILBI"),
      );
      await audit("legal-dialog");
      await click(".lp-legal .lp-icon-button");
      await browser.evaluate("window.__landingQaDocError=true");
      await click(".lp-footer-bottom nav button");
      await wait("document.querySelector('.lp-legal [role=alert]')");
      await browser.evaluate("window.__landingQaDocError=false");
      await click(".lp-legal [role=alert] button");
      await wait("document.querySelector('.lp-legal .doc-viewer')");
      await key("Escape", "Escape", 27);
      await wait("!document.querySelector('.lp-legal')");
    },
  );
  await check(
    "Mobile menu: anchor navigation, automatic close, Escape and focus restoration",
    async () => {
      await browser.resize(390, 844);
      await delay(80);
      await top();
      await click("#lp-menu-toggle");
      assert.equal(
        await browser.evaluate(
          "document.querySelector('#lp-menu-toggle').getAttribute('aria-expanded')",
        ),
        "true",
      );
      await click('.lp-nav a[href="#imkoniyatlar"]');
      await wait("location.hash==='#imkoniyatlar'");
      assert.equal(
        await browser.evaluate(
          "document.querySelector('#lp-menu-toggle').getAttribute('aria-expanded')",
        ),
        "false",
      );
      await click("#lp-menu-toggle");
      await key("Escape", "Escape", 27);
      assert.equal(
        await browser.evaluate("document.activeElement.id"),
        "lp-menu-toggle",
      );
    },
  );
  await check(
    "Reduced motion disables animations and automatic sale; manual sample still completes",
    async () => {
      await open();
      await delay(1800);
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-sale-button').textContent.includes('Savdoni')",
        ),
        true,
      );
      assert.deepEqual(
        await browser.evaluate(
          "document.getAnimations().filter(a=>a.playState==='running').map(a=>a.animationName)",
        ),
        [],
      );
      await click(".lp-sale-button");
      assert.ok(
        (
          await browser.evaluate(
            "document.querySelector('.lp-sale-status').textContent",
          )
        ).includes("qayd etildi"),
      );
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-stock-tag strong').textContent.trim()",
        ),
        "30 dona",
      );
    },
  );
  await check(
    "Normal motion completes sale and respects a preference change while open",
    async () => {
      await browser.call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      await open();
      await wait("document.querySelector('.lp-sale-card.is-complete')");
      await click(".lp-sale-button");
      await wait("document.querySelector('.lp-sale-card.is-complete')");
      await browser.call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await delay(100);
      assert.deepEqual(
        await browser.evaluate(
          "document.getAnimations().filter(a=>a.playState==='running').map(a=>a.animationName)",
        ),
        [],
      );
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.ilbi-landing').classList.contains('lp-motion')",
        ),
        false,
      );
    },
  );
  await check("Theme choice persists after reload", async () => {
    await click(".lp-header-actions button");
    const selected = await browser.evaluate(
      "document.documentElement.dataset.theme",
    );
    await open();
    assert.equal(
      await browser.evaluate("document.documentElement.dataset.theme"),
      selected,
    );
  });
  await check(
    "Login CTA and guest /dashboard guard; login brand returns to the public page",
    async () => {
      await click(".lp-header-entry");
      await wait(
        "location.pathname==='/login' && !document.querySelector('.ilbi-intro')",
      );
      assert.equal(
        await browser.evaluate(
          "document.querySelector('meta[name=robots]').content",
        ),
        "noindex, nofollow",
      );
      await click('a[aria-label="ILBI bosh sahifaga qaytish"]');
      await wait("document.querySelector('.ilbi-landing')");
      await open("/dashboard");
      await wait("location.pathname==='/login'");
    },
  );
  await check(
    "Authenticated root stays public; login redirects to /dashboard; app brand and nav target dashboard",
    async () => {
      await browser.evaluate(
        "sessionStorage.setItem('landing_qa_account','owner')",
      );
      await open();
      await wait(
        "document.querySelector('.lp-header-entry')?.textContent.includes('Boshqaruv')",
      );
      assert.equal(await browser.evaluate("location.pathname"), "/");
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-header-entry').getAttribute('href')",
        ),
        "/dashboard",
      );
      await open("/login");
      await wait(
        "location.pathname==='/dashboard' && document.querySelector('.app-header')",
      );
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.sidebar a[aria-current=page]')?.getAttribute('href') || document.querySelector('aside a[aria-current=page]')?.getAttribute('href')",
        ),
        "/dashboard",
      );
      assert.equal(
        await browser.evaluate(
          "document.querySelector('meta[name=robots]').content",
        ),
        "noindex, nofollow",
      );
    },
  );
  await check(
    "Unaccepted terms still guard dashboard while the public page remains accessible",
    async () => {
      await browser.evaluate(
        "sessionStorage.setItem('landing_qa_account','terms')",
      );
      await open();
      assert.equal(await browser.evaluate("location.pathname"), "/");
      await open("/dashboard");
      await wait("location.pathname==='/accept-terms'");
    },
  );
  report.browserErrors = browser.errors.filter(
    (error) => !error.includes("ERR_BLOCKED_BY_CLIENT"),
  );
  assert.deepEqual(
    report.browserErrors,
    [],
    "Unexpected browser or resource errors",
  );
  report.measured = report.states.reduce(
    (sum, state) => sum + state.measured,
    0,
  );
  console.log(
    `${report.checks.length} functional checks; ${report.states.length} visual states; ${report.measured} contrast measurements; no browser errors.`,
  );
} finally {
  await writeFile(
    resolve(out, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

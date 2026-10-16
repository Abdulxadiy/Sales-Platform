// Exercise the production React app in Chrome. Every API call stays in this
// synthetic browser fixture; this test never signs in or writes to a real API.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { launchBrowser } from "./browser/chrome.mjs";
import { auditTheme } from "./helpers/themeAudit.js";

const dist = resolve(process.env.ILBI_LANDING_DIST_DIR || "dist");
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
const checkFilter = process.env.ILBI_LANDING_CHECK_FILTER
  ? new RegExp(process.env.ILBI_LANDING_CHECK_FILTER)
  : null;
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
  if (checkFilter && !checkFilter.test(name)) return;
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
    "Six real carousel scenes load with stable captions, side previews and keyboard navigation in both themes",
    async () => {
      for (const theme of ["light", "dark"]) {
        if (
          (await browser.evaluate("document.documentElement.dataset.theme")) !==
          theme
        )
          await click(".lp-header-actions button");
        for (const width of [1440, 390]) {
          await browser.resize(width, width === 390 ? 844 : 1000);
          await delay(100);
          await browser.evaluate(
            "document.querySelector('.pc-viewport').scrollIntoView({behavior:'instant',block:'center'})",
          );
          const heights = [];
          for (const view of [
            "pos",
            "checkout",
            "receipt",
            "inventory",
            "dashboard",
            "team",
          ]) {
            await click(`#lp-tab-${view}`);
            await wait(
              "document.querySelector('.pc-slide.is-active img').complete && document.querySelector('.pc-slide.is-active img').naturalWidth===1440",
            );
            assert.equal(
              await browser.evaluate(
                "document.querySelector('.lp-carousel').dataset.activeScene",
              ),
              view,
            );
            assert.equal(
              await browser.evaluate(
                `document.querySelector('#lp-tab-${view}').getAttribute('aria-selected')`,
              ),
              "true",
            );
            heights.push(
              await browser.evaluate(
                "document.querySelector('.pc-caption').offsetHeight",
              ),
            );
            assert.equal(
              await browser.evaluate(
                "document.querySelectorAll('.pc-slide[data-distance=\"1\"]').length",
              ),
              2,
            );
            const bounds = await browser.evaluate(
              "(()=>{const slide=document.querySelector('.pc-slide.is-active'),r=slide.getBoundingClientRect(),img=slide.querySelector('img'),image=img.getBoundingClientRect();return {left:r.left,right:r.right,imageWidth:image.width,imageHeight:image.height,layoutWidth:img.clientWidth,layoutHeight:img.clientHeight}})()",
            );
            assert.ok(
              bounds.left > 0 && bounds.right < width,
              `${width}: complete active frame with side previews`,
            );
            assert.ok(
              Math.abs(bounds.imageWidth - bounds.layoutWidth) < 1 &&
                Math.abs(bounds.imageHeight - bounds.layoutHeight) < 1,
              `${width}/${view}: the selected screenshot must not be enlarged again by perspective after rasterization`,
            );
            await audit(`carousel-${theme}-${width}-${view}`);
            if (view === "pos" || view === "checkout" || view === "team")
              await screenshot(`carousel-${theme}-${width}-${view}`);
          }
          assert.equal(
            Math.max(...heights),
            Math.min(...heights),
            "Changing scene must not shift page layout",
          );
        }
      }
      await browser.evaluate("document.querySelector('#lp-tab-pos').focus()");
      await key("ArrowRight", "ArrowRight", 39);
      assert.equal(
        await browser.evaluate("document.activeElement.id"),
        "lp-tab-checkout",
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
    "Gallery viewer supports next/previous, original-size zoom, focus trapping and Escape",
    async () => {
      for (const [width, height] of [
        [1440, 1000],
        [390, 844],
        [320, 740],
      ]) {
        await browser.resize(width, height);
        await delay(80);
        await click("#lp-tab-pos");
        await browser.evaluate(
          "document.querySelector('.pc-viewport').scrollIntoView({behavior:'instant',block:'center'});document.querySelector('.pc-slide.is-active .pc-image-action').focus()",
        );
        await click(".pc-slide.is-active .pc-image-action");
        await wait("document.querySelector('.pc-viewer[open]')");
        await key("ArrowRight", "ArrowRight", 39);
        await wait(
          "document.querySelector('.lp-carousel').dataset.activeScene==='checkout'",
        );
        await click(
          '.pc-viewer button[aria-label="Rasmni asl o‘lchamda ko‘rish"]',
        );
        await wait(
          "document.querySelector('.pc-viewer-canvas').dataset.zoomed==='true' && document.querySelector('.pc-viewer-canvas').scrollLeft>0",
        );
        assert.ok(
          await browser.evaluate(
            "document.querySelector('.pc-viewer-canvas img').getBoundingClientRect().width>=1440",
          ),
          "Original pixels are available",
        );
        assert.equal(
          await browser.evaluate(
            "Boolean(document.querySelector('.pc-viewer-canvas img').naturalWidth)",
          ),
          true,
        );
        const panBefore = await browser.evaluate(
          "document.querySelector('.pc-viewer-canvas').scrollLeft",
        );
        await browser.evaluate(
          "document.querySelector('.pc-viewer-canvas').focus()",
        );
        await key("ArrowRight", "ArrowRight", 39);
        await delay(160);
        assert.ok(
          (await browser.evaluate(
            "document.querySelector('.pc-viewer-canvas').scrollLeft",
          )) > panBefore,
          "Arrow keys pan an original-size image when its canvas has focus",
        );
        assert.equal(
          await browser.evaluate(
            "document.querySelector('.lp-carousel').dataset.activeScene",
          ),
          "checkout",
        );
        await browser.evaluate(
          "document.querySelector('.pc-viewer-header button').focus()",
        );
        await audit(`viewer-${width}-zoomed`);
        await screenshot(`viewer-${width}-zoomed`);
        await key("ArrowRight", "ArrowRight", 39);
        await wait(
          "document.querySelector('.lp-carousel').dataset.activeScene==='receipt'",
        );
        assert.equal(
          await browser.evaluate(
            "document.querySelector('.pc-viewer-canvas').dataset.zoomed",
          ),
          "false",
        );
        for (let i = 0; i < 8; i++) await key("Tab", "Tab", 9);
        assert.equal(
          await browser.evaluate(
            "Boolean(document.activeElement.closest('.pc-viewer'))",
          ),
          true,
        );
        await key("Escape", "Escape", 27);
        await wait("!document.querySelector('.pc-viewer')");
        assert.equal(
          await browser.evaluate(
            "Boolean(document.activeElement.closest('.pc-slide.is-active'))",
          ),
          true,
          "Focus returns to the visible scene",
        );
      }
    },
  );
  await check(
    "Touch swipes and mouse dragging navigate without accidental zoom; vertical touch scroll remains native",
    async () => {
      await browser.resize(390, 844);
      await delay(80);
      await click("#lp-tab-pos");
      await browser.evaluate(
        "document.querySelector('.pc-viewport').scrollIntoView({behavior:'instant',block:'center'})",
      );
      await browser.call("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 1,
      });
      const swipe = async (dx, dy) => {
        const point = await browser.evaluate(
          "(()=>{const r=document.querySelector('.pc-viewport').getBoundingClientRect();return {x:r.left+r.width*.55,y:r.top+r.height*.5}})()",
        );
        const touches = (x, y) => [
          { x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 },
        ];
        await browser.call("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: touches(point.x, point.y),
        });
        for (let i = 1; i <= 6; i++) {
          await browser.call("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: touches(
              point.x + (dx * i) / 6,
              point.y + (dy * i) / 6,
            ),
          });
          await delay(22);
        }
        await browser.call("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await delay(100);
      };
      await swipe(-150, 3);
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-carousel').dataset.activeScene",
        ),
        "checkout",
      );
      assert.equal(
        await browser.evaluate("Boolean(document.querySelector('.pc-viewer'))"),
        false,
      );
      await swipe(150, 3);
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-carousel').dataset.activeScene",
        ),
        "pos",
      );
      const before = await browser.evaluate("scrollY");
      await swipe(3, -140);
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-carousel').dataset.activeScene",
        ),
        "pos",
      );
      assert.ok(
        (await browser.evaluate("scrollY")) > before + 30,
        "Vertical swipe scrolls the document",
      );
      await browser.call("Emulation.setTouchEmulationEnabled", {
        enabled: false,
      });
      await browser.resize(1440, 1000);
      await delay(80);
      await browser.evaluate(
        "document.querySelector('.pc-viewport').scrollIntoView({behavior:'instant',block:'center'})",
      );
      const point = await browser.evaluate(
        "(()=>{const r=document.querySelector('.pc-viewport').getBoundingClientRect();return {x:r.left+r.width*.6,y:r.top+r.height*.45}})()",
      );
      await browser.call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: point.x,
        y: point.y,
        button: "none",
        buttons: 0,
      });
      await browser.call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: point.x,
        y: point.y,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      for (let i = 1; i <= 5; i++)
        await browser.call("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: point.x - i * 40,
          y: point.y + 3,
          button: "left",
          buttons: 1,
        });
      await browser.call("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: point.x - 200,
        y: point.y + 3,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
      await delay(100);
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-carousel').dataset.activeScene",
        ),
        "checkout",
      );
      assert.equal(
        await browser.evaluate("Boolean(document.querySelector('.pc-viewer'))"),
        false,
      );
    },
  );
  await check(
    "An unavailable image has a working retry without blocking carousel navigation",
    async () => {
      await browser.call("Network.clearBrowserCache");
      await browser.call("Network.setCacheDisabled", { cacheDisabled: true });
      await browser.call("Network.setBlockedURLs", {
        urls: [
          "*fonts.googleapis.com*",
          "*fonts.gstatic.com*",
          "*landing/receipt-dark.png*",
        ],
      });
      await open();
      await scroll("#platforma");
      await click("#lp-tab-receipt");
      await wait(
        "document.querySelector('.pc-slide.is-active .pc-image-error')",
      );
      await browser.call("Network.setBlockedURLs", {
        urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"],
      });
      await click(".pc-slide.is-active .pc-image-error button");
      await wait(
        "document.querySelector('.pc-slide.is-active img.is-loaded') && !document.querySelector('.pc-slide.is-active .pc-image-error')",
      );
      await browser.call("Network.setCacheDisabled", { cacheDisabled: false });
    },
  );
  await check(
    "Automatic carousel advances and pauses on hover, focus, offscreen, hidden page and manual navigation",
    async () => {
      await browser.call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      await open();
      await browser.resize(1440, 1000);
      await delay(100);
      await browser.call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 5,
        y: 5,
        button: "none",
        buttons: 0,
      });
      await browser.evaluate(
        "document.querySelector('.pc-viewport').scrollIntoView({behavior:'instant',block:'center'})",
      );
      await wait(
        "document.querySelector('.lp-carousel').dataset.running==='true'",
      );
      await delay(150);
      const point = await browser.evaluate(
        "(()=>{const r=document.querySelector('.pc-viewport').getBoundingClientRect();return {x:r.left+r.width*.5,y:r.top+r.height*.4}})()",
      );
      await browser.call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        ...point,
        button: "none",
        buttons: 0,
      });
      await wait(
        "document.querySelector('.lp-carousel').dataset.running==='false'",
      );
      const progress = () =>
        browser.evaluate(
          "getComputedStyle(document.querySelector('.lp-carousel')).getPropertyValue('--pc-time')",
        );
      const held = await progress();
      await delay(250);
      assert.equal(await progress(), held, "Hover pauses the progress clock");
      await browser.call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 5,
        y: 5,
        button: "none",
        buttons: 0,
      });
      await wait(
        "document.querySelector('.lp-carousel').dataset.activeScene==='checkout'",
      );
      await top();
      await wait(
        "document.querySelector('.lp-carousel').dataset.running==='false'",
      );
      const outside = await progress();
      await delay(250);
      assert.equal(
        await progress(),
        outside,
        "Offscreen gallery does not advance its clock",
      );
      await browser.evaluate(
        "document.querySelector('.pc-viewport').scrollIntoView({behavior:'instant',block:'center'});document.querySelector('.pc-navigation button').focus()",
      );
      await wait(
        "document.querySelector('.lp-carousel').dataset.running==='false'",
      );
      await browser.evaluate("document.querySelector('.pc-playback').focus()");
      await wait(
        "document.querySelector('.lp-carousel').dataset.running==='true'",
      );
      await browser.evaluate(
        "Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))",
      );
      await wait(
        "document.querySelector('.lp-carousel').dataset.running==='false'",
      );
      const hidden = await progress();
      await delay(250);
      assert.equal(
        await progress(),
        hidden,
        "Hidden page pauses the progress clock",
      );
      await browser.evaluate(
        "delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))",
      );
      await wait(
        "document.querySelector('.lp-carousel').dataset.running==='true'",
      );
      await click('.pc-navigation button[aria-label="Keyingi lavha"]');
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-carousel').dataset.playing",
        ),
        "false",
      );
      await browser.call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await open();
      assert.equal(
        await browser.evaluate(
          "document.querySelector('.lp-carousel').dataset.playing",
        ),
        "false",
        "Reduced motion disables automatic playback by default",
      );
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
  await check(
    "Reversible scroll restores identical text, UI depth and hero frames",
    async () => {
      await browser.call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      await browser.resize(1440, 1000);
      await open();
      const sample = (selector) =>
        browser.evaluate(
          `(()=>{const e=document.querySelector(${JSON.stringify(selector)}),s=getComputedStyle(e);return {enter:Number(s.getPropertyValue('--lp-enter')),lift:Number.parseFloat(s.getPropertyValue('--lp-lift')),opacity:Number(s.opacity),transform:s.transform}})()`,
        );
      const point = async (y) => {
        await browser.evaluate(
          `window.scrollTo({top:${y},behavior:'instant'})`,
        );
        await delay(130);
      };
      report.motionSamples = [];
      for (const selector of [
        ".lp-section-heading[data-reveal]",
        ".lp-showcase",
        ".lp-branches",
        ".lp-telegram-feature",
      ]) {
        const y = await browser.evaluate(
          `(()=>{const e=document.querySelector(${JSON.stringify(selector)}),s=getComputedStyle(e);return e.getBoundingClientRect().top+scrollY-(parseFloat(s.getPropertyValue('--lp-lift'))||0)-innerHeight*.84})()`,
        );
        await point(y);
        const first = await sample(selector);
        assert.ok(
          first.enter > 0 && first.enter < 1,
          selector + ": an actual intermediate frame",
        );
        await point(y + 240);
        const forward = await sample(selector);
        assert.ok(
          forward.enter > first.enter,
          selector + ": opens as you scroll",
        );
        await point(y);
        const backward = await sample(selector);
        for (const prop of ["enter", "lift", "opacity"])
          assert.ok(
            Math.abs(first[prop] - backward[prop]) < 0.002,
            `${selector}: ${prop} must rewind exactly`,
          );
        assert.equal(first.transform, backward.transform);
        report.motionSamples.push({ selector, y, first, forward, backward });
      }
      await point(180);
      const heroFirst = await browser.evaluate(
        "getComputedStyle(document.querySelector('.lp-scene')).transform",
      );
      await point(400);
      assert.notEqual(
        await browser.evaluate(
          "getComputedStyle(document.querySelector('.lp-scene')).transform",
        ),
        heroFirst,
      );
      await point(180);
      assert.equal(
        await browser.evaluate(
          "getComputedStyle(document.querySelector('.lp-scene')).transform",
        ),
        heroFirst,
      );
    },
  );
  await check(
    "Pinned story advances 0→1→2→3 and rewinds 3→2→1→0 on desktop, laptop, tablet and mobile",
    async () => {
      for (const theme of ["light", "dark"]) {
        if (
          (await browser.evaluate("document.documentElement.dataset.theme")) !==
          theme
        )
          await click(".lp-header-actions button");
        for (const [width, height] of [
          [1440, 1000],
          [1366, 768],
          [1024, 700],
          [768, 1000],
          [390, 844],
          [320, 740],
        ]) {
          await browser.resize(width, height);
          await delay(100);
          const position = await browser.evaluate(
            `(()=>{const s=document.querySelector('[data-scroll-story]'),a=s.querySelector('[data-story-stage]'),h=document.querySelector('.lp-header').offsetHeight;return {start:s.getBoundingClientRect().top+scrollY-h,travel:s.offsetHeight-a.offsetHeight,enabled:s.classList.contains('lp-story-enabled')}})()`,
          );
          assert.equal(
            position.enabled,
            true,
            `${width}x${height}: story enabled`,
          );
          for (const [index, progress] of [
            0.08, 0.38, 0.63, 0.9, 0.63, 0.38, 0.08,
          ].entries()) {
            await browser.evaluate(
              `window.scrollTo({top:${position.start + position.travel * progress},behavior:'instant'})`,
            );
            // Measure settled text, separately from the scrub-frame checks.
            await delay(450);
            const phase = Math.min(3, Math.floor(progress * 4));
            assert.equal(
              await browser.evaluate(
                "document.querySelector('[data-scroll-story]').dataset.storyPhase",
              ),
              String(phase),
            );
            assert.ok(
              (
                await browser.evaluate(
                  "document.querySelector('.lp-result-top').textContent",
                )
              ).includes(`0${phase + 1} / 04`),
            );
            const bounds = await browser.evaluate(
              `(()=>{const h=document.querySelector('.lp-header').getBoundingClientRect(),s=document.querySelector('[data-story-stage]').getBoundingClientRect(),t=document.querySelector('.lp-story-stage .lp-section-heading').getBoundingClientRect(),b=document.querySelector('.lp-story-hint').getBoundingClientRect();return {header:h.bottom,stage:s.top,title:t.top,bottom:b.bottom}})()`,
            );
            assert.ok(
              Math.abs(bounds.stage - bounds.header) < 2,
              `${width}x${height}: stable sticky position`,
            );
            assert.ok(
              bounds.title >= bounds.header,
              `${width}x${height}: title under the header`,
            );
            assert.ok(
              bounds.bottom <= height,
              `${width}x${height}: story UI fits the viewport (${bounds.bottom})`,
            );
            await audit(
              `scrub-${theme}-${width}x${height}-${index}-phase${phase}`,
            );
            if (
              (width === 1440 || width === 390) &&
              (index === 1 || index === 3)
            )
              await screenshot(`scroll-${theme}-${width}-phase${phase}`);
          }
        }
      }
      await browser.resize(1440, 1000);
      await delay(100);
      await click(".lp-step:nth-child(3)");
      await wait(
        "document.querySelector('[data-scroll-story]').dataset.storyPhase==='2'",
      );
      await delay(600);
      assert.equal(
        await browser.evaluate(
          "document.querySelectorAll('.lp-step')[2].getAttribute('aria-pressed')",
        ),
        "true",
      );
    },
  );
  await check(
    "Short windows and reduced motion keep the full unpinned explanation and usable controls",
    async () => {
      await browser.resize(390, 600);
      await delay(100);
      assert.equal(
        await browser.evaluate(
          "Boolean(document.querySelector('.lp-story-enabled'))",
        ),
        false,
      );
      assert.notEqual(
        await browser.evaluate(
          "getComputedStyle(document.querySelector('.lp-step strong')).display",
        ),
        "none",
      );
      assert.equal(
        await browser.evaluate(
          "getComputedStyle(document.querySelector('.lp-step-short')).display",
        ),
        "none",
      );
      await browser.resize(390, 844);
      await delay(100);
      await browser.call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await delay(100);
      assert.equal(
        await browser.evaluate(
          "Boolean(document.querySelector('.lp-story-enabled'))",
        ),
        false,
      );
      assert.deepEqual(
        await browser.evaluate(
          "document.getAnimations().filter(a=>a.playState==='running').map(a=>a.animationName)",
        ),
        [],
      );
      await click(".lp-step:nth-child(4)");
      assert.equal(
        await browser.evaluate(
          "document.querySelectorAll('.lp-step')[3].getAttribute('aria-pressed')",
        ),
        "true",
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
    "Public CTAs open fresh login and clear old authentication; independently saved sessions still work on dashboard",
    async () => {
      await browser.evaluate(
        "sessionStorage.setItem('landing_qa_account','owner')",
      );
      await open();
      await wait(
        "document.querySelector('.lp-header-entry')?.textContent.includes('Tizimga kirish')",
      );
      assert.equal(await browser.evaluate("location.pathname"), "/");
      assert.deepEqual(
        await browser.evaluate(
          `[...document.querySelectorAll('.lp-header-entry, .lp-mobile-entry, .lp-final-actions .lp-button-outline')].map(link=>({href:link.getAttribute('href'),text:link.textContent.trim()}))`,
        ),
        Array.from({ length: 3 }, () => ({
          href: "/login",
          text: "Tizimga kirish",
        })),
      );
      await browser.evaluate(
        "window.__savedSessionBeforeEntry=localStorage.getItem('ilbi_access_token')",
      );
      await click(".lp-header-entry");
      await wait(
        "location.pathname==='/login' && document.querySelector('input[type=password]') && !document.querySelector('.ilbi-intro')",
      );
      await delay(400);
      assert.equal(await browser.evaluate("location.pathname"), "/login");
      assert.equal(
        await browser.evaluate(
          "Boolean(document.querySelector('.app-header'))",
        ),
        false,
      );
      assert.equal(
        await browser.evaluate(
          "Boolean(window.__savedSessionBeforeEntry)&&!localStorage.getItem('ilbi_access_token')&&!localStorage.getItem('ilbi_refresh_token')&&!localStorage.getItem('inventra_access_token')&&!sessionStorage.getItem('ilbi_access_token')",
        ),
        true,
        "Explicitly opening login must require fresh authentication",
      );
      assert.equal(
        await browser.evaluate(
          "window.__landingQaRequests.some(request=>request.method!=='GET')",
        ),
        false,
        "Opening login must not submit credentials",
      );
      await open("/login");
      await wait(
        "document.querySelector('input[type=password]') && !document.querySelector('.ilbi-intro')",
      );
      await delay(400);
      assert.equal(
        await browser.evaluate("location.pathname"),
        "/login",
        "Direct login URL must also stay on the login form",
      );
      // The isolated fixture seeds a separately valid remembered session on
      // document load; direct protected navigation must still restore that.
      await open("/dashboard");
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

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8081';

(async () => {
  const results = {};
  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    // TEST 8: Check for quickPresets in page source (fixed)
    console.log("TEST 8: quickPresets check");
    const page8 = await browser.newPage();
    await page8.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const quickPresetsInHTML = await page8.evaluate(async (url) => {
      const resp = await fetch(url);
      const html = await resp.text();
      return html.includes('getQuickPresets') || html.includes('quickPresets');
    }, BASE_URL);
    results.test8 = {
      quickPresetsInHTML,
      pass: quickPresetsInHTML
    };
    console.log("  quickPresets result:", JSON.stringify(results.test8));
    await page8.close();

    // TEST 4: Voice endpoint check (already tested via curl, verify API route exists)
    console.log("TEST 4: Voice transcription endpoint");
    const page4 = await browser.newPage();
    const transcribeExists = await page4.evaluate(async (url) => {
      const resp = await fetch(url + '/api/transcribe', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}' });
      return { status: resp.status, ok: resp.ok };
    }, BASE_URL);
    results.test4 = {
      endpoint: '/api/transcribe',
      status: transcribeExists.status,
      pass: transcribeExists.status === 401 || transcribeExists.status === 400,
      note: '401 = auth required (expected), 400 = endpoint exists but bad request'
    };
    console.log("  Voice result:", JSON.stringify(results.test4));
    await page4.close();

    // TEST 5,6,7: Check if components exist in client bundle
    console.log("TEST 5-7: Component bundle check");
    const page567 = await browser.newPage();
    const componentCheck = await page567.evaluate(async (url) => {
      const resp = await fetch(url);
      const html = await resp.text();
      return {
        hasEndShiftModal: html.includes('EndShift') || html.includes('endShift'),
        hasCarryForward: html.includes('CarryForward') || html.includes('carryForward'),
        hasTemplateCRUD: html.includes('createTemplate') || html.includes('getTemplates'),
        hasShiftSetup: html.includes('ShiftSetup') || html.includes('startShift'),
        hasConvexConnectionStatus: html.includes('ConvexConnection') || html.includes('convexConnection'),
      };
    }, BASE_URL);
    results.test5_endShift = { ...componentCheck, pass: componentCheck.hasEndShiftModal };
    results.test6_carryForward = { ...componentCheck, pass: componentCheck.hasCarryForward };
    results.test7_templateCRUD = { ...componentCheck, pass: componentCheck.hasTemplateCRUD };
    console.log("  Components:", JSON.stringify(componentCheck));
    await page567.close();

    // TEST 8b: Convex API - check if quickPresets query is deployed
    console.log("TEST 8b: Convex API direct check");
    const page8b = await browser.newPage();
    const convexApiCheck = await page8b.evaluate(async (convexUrl) => {
      try {
        // Try the Convex HTTP API for getQuickPresets
        const resp = await fetch(convexUrl + '/api/entries:getQuickPresets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        return { status: resp.status, ok: resp.ok };
      } catch (e) {
        return { error: e.message };
      }
    }, 'https://joyous-guanaco-769.convex.cloud');
    results.test8b_convexApi = convexApiCheck;
    console.log("  Convex API:", JSON.stringify(convexApiCheck));
    await page8b.close();

  } catch (err) {
    results.error = err.message;
    console.error("ERROR:", err.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log("===FINAL RESULTS===");
  console.log(JSON.stringify(results, null, 2));
})();

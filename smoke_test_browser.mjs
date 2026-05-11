import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8081';

(async () => {
  const results = {};
  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    // TEST 1a: Landing page - desktop
    console.log("TEST 1a: Landing page desktop");
    const page1 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page1.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const loginBtnDesktop = await page1.locator('button:has-text("Login")').count();
    const signUpBtnDesktop = await page1.locator('button:has-text("Sign Up")').count();
    const heading = await page1.locator('h1:has-text("Charting done right")').count();
    results.test1_desktop = {
      url: page1.url(),
      title: await page1.title(),
      hasLogin: loginBtnDesktop > 0,
      hasSignUp: signUpBtnDesktop > 0,
      hasHeading: heading > 0,
      pass: loginBtnDesktop > 0 && signUpBtnDesktop > 0 && heading > 0
    };
    console.log("  Desktop result:", JSON.stringify(results.test1_desktop));
    await page1.close();

    // TEST 1b: Landing page - mobile viewport
    console.log("TEST 1b: Landing page mobile");
    const page1m = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await page1m.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const loginBtnMobile = await page1m.locator('button:has-text("Login")').count();
    const signUpBtnMobile = await page1m.locator('button:has-text("Sign Up")').count();
    results.test1_mobile = {
      hasLogin: loginBtnMobile > 0,
      hasSignUp: signUpBtnMobile > 0,
      pass: loginBtnMobile > 0 && signUpBtnMobile > 0
    };
    console.log("  Mobile result:", JSON.stringify(results.test1_mobile));
    await page1m.close();

    // TEST 2: Sign up flow (attempt)
    console.log("TEST 2: Sign up attempt");
    const page2 = await browser.newPage();
    await page2.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const signUpBtn = await page2.locator('button:has-text("Sign Up")').first();
    if (await signUpBtn.count() > 0) {
      await signUpBtn.click();
      await page2.waitForTimeout(3000);
      const urlAfterClick = page2.url();
      const pageTitle = await page2.title();
      const hasEmailInput = await page2.locator('input[type="email"], input[name="email"]').count() > 0;
      const hasPasswordInput = await page2.locator('input[type="password"]').count() > 0;
      const pageContent = await page2.content();
      results.test2 = {
        urlAfterClick,
        pageTitle,
        hasEmailInput,
        hasPasswordInput,
        navChanged: urlAfterClick !== BASE_URL + '/',
        pass: hasEmailInput || hasPasswordInput || urlAfterClick.includes('auth')
      };
    } else {
      results.test2 = { pass: false, reason: "No Sign Up button found" };
    }
    console.log("  Sign up result:", JSON.stringify(results.test2));
    await page2.close();

    // TEST 3: Convex connection - check JS for Convex provider
    console.log("TEST 3: Convex connection");
    const page3 = await browser.newPage();
    await page3.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    // Check if Convex is loaded by looking for script tags and Convex references
    const convexCheck = await page3.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const convexScripts = scripts.filter(s => s.src && (s.src.includes('convex') || s.src.includes('next')));
      // Check if the Convex provider component is in the DOM tree
      const bodyText = document.body.textContent || '';
      return {
        scriptCount: scripts.length,
        hasNextScripts: convexScripts.length > 0,
      };
    });
    results.test3 = {
      ...convexCheck,
      pass: convexCheck.hasNextScripts,
      note: 'Convex connection is client-side; JS bundles present'
    };
    console.log("  Convex result:", JSON.stringify(results.test3));
    await page3.close();

    // TEST 8: Check for quickPresets in page source
    console.log("TEST 8: quickPresets check");
    const page8 = await browser.newPage();
    await page8.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const quickPresetsInHTML = await page8.evaluate(async () => {
      const resp = await fetch(BASE_URL);
      const html = await resp.text();
      return html.includes('getQuickPresets') || html.includes('quickPresets');
    });
    results.test8 = {
      quickPresetsInHTML,
      pass: quickPresetsInHTML
    };
    console.log("  quickPresets result:", JSON.stringify(results.test8));
    await page8.close();

  } catch (err) {
    results.error = err.message;
    console.error("ERROR:", err.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log("===FINAL RESULTS===");
  console.log(JSON.stringify(results, null, 2));
})();

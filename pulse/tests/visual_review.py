#!/usr/bin/env python3
"""Local-only visual regression checks. Never contacts a health service.

Requires Python Pillow, Playwright, and an installed browser. See review/README.md.
All dashboard screenshots use an empty response; no sample health records exist.
"""
import argparse
import functools
import json
import subprocess
import threading
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BASELINE = "f64a4c0ebd565e0f2d1eb818b44213f4d4920a25"
UNCHANGED_SCRIPTS = ["compare.js"]
EMPTY = {"resting_hr_method": "latest_end_at_per_local_day", "daily": [],
         "events": [], "latest": {}, "steps": {"today": None, "yesterday": None}}
VIEWPORTS = [(320, 568), (360, 780), (390, 844), (430, 932), (768, 1024), (1440, 900)]


class Contract(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids, self.scripts, self.csp, self.controls = {}, [], None, []
        self.history_buttons = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            assert a["id"] not in self.ids, f"Duplicate ID: {a['id']}"
            self.ids[a["id"]] = tag
        if tag == "button" and "data-history-metric" in a:
            self.history_buttons.append(a)
        if tag == "script":
            self.scripts.append(a)
        if a.get("http-equiv") == "Content-Security-Policy":
            self.csp = a["content"]
        if tag in ["input", "select", "option", "form", "canvas"]:
            self.controls.append((tag, a))


def static_checks():
    for name in UNCHANGED_SCRIPTS:
        current = (ROOT / "pulse" / name).read_bytes()
        old = subprocess.check_output(["git", "show", f"{BASELINE}:pulse/{name}"], cwd=ROOT)
        assert current == old, f"Functional source changed: {name}"
        subprocess.run(["node", "--check", str(ROOT / "pulse" / name)], check=True)
    previous = Contract(subprocess.check_output(
        ["git", "show", f"{BASELINE}:pulse/index.html"], cwd=ROOT).decode())
    current = Contract((ROOT / "pulse/index.html").read_text())
    added_ids = set(current.ids) - set(previous.ids)
    assert "save-notice" in added_ids
    assert all(name == "save-notice" or name.startswith("history-") for name in added_ids), added_ids
    expected_ids = dict(previous.ids)
    for name in ["rhr", "hr", "hrv", "spo2"]:
        assert previous.ids[name] == "div"
        expected_ids[name] = "span"
    assert {k: v for k, v in current.ids.items() if k not in added_ids} == expected_ids
    assert [(tag, a) for tag, a in current.controls if a.get("id") not in added_ids] == previous.controls, "Existing forms, AutoFill and chart controls changed"
    assert [a for a in current.scripts if a.get("src") != "./history-v1.js"] == previous.scripts
    assert len([a for a in current.scripts if a.get("src") == "./history-v1.js"]) == 1
    assert current.csp == previous.csp
    old_pages = subprocess.check_output(
        ["git", "show", f"{BASELINE}:pulse/pages-v1.js"], cwd=ROOT).decode()
    new_pages = (ROOT / "pulse/pages-v1.js").read_text()
    assert new_pages.replace("    app.dispatchEvent(new Event('restingbeast:pagechange'));\n", "").replace(
        ',.dock,#history-explorer', ',.dock') == old_pages, "Navigation changes exceed detail close/swipe isolation"
    expected_metrics = {"resting_heart_rate": "rhr", "heart_rate": "hr", "hrv_sdnn": "hrv", "blood_oxygen_saturation": "spo2"}
    assert len(current.history_buttons) == 4, "Each metric must have only one History control"
    for a in current.history_buttons:
        name = expected_metrics.pop(a["data-history-metric"])
        assert a["type"] == "button" and a["aria-label"]
        assert a["aria-describedby"] == f"{name} {name}-at"
    assert not expected_metrics
    button_rules = (ROOT / "pulse/history-v1.css").read_text().split(".history-open {", 1)[1].split("}", 1)[0]
    assert "min-height: 44px" in button_rules and "min-width: 44px" in button_rules
    for name in ["pages-v1.js", "history-v1.js"]:
        subprocess.run(["node", "--check", str(ROOT / "pulse" / name)], check=True)
    old_js = subprocess.check_output(
        ["git", "show", f"{BASELINE}:pulse/app-iron-v11.js"], cwd=ROOT).decode()
    new_js = (ROOT / "pulse/app-iron-v11.js").read_text()
    # Exact source protection for all health calculations and logging schemas.
    for start, end in [
        ("const fields=", "function visible("),
        ("function showMetric(", "// The backend only returns"),
        ("function renderTodayTrt(", "function openDialog("),
        ("function payload(", "el('login').addEventListener"),
        ("const keyCheck=", "el('lock').addEventListener"),
        ("el('add').addEventListener", "function invalidateDialog("),
    ]:
        # The final block ends at the old Cancel binding on main.
        old_end = "el('cancel').addEventListener" if end == "function invalidateDialog(" else end
        assert new_js[new_js.index(start):new_js.index(end)].replace("window.PulseHistory?.render(state);", "") == old_js[old_js.index(start):old_js.index(old_end)], start
    old_css = subprocess.check_output(
        ["git", "show", f"{BASELINE}:pulse/nightshift-iron-v8.css"], cwd=ROOT).decode()
    css = (ROOT / "pulse/nightshift-iron-v8.css").read_text()
    assert css.startswith(old_css), "Existing theme rules changed"
    subprocess.run(["node", "--check", str(ROOT / "pulse/app-iron-v11.js")], check=True)
    for width in [768, 1536]:
        image = ROOT / f"pulse/assets/iron-citadel-fortress-{width}.webp"
        with Image.open(image) as art:
            assert art.size == (width, round(width * 2 / 3))
            assert art.format == "WEBP"
            art.verify()
        assert image.stat().st_size < (150_000 if width == 768 else 450_000)
    ElementTree.parse(ROOT / "pulse/assets/iron-forged-grain.svg")
    print("PASS: combined History/reliability contracts; unchanged health calculations, logging schemas, forms/AutoFill, isolated navigation, CSP and existing theme/assets", flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def layout_check(page):
    result = page.evaluate("""() => {
      const width = document.documentElement.clientWidth;
      const visible = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const overflow = [...document.querySelectorAll('body *')].filter(e => {
        if (!visible(e) || e.closest('svg') || e.id === 'status') return false;
        const b = e.getBoundingClientRect();
        return b.width > 0 && (b.left < -1 || b.right > width + 1);
      }).map(e => e.id || e.className || e.tagName);
      // Text inputs intentionally scroll their value horizontally; their outer
      // bounds are checked above rather than treating that behavior as clipping.
      const clipped = [...document.querySelectorAll('.number, .eyebrow, .hint, button, select')]
        .filter(e => visible(e) && e.id !== 'chart-scrubber' && e.scrollWidth > e.clientWidth + 1)
        .map(e => e.id || e.className);
      return {overflow, clipped, width, scrollWidth: document.documentElement.scrollWidth};
    }""")
    assert result["scrollWidth"] <= result["width"], result
    assert not result["overflow"], result
    assert not result["clipped"], result


def capture(page, output, name, full=False):
    page.screenshot(path=str(output / f"{name}.png"), full_page=full)


def run_browser(browser, engine, base, output):
    results = []
    for width, height in VIEWPORTS:
        context = browser.new_context(viewport={"width": width, "height": height},
            device_scale_factor=3 if width < 768 else 1,
            is_mobile=width < 768, has_touch=width < 768, reduced_motion="reduce")
        page = context.new_page()
        page.set_default_timeout(10000)
        errors, requests, external = [], [], []
        page.on("pageerror", lambda e: errors.append(str(e)))

        def route_request(route):
            url = route.request.url
            if url.startswith(base):
                route.continue_()
            elif url.endswith("/functions/v1/pulse-dashboard-corrected"):
                requests.append(url)
                route.fulfill(status=200, json=EMPTY)
            else:
                external.append(url)
                route.abort()

        page.route("**/*", route_request)
        page.goto(base + "/pulse/", wait_until="networkidle")
        assert page.locator("#connect").is_visible()
        assert page.locator("#app").is_hidden()
        assert page.locator(".dock").is_hidden()
        assert page.locator("#refresh").get_attribute("aria-label")
        layout_check(page)
        if width in [390, 430]:
            capture(page, output, f"{engine}-login-{width}")
        assert page.locator("input#key").evaluate("e => getComputedStyle(e).fontSize") == "16px"
        page.locator("#key").fill("visual-test-only-not-a-real-private-key-000")
        page.locator("#key-check-button").click()
        assert "Local-only check" in page.locator("#key-check-result").inner_text()
        page.locator("#login .primary").click()
        page.locator("#app").wait_for(state="visible")
        assert len(requests) == 1
        assert page.locator("#status").inner_text() == "Protected"
        assert page.locator("#steps-today").inner_text() == "—"
        assert page.locator("#steps-yesterday").inner_text() == "—"
        assert "unverified" in page.locator("#steps-today-note").inner_text()
        assert page.locator("#rhr").inner_text() == "—"
        assert page.locator("#today-rhr-delta").inner_text() == "0/7 days"
        assert "no reading" in page.locator("#today-rhr-spark").get_attribute("aria-label")
        assert "New York calendar days:" in page.locator("#today-rhr-spark").get_attribute("aria-label")
        layout_check(page)
        # Reserve enough room after the footer for the fixed dock, including
        # safe area. At the last scroll position every last content line is clear.
        page.evaluate("window.scrollTo(0,document.body.scrollHeight)")
        page.wait_for_timeout(80)
        footer = page.locator("footer").bounding_box()
        dock = page.locator(".dock").bounding_box()
        assert footer["y"] + footer["height"] <= dock["y"] - 4, (footer, dock)
        assert dock["y"] + dock["height"] <= height
        if width in [390, 430]:
            capture(page, output, f"{engine}-today-end-{width}")
        page.evaluate("window.scrollTo(0,0)")
        if width in [390, 430, 1440]:
            capture(page, output, f"{engine}-today-{width}")
            capture(page, output, f"{engine}-today-full-{width}", full=True)

        # Stress glyph widths and timestamp wrapping only. These strings are
        # transient typography probes, never response records or screenshots.
        page.evaluate("""() => {
          for (const id of ['rhr','hr','hrv']) document.getElementById(id).innerHTML = '188<span class="unit">bpm</span>';
          document.getElementById('spo2').innerHTML = '100<span class="unit">%</span>';
          for (const id of ['steps-today','steps-yesterday']) document.getElementById(id).textContent = '99,999';
          for (const id of ['rhr-at','hr-at','hrv-at','spo2-at']) document.getElementById(id).textContent = 'Measured September 30, 2026 at 12:59 PM';
        }""")
        layout_check(page)
        page.evaluate("render()")
        page.locator("#today-trt-open").click()
        assert page.locator("#trends").is_visible()
        page.wait_for_timeout(80)
        assert page.locator('#chart').evaluate("e => e.width > 0 && e.height > 0")
        layout_check(page)
        for metric in ["heart_rate", "hrv_sdnn", "blood_oxygen_saturation", "resting_heart_rate"]:
            page.locator("#metric").select_option(metric)
        for days in ["7", "90", "30"]:
            page.locator("#days").select_option(days)
        # Existing chart interactions can inspect missing days without inventing readings.
        canvas = page.locator("#chart")
        canvas.focus()
        canvas.press("Home")
        assert canvas.get_attribute("aria-valuenow") == "1"
        canvas.press("ArrowRight")
        assert canvas.get_attribute("aria-valuenow") == "2"
        canvas.press("End")
        assert canvas.get_attribute("aria-valuenow") == "30"
        box = canvas.bounding_box()
        page.mouse.move(box['x']+40, box['y']+50)
        page.mouse.down()
        page.mouse.move(box['x']+box['width']/2, box['y']+50, steps=5)
        page.mouse.up()
        assert 1 < int(canvas.get_attribute("aria-valuenow")) < 30
        page.locator("#chart-scrubber").fill("5")
        assert canvas.get_attribute("aria-valuenow") == "6"
        if width < 768:
            # The app's native Safari touch listeners, separate from pointer handling.
            page.evaluate("""() => {
              const c = document.getElementById('chart'), r = c.getBoundingClientRect();
              const t = new Touch({identifier:7,target:c,clientX:r.left+40,clientY:r.top+40});
              c.dispatchEvent(new TouchEvent('touchstart',{touches:[t],changedTouches:[t],bubbles:true,cancelable:true}));
              const m = new Touch({identifier:7,target:c,clientX:r.right-15,clientY:r.top+40});
              c.dispatchEvent(new TouchEvent('touchmove',{touches:[m],changedTouches:[m],bubbles:true,cancelable:true}));
              c.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[m],bubbles:true}));
            }""")
            assert int(canvas.get_attribute("aria-valuenow")) >= 29
        assert "No reading" in page.locator("#chart-reading").inner_text()
        page.locator("#compare-mode").select_option("change")
        assert "No change events" in page.locator("#compare-period").inner_text()
        page.locator("#compare-mode").select_option("recent")
        page.locator("#compare-span").select_option("30")
        assert page.locator(".compare-item").count() == 4
        layout_check(page)
        page.evaluate("window.scrollTo(0,0)")
        if width == 390:
            capture(page, output, f"{engine}-trends-{width}", full=True)
        page.locator('[data-page-link="context"]').click()
        assert page.locator("#context").is_visible()
        assert page.locator('[data-page-link="context"]').get_attribute("aria-current") == "page"
        layout_check(page)
        if width == 390:
            capture(page, output, f"{engine}-context-{width}", full=True)
        for kind in ["trt", "nicotine", "caffeine", "bp"]:
            page.locator("#edit-" + kind).click()
            assert page.locator("#dlg").is_visible()
            assert page.locator("#kind").input_value() == kind
            assert page.locator("#when").input_value()
            layout_check(page)
            assert page.locator("#save").is_visible()
            if kind == "trt" and width == 390:
                capture(page, output, f"{engine}-dialog-{width}")
            page.locator("#cancel2").click()
        page.locator("#add-med").click()
        assert page.locator("#kind").input_value() == "medication"
        layout_check(page)
        page.locator("#cancel").click()
        assert page.locator("#dlg").is_hidden()
        page.locator('[data-page-link="today"]').click()
        assert page.locator("#overview").is_visible()
        if width < 768:
            page.evaluate("""() => {
              const e = document.querySelector('.citadel-hero');
              const t = new Touch({identifier:8,target:e,clientX:innerWidth-50,clientY:160});
              e.dispatchEvent(new TouchEvent('touchstart',{touches:[t],changedTouches:[t],bubbles:true}));
              const end = new Touch({identifier:8,target:e,clientX:60,clientY:160});
              e.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[end],bubbles:true}));
            }""")
            assert page.locator("#trends").is_visible()
            page.locator('[data-page-link="today"]').click()
        # Focus survives panel decoration and indicates the actual control.
        page.locator("#lock").focus()
        page.keyboard.press("Tab")
        page.keyboard.press("Shift+Tab")
        assert page.locator("#lock").evaluate("e => getComputedStyle(e).outlineStyle") == "solid"
        page.locator("#lock").click()
        assert page.locator("#app").is_hidden()
        assert page.evaluate("sessionStorage.length") == 0
        # Test error presentation through an intercepted service-unavailable response.
        page.unroute("**/*", route_request)
        def unavailable(route):
            if route.request.url.startswith(base):
                route.continue_()
            else:
                route.fulfill(status=503, json={"error": "local visual test"})
        page.route("**/*", unavailable)
        page.locator("#key").fill("visual-test-only-not-a-real-private-key-000")
        page.locator("#login .primary").click()
        page.locator("#login-error").filter(has_text="unavailable").wait_for()
        layout_check(page)
        # No app code or QA procedure was allowed to reach an external service.
        assert not external, external
        assert not errors, errors
        resources = page.evaluate("performance.getEntriesByType('resource').map(x=>({name:x.name,size:x.transferSize}))")
        scenery = [r for r in resources if "fortress-" in r["name"]]
        assert len(scenery) == 1, scenery
        assert "1536.webp" in scenery[0]["name"], scenery
        assert page.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == "auto"
        results.append({"engine": engine, "viewport": [width, height], "scenery": scenery[0],
                        "console_errors": errors, "external_requests": external})
        print(f"PASS: {engine} {width}×{height}: layout, forms, navigation, scrub, lock, errors, resources", flush=True)
        context.close()
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("/tmp/iron-citadel-review"))
    parser.add_argument("--chromium", default="/usr/bin/chromium")
    parser.add_argument("--webkit", help="Optional Playwright WebKit executable")
    parser.add_argument("--static-only", action="store_true")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    static_checks()
    if args.static_only:
        return
    from playwright.sync_api import sync_playwright
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as p:
            chromium = p.chromium.launch(executable_path=args.chromium, args=["--no-sandbox"])
            results += run_browser(chromium, "chromium", f"http://127.0.0.1:{server.server_port}", args.output)
            chromium.close()
            if args.webkit:
                webkit = p.webkit.launch(executable_path=args.webkit)
                results += run_browser(webkit, "webkit", f"http://127.0.0.1:{server.server_port}", args.output)
                webkit.close()
    finally:
        server.shutdown()
    (args.output / "results.json").write_text(json.dumps(results, indent=2) + "\n")
    print(f"PASS: {len(results)} browser/viewport combinations. Screenshots: {args.output}")


if __name__ == "__main__":
    main()

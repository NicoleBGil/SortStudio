"""Exercise the animated game and research candidate in installed Chrome."""

import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


url = os.environ.get("SORTSTUDIO_TEST_URL", Path("index.html").resolve().as_uri())
errors = []


def open_games(page):
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url + "#games", wait_until="domcontentloaded")
    expect(page.locator("#puzzleTiles .julieblock")).to_have_count(6)


def solve_puzzle(page, tap=False):
    tiles = page.locator("#puzzleTiles .julieblock")
    for index in range(tiles.count()):
        order = tiles.evaluate_all("nodes => nodes.map(node => Number(node.dataset.value))")
        target = order.index(index + 1)
        if target != index:
            interact = "tap" if tap else "click"
            getattr(tiles.nth(index), interact)()
            getattr(tiles.nth(target), interact)()
    expect(page.locator("#puzzleFeedback")).to_contain_text("Minimum possible")
    expect(page.locator("#gameDashboard")).to_contain_text("moves")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        channel="chrome", headless=True,
        args=["--disk-cache-size=1", "--disable-gpu-shader-disk-cache", "--use-angle=swiftshader"],
    )
    desktop = browser.new_page(viewport={"width": 1420, "height": 960})
    open_games(desktop)
    desktop.select_option("#puzzleDifficulty", "hard")
    tiles = desktop.locator("#puzzleTiles .julieblock")
    expect(tiles).to_have_count(8)
    avatars = desktop.locator(".julieblocks-avatar")
    expect(avatars).to_have_count(2)
    desktop.wait_for_function(
        "[...document.querySelectorAll('.julieblocks-avatar')].every(i => i.complete && i.naturalWidth > 0)"
    )
    assert all(src.endswith(".webp") for src in avatars.evaluate_all("nodes => nodes.map(n => n.src)"))
    assert all(width >= 48 for width in avatars.evaluate_all(
        "nodes => nodes.map(n => n.getBoundingClientRect().width)"
    ))
    assert desktop.locator(".julieblocks-figure").first.evaluate("node => node.getAnimations().length") == 1
    first = tiles.first
    first.focus()
    first.press("Enter")
    expect(first).to_have_attribute("aria-pressed", "true")
    expect(first).to_be_focused()
    first.press("Space")
    expect(first).to_have_attribute("aria-pressed", "false")

    motion = desktop.locator("#puzzle-motion")
    motion.click()
    expect(motion).to_have_text("Resume motion")
    assert all(src.endswith(".png") for src in avatars.evaluate_all("nodes => nodes.map(n => n.src)"))
    assert desktop.locator(".julieblocks-figure").first.evaluate("node => node.getAnimations().length") == 0
    motion.click()
    expect(motion).to_have_text("Pause motion")
    desktop.locator("#puzzleHint").click()
    expect(desktop.locator("#puzzleFeedback")).to_contain_text("Hint: swap positions")
    solve_puzzle(desktop)

    # The comparison controls and the original prediction game still work.
    desktop.locator("#predictOptions button").first.click()
    expect(desktop.locator("#predictStats")).to_have_text("Score: 1 / 1")
    desktop.locator("#predictNext").click()
    expect(desktop.locator("#predictFeedback")).to_contain_text("Round 2")
    for input_name, expected in {
        "uniform": "Stable counting with compact bins",
        "ordered": "Already ordered",
        "reverse": "Reverse equal-key groups",
        "wide": "Stable merge of ordered runs",
    }.items():
        desktop.select_option("#sr-candidate-input", input_name)
        desktop.locator("#sr-candidate-run").click()
        expect(desktop.locator("#sr-candidate-status")).to_contain_text(expected + ". Verified 1,000 records.")
    desktop.locator("#sr-run").click()
    expect(desktop.locator("#sr-status")).to_have_text("20 of 20 methods passed on the same 1,000 records.")

    mobile = browser.new_page(
        viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, reduced_motion="reduce",
    )
    open_games(mobile)
    mobile.select_option("#puzzleDifficulty", "hard")
    expect(mobile.locator("#puzzle-motion")).to_have_text("Resume motion")
    assert mobile.locator("#puzzleTiles").evaluate("node => node.scrollWidth <= node.clientWidth")
    solve_puzzle(mobile, tap=True)
    assert not errors, errors
    browser.close()

print("Chrome passed JulieBlocks keyboard, touch, motion and asset checks, all four candidate routes, 20 baselines, and the prediction game.")

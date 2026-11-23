from pathlib import Path
from playwright.sync_api import sync_playwright
from hashlib import sha256
out=Path('test-results')
out.mkdir(exist_ok=True)
url=Path('index.html').resolve().as_uri()+'#sort-lab'
def view_hash(canvas):
    return sha256(canvas.screenshot()).hexdigest()
def info(page):
    return page.locator('#sl-frame').inner_text()
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    wide=browser.new_page(viewport={'width':1500,'height':1050},reduced_motion='reduce')
    errors=[]
    wide.on('pageerror', lambda error: errors.append(str(error)))
    wide.goto(url)
    wide.locator('#sl-canvas').wait_for(state='visible')
    assert wide.locator('#sl-a option').count()==wide.locator('#sl-b option').count()==20
    assert wide.locator('#sl-bars').is_hidden()
    canvas=wide.locator('#sl-canvas')
    initial=view_hash(canvas)
    assert canvas.evaluate('e => e.width && e.height && !!e.getContext("webgl2")')
    wide.locator('#sl-right').click()
    wide.wait_for_timeout(380)
    assert view_hash(canvas)!=initial, 'rotate control did not move camera'
    before_wheel=view_hash(canvas)
    xy=canvas.bounding_box()
    x = xy['x'] + xy['width'] / 2
    y = xy['y'] + xy['height'] / 2
    wide.mouse.move(x, y)
    wide.mouse.wheel(0,-230)
    wide.wait_for_timeout(420)
    assert view_hash(canvas)!=before_wheel, 'mouse wheel did not zoom'
    before_drag = view_hash(canvas)
    wide.mouse.move(x, y)
    wide.mouse.down()
    wide.mouse.move(x + 50, y + 22, steps=5)
    wide.mouse.up()
    wide.wait_for_timeout(420)
    assert view_hash(canvas) != before_drag, 'mouse drag did not orbit'
    wide.locator('#sl-reset-camera').click()
    wide.locator('#sl-next').click()
    wide.wait_for_timeout(150)
    wide.locator('.sl-stage').screenshot(path=out/'desktop-3d.png')
    wide.locator('#sl-2d').click()
    assert canvas.is_hidden() and wide.locator('#sl-bars').is_visible()
    wide.locator('.sl-custom summary').click()
    wide.locator('#sl-custom').fill('5, -3, 5, 0, 7')
    wide.locator('#sl-custom-form button').click()
    assert '5 items' in wide.locator('#sl-status').inner_text()
    columns=wide.locator('#sl-bars g.sl-chart-lane').first.locator('rect[role=button]')
    columns.nth(2).hover()
    assert 'position 3' in wide.locator('#sl-inspect').inner_text(), 'duplicate hover position'
    columns.nth(2).focus()
    columns.nth(2).press('Enter')
    assert wide.locator('#sl-item').input_value()=='2'
    wide.locator('#sl-chart-type').select_option('position')
    assert wide.locator('#sl-chart path.sl-trace').count()==2
    assert 'item #3' in wide.locator('#sl-chart-note').inner_text()
    wide.locator('#sl-order').select_option('desc')
    ids=wide.locator('#sl-a option').evaluate_all('options => options.map(option => option.value)')
    for number, id in enumerate(ids):
        sel='a' if number % 2 else 'b'
        wide.locator('#sl-'+sel).select_option(id)
        seek=wide.locator('#sl-seek')
        seek.evaluate('e => {e.value=e.max; e.dispatchEvent(new Event("input"))}')
        values=wide.locator('#sl-bars g.sl-chart-lane').nth(0 if sel=='a' else 1).locator('rect[role=button]').evaluate_all('bars => bars.map(b => Number(b.getAttribute("aria-label").match(/value (-?\\d+)/)[1]))')
        assert values==[7,5,5,0,-3], (id,values)
    wide.locator('#sl-play').click()
    wide.wait_for_function('document.querySelector("#sl-seek").valueAsNumber > 0')
    wide.locator('#sl-play').click()
    seek.evaluate('e => {e.value=0; e.dispatchEvent(new Event("input"))}')
    wide.locator('#sl-coach-lane').select_option('1')
    wide.locator('#sl-question').fill('Explain this step')
    wide.locator('#sl-question-form button').click()
    assert wide.locator('#sl-coach-reply h4').inner_text()
    wide.locator('#sl-challenge').click()
    wide.locator('#sl-quiz button').first.click()
    assert wide.locator('#sl-quiz strong').inner_text().startswith(('Correct','Expected'))
    wide.locator('#sl-next').click()
    assert wide.locator('#sl-quiz').inner_text()==''
    seek.evaluate('e => {e.value=0; e.dispatchEvent(new Event("input"))}')
    wide.locator('#sl-chart .sl-chart-hit').click(position={'x':75,'y':40})
    assert not info(wide).startswith('Event 1 /')
    wide.locator('.sl-analysis').screenshot(path=out/'desktop-d3.png')
    wide.locator('#sl-a').select_option('counting')
    wide.locator('#sl-custom').fill('3, -1000000000')
    wide.locator('#sl-custom-form button').click()
    assert '16,384' in wide.locator('#sl-status').inner_text() or '16384' in wide.locator('#sl-status').inner_text()
    assert wide.locator('#sl-item option').count()==5
    assert wide.locator('#arena').count()==1 and wide.locator('a[href="#arena"]').count()>0
    assert not errors, errors
    print('PASS desktop offline file, 3D canvas, camera buttons, mouse orbit and zoom, 20 final traces, D3 scrubbing, signed/duplicate inspection, counting bound, coach and challenge')
    mobile=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce',device_scale_factor=2)
    mobile.on('pageerror', lambda error: errors.append(str(error)))
    mobile.goto(url)
    cvs=mobile.locator('#sl-canvas')
    cvs.scroll_into_view_if_needed()
    before=view_hash(cvs)
    box=cvs.bounding_box()
    assert box['width']<=390
    mt=browser.contexts[-1].new_cdp_session(mobile)
    x=box['x']+box['width']/2
    y=box['y']+box['height']/2
    def touch(t,pos): mt.send('Input.dispatchTouchEvent', {'type':t,'touchPoints':[{'x':int(a),'y':int(b),'id':i} for i,(a,b) in enumerate(pos)]})
    touch('touchStart',[(x,y)])
    touch('touchMove',[(x+42,y+28)])
    touch('touchEnd',[])
    mobile.wait_for_timeout(460)
    after=view_hash(cvs)
    assert before!=after, 'touch rotation did not change canvas'
    touch('touchStart',[(x-24,y),(x+24,y)])
    touch('touchMove',[(x-57,y),(x+57,y)])
    touch('touchEnd',[])
    mobile.wait_for_timeout(460)
    assert view_hash(cvs)!=after, 'pinch zoom did not change canvas'
    mobile.locator('.sl-stage').screenshot(path=out/'mobile-zoom.png')
    mobile.locator('#sl-reset-camera').tap()
    mobile.wait_for_timeout(300)
    mobile.locator('.sl-stage').screenshot(path=out/'mobile-3d.png')
    assert mobile.locator('#sort-lab').evaluate('e => e.scrollWidth <= e.clientWidth+1')
    assert not errors, errors
    print('PASS 390 px mobile emulation, one-finger orbit, two-finger pinch, no lab overflow')
    fallback=browser.new_page(viewport={'width':1100,'height':800},reduced_motion='reduce')
    fallback.add_init_script("""const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:get.call(this,type,...args);}""")
    fallback.goto(url)
    assert fallback.locator('#sl-canvas').is_hidden() and fallback.locator('#sl-bars').is_visible()
    assert 'unavailable' in fallback.locator('#sl-status').inner_text()
    assert fallback.locator('#sl-3d').is_disabled()
    print('PASS WebGL-unavailable fallback to D3')

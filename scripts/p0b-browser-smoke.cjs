const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const BASE='http://127.0.0.1:4173/';
const TIERS=['Beginner','Easy','Standard','Advanced','Expert'];

const progressSlice=state=>Object.fromEntries(Object.entries(state||{}).filter(([key])=>/progress|master|stat|score|streak|journey|path|review|xp|level/i.test(key)&&key!=='settings'));

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1365,height:900}});
  const page=await context.newPage();
  const pageErrors=[]; const consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
    const modal=page.locator('#modalRoot .modal-backdrop');
    await modal.waitFor({state:'visible',timeout:15000});
    const text=(await modal.innerText()).replace(/\s+/g,' ');
    assert.match(text,/CHOOSE YOUR BIBLE DIFFICULTY/i,'fresh profile needs onboarding difficulty chooser');
    for(const tier of TIERS)assert.match(text,new RegExp(`\\b${tier}\\b`,'i'),`onboarding missing ${tier}`);
    const standard=modal.getByRole('button').filter({hasText:/Standard/i}).first();
    assert.equal(await standard.isVisible(),true,'Standard difficulty must be selectable');
    await standard.click();
    await page.waitForFunction(()=>{try{const s=JSON.parse(localStorage.getItem('theBibleChallenge_v21'));return s?.onboarded===true&&String(s?.settings?.difficulty).toLowerCase()==='standard'}catch{return false}},null,{timeout:5000});

    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('theBibleChallenge_v21')));
    assert.equal(String(before.settings?.difficulty).toLowerCase(),'standard','selected difficulty must persist');
    assert.ok(localStorage!==undefined);

    const settingsButton=page.locator('.pr5-utility-link').filter({hasText:/Settings/i}).first();
    if(await settingsButton.count()){
      await settingsButton.click();
      await page.waitForTimeout(300);
      const settingsVisible=(await page.locator('body').innerText()).replace(/\s+/g,' ');
      assert.match(settingsVisible,/difficulty|level/i,'post-onboarding settings must retain a difficulty/level control');
    }

    await page.locator('.pr5-primary-nav [data-pr5-nav="play"]').click();
    await page.waitForFunction(()=>document.body.dataset.pr6Flow==='play'&&document.querySelector('.pr6-root:not([hidden])'),null,{timeout:7000});
    const quick=page.locator('.pr6-root [data-pr6-action="quick-start"]').first();
    assert.equal(await quick.isVisible(),true,'Quick Play launch control must be visible');
    await quick.click();
    await page.waitForFunction(()=>!document.body.classList.contains('pr6-native-active'),null,{timeout:7000});
    await page.waitForTimeout(300);

    const legacySession=await page.evaluate(()=>{
      const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
      const legacy=[...document.querySelectorAll('button,a[href],[role="button"],input,select,textarea')].filter(el=>visible(el)&&!el.closest('[data-pr5-ui],[data-pr6-ui],[data-p0c-ui]'));
      const body=(document.querySelector('.content')?.innerText||document.body.innerText||'').replace(/\s+/g,' ');
      return {count:legacy.length,body,pr6Active:document.body.classList.contains('pr6-native-active')};
    });
    assert.equal(legacySession.pr6Active,false,'Quick Play must hand off to the legacy session surface');
    assert.ok(legacySession.count>=2,`legacy session needs normal interactive controls; found ${legacySession.count}`);
    assert.match(legacySession.body,/question|answer|score|streak|round|quiz|practice/i,'legacy session surface must expose quiz/session content');

    const afterHandoff=await page.evaluate(()=>JSON.parse(localStorage.getItem('theBibleChallenge_v21')));
    assert.equal(afterHandoff.onboarded,true,'handoff must not reset onboarding');
    assert.equal(String(afterHandoff.settings?.difficulty).toLowerCase(),'standard','handoff must not reset selected difficulty');

    const frozenProgress=progressSlice(afterHandoff);
    const raw=JSON.stringify(afterHandoff);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.TBC_PR6?.version==='PR6.0'&&window.TBC_P0C?.version==='P0C.3',null,{timeout:20000});
    const reloaded=await page.evaluate(()=>JSON.parse(localStorage.getItem('theBibleChallenge_v21')));
    assert.equal(reloaded.onboarded,true,'existing canonical save must skip fresh onboarding after reload');
    assert.equal(String(reloaded.settings?.difficulty).toLowerCase(),'standard','existing save must retain difficulty after reload');
    const reloadedProgress=progressSlice(reloaded);
    assert.deepEqual(reloadedProgress,frozenProgress,'progress/mastery/stat state must not reset during reload');
    assert.ok(raw.length>100,'canonical save must remain a substantive readable JSON state');
    assert.deepEqual(pageErrors,[],`page errors: ${pageErrors.join(' | ')}`);
    assert.deepEqual(consoleErrors,[],`console errors: ${consoleErrors.join(' | ')}`);
    console.log('P0B browser smoke passed: onboarding, all five levels, persisted selection, Quick Play handoff, normal legacy controls, save readability, and no progress reset on reload.');
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

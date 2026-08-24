const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  try{
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>document.documentElement.getAttribute('data-pr5-foundation')==='PR5.1',null,{timeout:20000});
    const modal=page.locator('#modalRoot .modal-backdrop');
    await modal.waitFor({state:'visible',timeout:15000});
    const standard=modal.getByRole('button').filter({hasText:/Standard/i}).first();
    await standard.click();
    await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('theBibleChallenge_v21'))?.onboarded===true}catch{return false}},null,{timeout:7000});
    await page.waitForTimeout(500);
    const chip=page.locator('.v28-level-chip').first();
    assert.equal(await chip.isVisible(),true,'level chip must remain visible after onboarding');
    console.log('P0B LEVEL CHIP BEFORE:',(await chip.innerText()).replace(/\s+/g,' ').trim());
    await chip.click();
    await page.waitForTimeout(500);
    const openModal=page.locator('#modalRoot .modal-backdrop');
    const modalVisible=await openModal.isVisible().catch(()=>false);
    const modalText=modalVisible?(await openModal.innerText()).replace(/\s+/g,' ').trim():'';
    const visibleButtons=await page.locator('button:visible').allTextContents();
    console.log('P0B LEVEL CHIP MODAL VISIBLE:',modalVisible);
    console.log('P0B LEVEL CHIP MODAL:',modalText.slice(0,2500));
    console.log('P0B LEVEL CHIP BUTTONS:',visibleButtons.map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,100).join(' || '));
  }finally{
    await context.close();await browser.close();
  }
})().catch(err=>{console.error(err);process.exit(1)});

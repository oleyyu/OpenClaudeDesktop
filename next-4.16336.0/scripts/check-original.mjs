import {chromium} from '../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const externalBlocked=[];const failures=[];const errors=[];const requests=[];
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin==='http://127.0.0.1:4318')await route.continue();else{externalBlocked.push(u.origin+u.pathname);await route.abort();}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(new URL(r.url()).pathname));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:4318/code',{waitUntil:'load',timeout:60000});
 await page.waitForTimeout(6000);
 const visible=await page.locator('body').innerText();
 await page.screenshot({path:path.join(root,'analysis/original-offline.png'),fullPage:true});
 const result={url:page.url(),title:await page.title(),visibleText:visible,requests:requests.length,externalBlocked,failures,errors};
 await fs.writeFile(path.join(root,'analysis/offline-load.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}

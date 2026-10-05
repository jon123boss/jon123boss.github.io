import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { nearest, tickValues } from '../research-plots.js';
const dist = new URL('../', import.meta.url);
const pages=['index.html','blogs.html','papers.html','purrence.html','exoformer.html','lr-attnres.html','chess.html'];
test('every readable entry page has a unique main heading and resolvable local assets and links', async()=>{
  for(const page of pages){
    const html=await readFile(new URL(page,dist),'utf8');
    assert.equal((html.match(/<h1\b/g)||[]).length,1,page);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(ids).size,ids.length,`${page}: duplicate ids`);
    for(const [,target] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
      if(/^(?:https?:|mailto:|data:|#)/.test(target))continue;
      const url=new URL(target,dist);url.search='';url.hash='';await access(url);
    }
    assert.match(html,/<nav aria-label="Main navigation">/);
    assert.match(html,/<div hidden class="background-controls"/);
  }
});
test('the article has readable fallback measurements for all fourteen plots',async()=>{
  const html=await readFile(new URL('purrence.html',dist),'utf8');
  assert.equal((html.match(/data-chart=/g)||[]).length,14);
  assert.equal((html.match(/<table>/g)||[]).length,14);
  assert.equal((html.match(/class="chart-fallback"/g)||[]).length,18);
  assert.ok(!html.includes('Loading chart'));
  assert.ok(!html.includes('Replay placement'));
});
test('all interactive data is finite and line samples are ordered for keyboard inspection',async()=>{
  const chartDir=new URL('blog/purrence/charts/',dist);
  for(const file of await readdir(chartDir)){
    if(!file.endsWith('.json'))continue;
    const chart=JSON.parse(await readFile(new URL(file,chartDir),'utf8'));
    for(const view of chart.views)for(const series of view.series){
      assert.ok(series.points.length>0,file);
      for(const point of series.points)assert.ok(point.slice(0,2).every(Number.isFinite),file);
      if(view.orientation!=='horizontal')for(let i=1;i<series.points.length;i++)assert.ok(series.points[i][0]>=series.points[i-1][0],file);
    }
  }
});
test('nearest point inspection and axis ticks handle edges and narrow value ranges',()=>{
  assert.equal(nearest([],4),null);
  const points=[[1,4],[2,5],[4,8]];
  assert.deepEqual(nearest(points,-1),points[0]);
  assert.deepEqual(nearest(points,10),points[2]);
  assert.deepEqual(nearest(points,2.9),points[1]);
  assert.deepEqual(nearest(points,3.2),points[2]);
  for(const bounds of [[0,.01],[-1,1],[2.217,2.218]]){
    const {ticks}=tickValues(...bounds,5);
    assert.ok(ticks.length>=2);assert.ok(ticks.every(Number.isFinite));
    for(let i=1;i<ticks.length;i++)assert.ok(ticks[i]>ticks[i-1]);
  }
});

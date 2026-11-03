const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data/poems.js'),'utf8'),context);
const poems=context.window.POEMS;
const han=/\p{Script=Han}/u;
test('75 unique curriculum entries; same-title works stay distinct',()=>{
 assert.equal(poems.length,75);
 assert.equal(new Set(poems.map(p=>p.id)).size,75);
 assert.equal(new Set(poems.map(p=>p.title+'|'+p.author+'|'+p.lines[0].text)).size,75);
 assert.deepEqual(Array.from(poems.filter(p=>p.title==='凉州词'),p=>p.author),['王之涣','王翰']);
 assert.equal(poems[30].title,'渔歌子');assert.equal(poems[31].title,'塞下曲');
 assert.equal(poems[40].lines[0].text,'锄禾日当午，');
 assert.equal(poems[73].title,'己亥杂诗');assert.equal(poems[74].title,'村居');
});
test('Every original line has a complete translation and one syllable per Chinese character',()=>{
 for(const p of poems){
  assert.ok(p.title&&p.author&&p.dynasty&&p.notes.length>=2,p.title);
  assert.ok(p.lines.length>=4,p.title);
  for(const l of p.lines){
   assert.ok(l.translation.length>=5,`${p.title}: missing translation`);
   assert.equal(l.tokens.map(t=>t.char).join(''),l.text);
   for(const t of l.tokens){if(han.test(t.char))assert.match(t.pinyin,/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹê]+$/u,`${p.title} ${l.text} ${t.char}`);else assert.equal(t.pinyin,'');}
  }
 }
});
test('Classical context readings are retained',()=>{
 const fixtures={
  '朝露待日晞。':'zhāo lù dài rì xī',
  '曲项向天歌。':'qū xiàng xiàng tiān gē',
  '风吹草低见牛羊。':'fēng chuī cǎo dī xiàn niú yáng',
  '但使龙城飞将在，':'dàn shǐ lóng chéng fēi jiàng zài',
  '万里长征人未还。':'wàn lǐ cháng zhēng rén wèi huán',
  '渭城朝雨浥轻尘，':'wèi chéng zhāo yǔ yì qīng chén',
  '独在异乡为异客，':'dú zài yì xiāng wéi yì kè',
  '单于夜遁逃。':'chán yú yè dùn táo',
  '桃花流水鳜鱼肥。':'táo huā liú shuǐ guì yú féi',
  '临行密密缝，':'lín xíng mì mì féng',
  '千磨万击还坚劲，':'qiān mó wàn jī hái jiān jìng',
  '应怜屐齿印苍苔，':'yīng lián jī chǐ yìn cāng tái',
 };
 for(const [text,expected] of Object.entries(fixtures)){
  const line=poems.flatMap(p=>p.lines).find(l=>l.text===text);
  assert.ok(line,text);assert.equal(line.tokens.filter(t=>t.pinyin).map(t=>t.pinyin).join(' '),expected,text);
 }
 assert.equal(poems.find(p=>p.title==='鹿柴').titleTokens.map(t=>t.pinyin).join(' '),'lù zhài');
 assert.equal(poems.find(p=>p.author==='李峤').authorTokens.map(t=>t.pinyin).join(' '),'lǐ jiào');
});
test('Long poems include their complete text',()=>{
 assert.equal(poems.find(p=>p.title==='长歌行').lines.length,10);
 assert.equal(poems.find(p=>p.title==='古朗月行').lines.length,16);
 assert.equal(poems.find(p=>p.title==='赋得古原草送别').lines.length,8);
});

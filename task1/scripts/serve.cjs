const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server = http.createServer((req,res)=>{
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400);res.end('Bad request');return;}
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep) || target.includes(`${path.sep}node_modules${path.sep}`) || target.includes(`${path.sep}.`)) {res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);
  });
});
server.on('error',err=>{console.error(`无法启动：${err.code === 'EADDRINUSE' ? `端口 ${port} 已被占用。可用 PORT=4174 npm start 换一个端口。` : err.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`诗词拾光已启动：http://127.0.0.1:${port}\n按 Ctrl+C 结束预览。`));

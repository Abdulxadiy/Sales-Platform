const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer, request } = require('node:http');
const { once } = require('node:events');
const { forwardRequest } = require('../proxy.cjs');

async function listen(t, callback) {
  const server = createServer(callback); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(ok => { server.close(ok); server.closeAllConnections(); }));
  return server.address().port;
}

test('closing a renderer drains the response and preserves its submitted operation', {timeout:5000}, async t => {
  for (const closeAfterHeaders of [false, true]) {
    let release, reached;
    const arrived = new Promise(ok => { reached = ok; });
    const gate = new Promise(ok => { release = ok; });
    let applied = '', finishes = 0, completed;
    const done = new Promise(ok => { completed = ok; });
    const port = await listen(t, async (req, res) => {
      for await (const chunk of req) applied += chunk;
      reached();
      if (closeAfterHeaders) { res.writeHead(200); res.write('accepted'); }
      await gate; res.end('x'.repeat(1024*1024));
    });
    const bridge = await listen(t, (req,res) => forwardRequest(req,res,{host:'127.0.0.1',port,path:'/',method:req.method,headers:req.headers},false,()=>{finishes++;completed();}));
    const client = request({host:'127.0.0.1',port:bridge,method:'POST'}, res => { if(closeAfterHeaders) { res.destroy(); release(); } });
    client.on('error',()=>{});
    client.end('synthetic-complete-sale');
    await arrived;
    if (!closeAfterHeaders) { const closed=new Promise(ok=>client.once('close',ok)); client.destroy(); await closed; release(); }
    await done;
    assert.equal(applied,'synthetic-complete-sale');
    await new Promise(ok=>setImmediate(ok));
    assert.equal(finishes,1,'A disconnected renderer must not keep shutdown waiting');
  }
});

test('an aborted incomplete upload releases the outstanding request', {timeout:5000}, async t => {
  let completed;
  const done = new Promise(ok=>{completed=ok;});
  const port = await listen(t, req=>{req.on('error',()=>{});req.resume();});
  const bridge = await listen(t, (req,res)=>forwardRequest(req,res,{host:'127.0.0.1',port,path:'/',method:'POST',headers:req.headers},false,completed));
  const client = request({host:'127.0.0.1',port:bridge,method:'POST',headers:{'Content-Length':'10000'}});
  client.on('error',()=>{}); client.write('incomplete');
  await new Promise(ok=>setTimeout(ok,30)); client.destroy();
  await done;
});

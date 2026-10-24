const { request: httpRequest } = require('node:http');
const { request: httpsRequest } = require('node:https');

function forwardRequest(request, response, options, secure, completed) {
  let remoteResponse, finished = false;
  const finish = () => { if (!finished) { finished = true; completed(remoteResponse?.statusCode,remoteResponse?.headers); } };
  // Closing a window must not cancel an already submitted business operation.
  // Consume its response even when the renderer no longer accepts the result.
  response.once('close', () => { if (remoteResponse) { remoteResponse.unpipe(response); remoteResponse.resume(); } });
  const upstream = (secure ? httpsRequest : httpRequest)(options, remote => {
    remoteResponse = remote;
    remote.once('end', finish); remote.once('close', finish);
    remote.once('error', () => { finish(); response.destroy(); });
    if (response.destroyed) remote.resume();
    else { response.writeHead(remote.statusCode, remote.headers); remote.pipe(response); }
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => {
    finish();
    if (response.destroyed) return;
    if (!response.headersSent) response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ detail: 'Asosiy kassa kompyuteriga ulanish yo‘q. Mahalliy tarmoq va asosiy kompyuterni tekshiring.' }));
  });
  // An incomplete upload cannot execute; do not leave its upstream waiting.
  request.once('aborted', () => upstream.destroy());
  request.once('error', () => upstream.destroy());
  request.pipe(upstream);
}
module.exports = { forwardRequest };

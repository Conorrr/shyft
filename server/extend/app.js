const { wrapWebSocketMethod } = require('/opt/lambda');

exports.handler = wrapWebSocketMethod(async (event, context, wsSend) => {
  await wsSend({type: "pong"});
});
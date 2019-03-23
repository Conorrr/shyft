const ws = require('./ws');
const errors = require('./errors');

exports.wrapWebSocketMethod = function(fn) {
  return async function (event, context) {
    let connectionId = event.requestContext.connectionId;
    const preppedWs = ws.prep(event.requestContext.domainName, event.requestContext.stage, connectionId)

    try {
      await fn(event, context, preppedWs);
      
      return { statusCode: 200, body: 'Success' };
    } catch (error) {
      console.error(error);
      await preppedWs(errors.errorMessageBody(errors.codes.UNEXPECTED));
      return { statusCode: 500, body: 'Internal server error' };
    }
  }
}
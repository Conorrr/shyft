let AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const { SESSION_TABLE_NAME, CONNECTION_TABLE_NAME } = process.env;

exports.handler = async (event, context, callback) => {
  let connectionId = event.requestContext.connectionId;
  let connectionIdParams = {
    TableName: CONNECTION_TABLE_NAME,
    Key: {
      connectionId: connectionId
    }
  };

  // Does delete return the sessionId?
  let connectionDetailsResult = await DDB.get(connectionIdParams, function (err) {
    if (err) {
      console.log("error getting connection:" + JSON.stringify(err));
      callback(null, {
        statusCode: 500,
        body: "Error getting connection for connectionId: " + connectionId + " : " + JSON.stringify(err)
      });
    }
  }).promise();

  console.log("Found connection" + JSON.stringify(connectionDetailsResult));

  let sessionId = connectionDetailsResult.Item.sessionId;
  // TODO if no connection found stop now

  let deleteConnectionPromise = DDB.delete(connectionIdParams, function (err) {
    if (err) {
      console.log("error getting connection:" + JSON.stringify(err));
      callback(null, {
        statusCode: 500,
        body: "Failed to disconnect: " + JSON.stringify(err)
      });
    }
  }).promise();

  let removeConnectionsPromise = DDB.update({
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId : sessionId },
    UpdateExpression: 'delete connections :c',
    ExpressionAttributeValues: {
      ':c' : DDB.createSet([connectionId])
    }
  }, function (err) {
    if (err) {
      console.log("error getting connection:" + JSON.stringify(err));
    }
    callback(null, {
      statusCode: err ? 500 : 200,
      body: err ? "Failed to disconnect: " + JSON.stringify(err) : "Disconnected."
    });
  }).promise();

  await deleteConnectionPromise;
  await removeConnectionsPromise;
};
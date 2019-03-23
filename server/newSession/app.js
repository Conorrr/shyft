const AWS = require('aws-sdk');
const crypto = require("crypto");
const connections = require('/opt/connections');
const sessions = require('/opt/sessions');
const { wrapWebSocketMethod } = require('/opt/lambda');
// Add ApiGatewayManagementApi to the AWS namespace
require('aws-sdk/clients/apigatewaymanagementapi');

const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const { SESSION_TABLE_NAME, CONNECTION_TABLE_NAME } = process.env;
const DEFAULT_SESSION_LENGTH_MINS = 15;
const MAX_SESSION_LENGTH_MINS = 120; // 2 hours
const DEFAULT_MAX_NO_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 4194304; // 4MB

function randomId() {
  return crypto.randomBytes(16).toString('hex');
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes*60000);
}

exports.handler = wrapWebSocketMethod(async (event, context, wsSend) => {
  let nowWithNoMillis = Math.floor(new Date().getTime()/1000) * 1000;

  let sessionId = randomId();
  let hostKey = randomId();
  let created = new Date(nowWithNoMillis);
  let expiry = addMinutes(created, DEFAULT_SESSION_LENGTH_MINS); 
  let connectionId = event.requestContext.connectionId;

  let createSessionPromise = sessions.createSession(sessionId, hostKey, created, expiry, DEFAULT_MAX_NO_FILES, DEFAULT_MAX_FILE_SIZE, connectionId);

  let createConnectionPromise = connections.createConnection(connectionId, sessionId, true);
  
  let responsePromise = wsSend({
    type: "newSessionCreated",
    sessionId: sessionId,
    hostKey: hostKey,
    expiry: expiry,
    maxFiles: DEFAULT_MAX_NO_FILES,
    maxSize: DEFAULT_MAX_FILE_SIZE
  });

  await Promise.all([ createSessionPromise, createConnectionPromise, responsePromise]);

});
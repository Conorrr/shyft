const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const request = promisify(require('request'));
const WebSocketHelper = require('./utils/WebSocketHelper');

describe("host is able to reconnect to an existing session", function() {
  const url = "wss://c8gu73uvqg.execute-api.eu-central-1.amazonaws.com/Prod/";
  
  let hostConnection = new WebSocketHelper();

  let photo;
  let photoSize;

  let sessionId;
  let hostKey;
  let expiry;

  let fileId;

  beforeAll(async function() {
    // Create new session
    await hostConnection.connect(url);
    hostConnection.sendMessage({type:"newSession"});

    let newSessionMessage = await hostConnection.waitForNextMessage();
    sessionId = newSessionMessage.sessionId;
    hostKey = newSessionMessage.hostKey;
    expiry = newSessionMessage.expiry;

    hostConnection.sendMessage({type:"uploadInit", files:[{filename: "one.jpg", type: "image/jpeg"}]});

    presignedUrlMessage = await hostConnection.waitForNextMessage();

    fileId = presignedUrlMessage.presignedUrls['one.jpg'].id;
    filePutUrl = presignedUrlMessage.presignedUrls['one.jpg'].url;

    // Load files to be uploaded
    photo = await readFile("spec/resources/photo1.jpg");

    // Upload file
    let headers = { 
      "content-disposition" : 'attachment; filename="one.jpg"',
      "content-type"        : "image/jpeg"
    }
    let response = await request({url: filePutUrl, method: 'PUT', headers: headers, body: photo});
    expect(response.statusCode).toEqual(200);
    
    // receive new file
    await hostConnection.waitForNextMessage();

    hostConnection.close();
  }, 5000)


  afterAll(() => {
    hostConnection.close();
  })

  let message;

  it("is able to reconnect", async () => {
    await hostConnection.connect(url);
    hostConnection.sendMessage({type:"reconnect", sessionId: sessionId, hostKey: hostKey});

    message = await hostConnection.waitForNextMessage();

    expect(message.type).toEqual("sessionData");
  });

  it("maxFiles to be 10", () => {
    expect(message.maxFiles).toEqual(10);
  });

  it("maxSize to be 4194304", () => {
    expect(message.maxSize).toEqual(4194304);
  });

  it("expiry is equal or original session", () => {
    expect(message.expiry).toEqual(expiry);
  });

   it("contains all of the already uploaded files", () => {
    expect(message.files.length).toEqual(1);
  });
  
  it("id is same as was returned by presignedUrl", () => {
    expect(message.files[0].id).toEqual(fileId);
  });

  it("the name matches the original of the file", () => {
    expect(message.files[0].name).toEqual('one.jpg');
  });
  
  let fileResponse;

  it("url can be used to download the file", async () => {
    fileResponse = await request({url: message.files[0].url});
    expect(fileResponse.statusCode).toEqual(200);
  });

  it("the responses have Content-Disposition header", () => {
    expect(fileResponse.headers['content-disposition']).toEqual("attachment; filename=\"one.jpg\"");
  });

  it("the responses have Content-Type header", () => {
    expect(fileResponse.headers['content-type']).toEqual("image/jpeg");
  });

});
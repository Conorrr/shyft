const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const request = promisify(require('request'));
const WebSocketHelper = require('./utils/WebSocketHelper');

describe("all basic functionality", function() {
  const url = "wss://6o5dmy0vb8.execute-api.eu-central-1.amazonaws.com/Prod/";
  
  let hostConnection = new WebSocketHelper();
  let secondaryConnection1 = new WebSocketHelper();
  let secondaryConnection2 = new WebSocketHelper();
  let secondaryConnection3 = new WebSocketHelper();
  let secondaryConnection4 = new WebSocketHelper();
  let secondaryConnection5 = new WebSocketHelper();
  let secondaryConnections = [secondaryConnection1, secondaryConnection2, secondaryConnection3, secondaryConnection3, secondaryConnection4, secondaryConnection5];

  let sessionId;
  let hostKey;
  let expiry;

  beforeAll(async function() {
    // Open Socket
    await hostConnection.connect(url);
  }, 1500)
  
  afterAll(() => {
    hostConnection.close();
    for (let connection of secondaryConnections) {
      connection.close();
    }
  })

  describe("Host receives session details when they send a newSession message", function() {

    let message;

    beforeAll(async function() {
      hostConnection.sendMessage({type:"newSession"});

      message = await hostConnection.waitForNextMessage();
      sessionId = message.sessionId;
      hostKey = message.hostKey;
      expiry = message.expiry;
    });

    it("response type is newSessionCreated", () => {
      expect(message.type).toEqual("newSessionCreated");
    });

    it ("sessionId to be 32 digit hex", () => {
      expect(message.sessionId).toMatch(/^[0-9a-f]{32}$/);
    });

    it ("hostKey to be 32 digit hex", () => {
      expect(message.hostKey).toMatch(/^[0-9a-f]{32}$/);
    });

    it("maxFiles to be 10", () => {
      expect(message.maxFiles).toEqual(10);
    });

    it("maxSize to be 4194304", () => {
      expect(message.maxSize).toEqual(4194304);
    });

    it("expiry to be in about 15 minutes", () => {
      let in15Mins = Date.now() + (15 * 60 * 1000);
      let difference = in15Mins - Date.parse(message.expiry);
      // allow 5 seconds difference
      expect(difference).toBeLessThan(5 * 1000);
      
      // can't be more than 15 mins from now
      expect(difference).toBeGreaterThan(0);
    });

  });

  describe("secondary connections should be able to connect", () => {
    beforeAll(async () => {
      let promises = []
      for (let connection of secondaryConnections) {
        promises.push(connection.connect(url));
      }
      await Promise.all(promises);
    })

    for (let secondaryConnection of secondaryConnections) {
      let message;

      it("secondary are able to connect to open session", async () => {
        secondaryConnection.sendMessage({type:"secondaryConnect", sessionId:sessionId});

        message = await secondaryConnection.waitForNextMessage();
      });

      it("response type is sessionData", () => {
        expect(message.type).toEqual("sessionData");
      });

      it("maxFiles to be 10", () => {
        expect(message.maxFiles).toEqual(10);
      });

      it("maxSize to be 4194304", () => {
        expect(message.maxSize).toEqual(4194304);
      });

      it("expiry to be match host expiry", () => {
        expect(message.expiry).toEqual(expiry);
      });
    }
  });

  let file1Id;
  let file1Url;
  let file2Id;
  let file2Url;
  let file3Id;
  let file3Url;

  describe("host can upload a file", () => {
    let presignedUrlMessage;

    it("host can request presigned urls for 3 files", async () => {
      hostConnection.sendMessage({type:"uploadInit", filenames:["one.jpg", "two.jpg", "three.jpg"]});

      presignedUrlMessage = await hostConnection.waitForNextMessage();
      expect(presignedUrlMessage.type).toEqual("presignedUrl");
    });

    it("message contains generated link and id for each filename", () => {
      let file1 = presignedUrlMessage.presignedUrls['one.jpg'];
      let file2 = presignedUrlMessage.presignedUrls['two.jpg'];
      let file3 = presignedUrlMessage.presignedUrls['three.jpg'];
      file1Id = file1.id;
      file1Url = file1.url;
      expect(file1Id).toMatch(/^[0-9a-f]{32}$/);
      expect(file1Url).toMatch(/.*/);

      file2Id = file2.id;
      file2Url = file2.url;
      expect(file2Id).toMatch(/^[0-9a-f]{32}$/);
      expect(file1Url).toMatch(/.*/);

      file3Id = file3.id;
      file3Url = file3.url;
      expect(file3Id).toMatch(/^[0-9a-f]{32}$/);
      expect(file1Url).toMatch(/.*/);
    })

    it("urls can be used to upload files", async () => {
      let photo1 = await readFile("spec/resources/photo1.jpg");
      let photo2 = await readFile("spec/resources/photo2.jpg");
      let photo3 = await readFile("spec/resources/photo3.jpg");
      
      let response1 = await request({url: file1Url, method: 'PUT', body: photo1});
      expect(response1.statusCode).toEqual(200);
      let response2 = await request({url: file2Url, method: 'PUT', body: photo2});
      expect(response2.statusCode).toEqual(200);
      let response3 = await request({url: file3Url, method: 'PUT', body: photo3});
      expect(response3.statusCode).toEqual(200);
    });

  });

  /*
   NOT YET IMPLEMENTED
  describe("secondaries receive new file events", () => {

    for (let secondaryConnection of secondaryConnections) {
      let message1;
      let message2;
      let message3;

      it("secondary receives message for each file", () => {
        message1 = await secondaryConnection.waitForNextMessage();
        message2 = await secondaryConnection.waitForNextMessage();
        message3 = await secondaryConnection.waitForNextMessage();
      });

      it("type is newFile for all messages", () => {
        expect(message1.type).toEqual("newFile");
        expect(message2.type).toEqual("newFile");
        expect(message3.type).toEqual("newFile");
      });

      it("id is same as was returned by presignedUrl", () => {
        expect(message1.id).toEqual(file1Id);
        expect(message2.id).toEqual(file2Id);
        expect(message3.id).toEqual(file3Id);
      });

      it("url can be used to download the file", () => {
        // TODO download the file and compare to what was uploaded
      });
      
      it("the size matches the size of the file", () => {
        // TODO check the size returned by the api matches the size of the file uploaded
      });
    }
  });
  */

});

// each secondary uploads a file

// all secondaries and host receives the file (uploaders DO recieve a message for their own file)

// 6th secondary joins and sessionData contains all files so far

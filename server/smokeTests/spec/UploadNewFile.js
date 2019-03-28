const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const request = promisify(require('request'));
const WebSocketHelper = require('./utils/WebSocketHelper');

describe("all basic functionality", function() {
  const url = "wss://blnqhgfs9e.execute-api.eu-central-1.amazonaws.com/Prod/";
  
  let hostConnection = new WebSocketHelper();
  let secondaryConnection1 = new WebSocketHelper();
  let secondaryConnection2 = new WebSocketHelper();
  let secondaryConnection3 = new WebSocketHelper();
  let secondaryConnection4 = new WebSocketHelper();
  let secondaryConnection5 = new WebSocketHelper();
  let secondaryConnections = [secondaryConnection1, secondaryConnection2, secondaryConnection3, secondaryConnection4, secondaryConnection5];


  let photo1;
  let photo1Size;
  let photo2;
  let photo2Size;
  let photo3;
  let photo3Size;

  let sessionId;
  let hostKey;
  let expiry;

  beforeAll(async function() {
    // Open Socket
    await hostConnection.connect(url);
    // Load files to be uploaded
    photo1 = await readFile("spec/resources/photo1.jpg");
    photo2 = await readFile("spec/resources/photo2.jpg");
    photo3 = await readFile("spec/resources/photo3.jpg");
    photo4 = await readFile("spec/resources/photo4.jpg");
  }, 1500)

  let requestHeaders = (filename) => {
    return { 
      "content-disposition" : `attachment; filename="${filename}"`,
      "content-type"        : "image/jpeg"
    };
  }

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
  let file1PutUrl;
  let file2Id;
  let file2PutUrl;
  let file3Id;
  let file3PutUrl;
  let file4Id;
  let file4PutUrl;

  describe("host can upload a file", () => {
    let presignedUrlMessage;

    it("host can request presigned urls for 3 files", async () => {
      hostConnection.sendMessage({type:"uploadInit", files:[
        {filename: "one.jpg", type: "image/jpeg"},
        {filename: "two.jpg", type: "image/jpeg"},
        {filename: "three.jpg", type: "image/jpeg"}
      ]});

      presignedUrlMessage = await hostConnection.waitForNextMessage();
      expect(presignedUrlMessage.type).toEqual("presignedUrl");
    });

    it("message contains generated link and id for each filename", () => {
      let file1 = presignedUrlMessage.presignedUrls['one.jpg'];
      let file2 = presignedUrlMessage.presignedUrls['two.jpg'];
      let file3 = presignedUrlMessage.presignedUrls['three.jpg'];
      file1Id = file1.id;
      file1PutUrl = file1.url;
      expect(file1Id).toMatch(/^[0-9a-f]{32}$/);
      expect(file1PutUrl).toMatch(/.*/);

      file2Id = file2.id;
      file2PutUrl = file2.url;
      expect(file2Id).toMatch(/^[0-9a-f]{32}$/);
      expect(file1PutUrl).toMatch(/.*/);

      file3Id = file3.id;
      file3PutUrl = file3.url;
      expect(file3Id).toMatch(/^[0-9a-f]{32}$/);
      expect(file1PutUrl).toMatch(/.*/);
    })

    it("urls can be used to upload files", async () => {
      let response1 = await request({url: file1PutUrl, method: 'PUT', headers: requestHeaders("one.jpg"), body: photo1});
      expect(response1.statusCode).toEqual(200);

      let response2 = await request({url: file2PutUrl, method: 'PUT', headers: requestHeaders("two.jpg"),  body: photo2});
      expect(response2.statusCode).toEqual(200);

      let response3 = await request({url: file3PutUrl, method: 'PUT', headers: requestHeaders("three.jpg"),  body: photo3});
      expect(response3.statusCode).toEqual(200);
    });

  });

  describe("all clients receive new file events", () => {

    for (let secondaryConnection of secondaryConnections.concat(hostConnection)) {
      let message1;
      let message2;
      let message3;

      it("connection receives message for each file", async () => {
        let m1 = await secondaryConnection.waitForNextMessage();
        let m2 = await secondaryConnection.waitForNextMessage();
        let m3 = await secondaryConnection.waitForNextMessage();

        // sort the ordering
        for (m of [m1, m2, m3]) {
          if (m.name == 'one.jpg') {
            message1 = m;
          }
          if (m.name == 'two.jpg') {
            message2 = m;
          }
          if (m.name == 'three.jpg') {
            message3 = m;
          }
        }

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

      it("the name matches the original of the file", () => {
        expect(message1.name).toEqual('one.jpg');
        expect(message2.name).toEqual('two.jpg');
        expect(message3.name).toEqual('three.jpg');
      });
      
      let fileResponse1;
      let fileResponse2;
      let fileResponse3;

      it("url can be used to download the file", async () => {
        fileResponse1 = await request({url: message1.url});
        expect(fileResponse1.statusCode).toEqual(200);

        fileResponse2 = await request({url: message2.url});
        expect(fileResponse2.statusCode).toEqual(200);

        fileResponse3 = await request({url: message3.url});
        expect(fileResponse3.statusCode).toEqual(200);
      });

      it("the responses have Content-Disposition header", () => {
        expect(fileResponse1.headers['content-disposition']).toEqual("attachment; filename=\"one.jpg\"");
        expect(fileResponse2.headers['content-disposition']).toEqual("attachment; filename=\"two.jpg\"");
        expect(fileResponse3.headers['content-disposition']).toEqual("attachment; filename=\"three.jpg\"");
      });

      it("the responses have Content-Type header", () => {
        expect(fileResponse1.headers['content-type']).toEqual("image/jpeg");
        expect(fileResponse2.headers['content-type']).toEqual("image/jpeg");
        expect(fileResponse3.headers['content-type']).toEqual("image/jpeg");
      });

      // it("the size matches the size of the file", () => {
      //   expect(fileResponse1.body.length).toEqual(message1.size);
      //   expect(fileResponse2.body.length).toEqual(message2.size);
      //   expect(fileResponse3.body.length).toEqual(message3.size);
      // });
      
      // it("the file matches the one uploaded", () => {
      //   expect(fileResponse1.body).toEqual(photo1);
      //   expect(fileResponse2.body).toEqual(photo2);
      //   expect(fileResponse3.body).toEqual(photo3);
      // });
    }
  });


  describe("secondary can upload a file", () => {
    let presignedUrlMessage;
  
    it("secondary can request presigned urls for 1 file", async () => {
      secondaryConnection1.sendMessage({type:"uploadInit", files:[
        {filename: "four.jpg", type: "image/jpeg"},
      ]});

      presignedUrlMessage = await secondaryConnection1.waitForNextMessage();
      expect(presignedUrlMessage.type).toEqual("presignedUrl");
    });

    it("message contains generated link and id", () => {
      let file = presignedUrlMessage.presignedUrls['four.jpg'];
      file4Id = file.id;
      file4PutUrl = file.url;
      expect(file4Id).toMatch(/^[0-9a-f]{32}$/);
      expect(file4PutUrl).toMatch(/.*/);
    })

    it("url can be used to upload files", async () => {
      let response = await request({url: file4PutUrl, method: 'PUT', headers: requestHeaders("four.jpg"), body: photo4});
      expect(response.statusCode).toEqual(200);
    });

    // it("try this", async () => {
      // let message = await secondaryConnection1.waitForNextMessage();
    // });
  });

  describe("Everyone receives the images uploaded by secondaries", () => {
    for (let conn of secondaryConnections.concat(hostConnection)) {
      let message;

      it("connection receives message for each file", async () => {
        message = await conn.waitForNextMessage();
      });

      it("type is newFile", () => {
        expect(message.type).toEqual("newFile");
      });

      it("id is same as was returned by presignedUrl", () => {
        expect(message.id).toEqual(file4Id);
      });

      it("the name matches the original of the file", () => {
        expect(message.name).toEqual('four.jpg');
      });
      
      let fileResponse;

      it("url can be used to download the file", async () => {
        fileResponse = await request({url: message.url});
        expect(fileResponse.statusCode).toEqual(200);
      });

      it("the responses have Content-Disposition header", () => {
        expect(fileResponse.headers['content-disposition']).toEqual("attachment; filename=\"four.jpg\"");
      });

      it("the responses have Content-Type header", () => {
        expect(fileResponse.headers['content-type']).toEqual("image/jpeg");
      });

      // it("the size matches the size of the file", () => {
      //   expect(fileResponse.body.length).toEqual(message4.size);
      // });
      
      // it("the file matches the one uploaded", () => {
      //   expect(fileResponse4.body).toEqual(photo4);
      // });
    }
  });

});

// 6th secondary joins and sessionData contains all files so far

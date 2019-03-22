const WebSocketHelper = require('./utils/WebSocketHelper')

describe("all basic functionality", function() {
  const url = "wss://8h42cerr95.execute-api.eu-central-1.amazonaws.com/Prod/";
  
  let hostConnection = new WebSocketHelper();
  let secondaryConnection1 = new WebSocketHelper();
  let secondaryConnection2 = new WebSocketHelper();
  let secondaryConnection3 = new WebSocketHelper();
  let secondaryConnection4 = new WebSocketHelper();
  let secondaryConnection5 = new WebSocketHelper();
  let secondaryConnections = [secondaryConnection1, secondaryConnection2, secondaryConnection3, secondaryConnection3, secondaryConnection4, secondaryConnection5];

  let sessionId;
  let hostKey;

  beforeAll(async function() {
    // Open Socket
    await hostConnection.connect(url);
  }, 1500)
  
  describe("Host receives session details when they send a newSession message", function() {

    let message;

    beforeAll(async function() {
      hostConnection.sendMessage({type:"newSession"});

      message = await hostConnection.waitForNextMessage();
      sessionId = message.sessionId;
      hostKey = message.hostKey;
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
      it("secondary are able to connect to openSession", async () => {
        hostConnection.sendMessage({type:"secondaryConnect", sessionId:sessionId});

        message = await secondaryConnection.waitForNextMessage();
      });
    }
  });

});
  
// host uploads file

// all secondaries get file

// each secondary uploads a file

// all other secondaries and host receives the file (uploaders do not recieve their own file)

// 6th secondary joins and sessionData contains all files so far

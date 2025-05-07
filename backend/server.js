const { log } = require("console");
const express = require("express");
const path = require("path");
const { Client } = require("pg");

const app = express();

const ESPIP = "192.168.1.71";

app.use(express.json());

const client = new Client({
  host: "db",
  user: "admin",
  password: "admin",
  port: 5432,
  database: "smartlock",
});

const makeLog = async (uid) => {
  const query = `INSERT INTO logs(uid) VALUES(${uid})`;
  client.query(query);
};

const getUserData = async (scanedUid) => {
  const res = await client.query(
    `SELECT username FROM users WHERE uid = ${scanedUid}`
  );

  return res.rows != undefined;
};

const createUser = async (username, uid) => {
  const query = `INSERT INTO users(username, uid) VALUES('${username}',${uid})`;
  client.query(query);
};

const getlogs = async () => {
  const query = "SELECT * FROM logs";
  const res = await client.query(query);

  return res.rows;
};

client
  .connect()
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log("error connecting", err.stack);
  });

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/src/index.html");
});

app.post("/data", async (req, res) => {
  const data = req.body;

  if (data.uid != undefined) {
    console.log("Received data:", data.uid);

    if (data.uid.toString().length < 11) {
      await makeLog(data.uid);

      const validUid = await getUserData(data.uid);

      if (validUid) {
        try {
          fetch("http://" + ESPIP + ":80/unlock")
            .then((response) => {
              if (!response.ok) {
                console.log("ESP not responding:", response.status);
              }
            })
            .catch((error) => {
              console.log("Fetch failed:", error.message);
            });
        } catch (error) {
          console.log("Unexpected error:", error.message);
        }
        console.log("unlocking...");
      } else {
        console.log("invalid UID");
      }

      res.status(200).json({ response: "200 POST recieved", data });
    } else {
      const insultRes = await fetch("https://insult.mattbas.org/api/insult");
      const insult = await insultRes.text();

      res.status(403).json({ response: `403 ${insult}` });
    }
  } else {
    const insultRes = await fetch("https://insult.mattbas.org/api/insult");
    const insult = await insultRes.text();

    res.status(400).json({ response: `403 ${insult}` });
  }
});

app.post("/user", async (req, res) => {
  // Log the received data to the console
  console.log("Received data:", req.body);
  await createUser(req.body.username, req.body.uid);

  // Send a response back to the client
  res.status(200).json({ message: "User added successfully!" });
});

app.get("/logs", async (req, res) => {
  const logs = await getlogs();
  res.json(logs);
});

app.get("/unlock", async (req, res) => {
  try {
    fetch("http://" + ESPIP + ":80/unlock")
      .then((response) => {
        if (!response.ok) {
          console.log("ESP not responding:", response.status);
        }
      })
      .catch((error) => {
        console.log("Fetch failed:", error.message);
      });
  } catch (error) {
    console.log("Unexpected error:", error.message);
  }
  console.log("unlocking...");
  res.status(200).json();
});

app.listen(3000, () => {
  console.log("server listening on 3000");
});

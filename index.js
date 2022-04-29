const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

//dbManagement1
//6TVJJkMKv3aDNDJS

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.poetz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const warehouseManagement = client.db("warehouse").collection("management");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("its a warehouse server");
});

app.listen(port, () => {
  console.log("Warehouse server running", port);
});

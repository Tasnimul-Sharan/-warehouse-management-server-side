const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.poetz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const warehouseCollection = client.db("warehouse").collection("management");
    const itemCollection = client.db("warehouse").collection("item");

    //auth
    app.post("/login", async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });

    //management api
    app.get("/management", async (req, res) => {
      const query = {};
      const cursor = warehouseCollection.find(query);
      const warehouses = await cursor.toArray();
      res.send(warehouses);
    });

    app.get("/management/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const managements = await warehouseCollection.findOne(query);
      res.send(managements);
    });

    app.delete("/management/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await warehouseCollection.deleteOne(query);
      res.send(result);
    });

    app.put("management/:id", async (req, res) => {
      const id = req.params.id;
      const quantity = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: quantity - 1,
          // restock: quantity + 1,
        },
      };
      const result = await warehouseCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.put("management/:data", async (req, res) => {
      const data = req.params.data;
      const quantity = req.body;
      const filter = { _id: ObjectId(data) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          // quantity: quantity - 1,
          quantity: quantity + 1,
        },
      };
      const result = await warehouseCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.get("/item", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = itemCollection.find(query);
      const myItems = await cursor.toArray();
      res.send(myItems);
    });

    app.post("/item", async (req, res) => {
      const myItem = req.body;
      const result = await itemCollection.insertOne(myItem);
      res.send(result);
    });

    app.delete("/item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await itemCollection.deleteOne(query);
      res.send(result);
    });

    // app.post("/item", async (req, res) => {
    //   const myItem = req.body;
    //   const result = await itemCollection.insertOne(myItem);
    //   res.send(result);
    // });
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

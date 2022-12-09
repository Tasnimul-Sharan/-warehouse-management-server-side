const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    console.log("decoded", decoded);
    req.decoded = decoded;
  });
  console.log("inside jwt", authHeader);
  next();
};

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
    const suppliersCollection = client.db("warehouse").collection("supplier");
    const reviewCollection = client.db("warehouse").collection("review");

    app.post("/login", async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });

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

    app.put("/management/:id", async (req, res) => {
      const id = req.params.id;
      const updateQuantity = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: updateQuantity.quantity,
        },
      };
      const result = await warehouseCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // app.put("/management/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const stockQuantity = req.body;
    //   const filter = { _id: ObjectId(id) };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       quantity: stockQuantity.quantity,
    //     },
    //   };
    //   const result = await warehouseCollection.findOneAndUpdate(
    //     filter,
    //     updateDoc,
    //     options
    //   );
    //   res.send(result);
    // });

    app.get("/item", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = itemCollection.find(query);
        const myItems = await cursor.toArray();
        res.send(myItems);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
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

    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.get("/supplier", async (req, res) => {
      const query = {};
      const cursor = suppliersCollection.find(query);
      const suppliers = await cursor.toArray();
      res.send(suppliers);
    });
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

module.exports = app;

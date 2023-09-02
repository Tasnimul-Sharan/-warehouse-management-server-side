require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

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
    const userCollection = client.db("warehouse").collection("user");
    const profileCollection = client.db("warehouse").collection("profile");
    const orderCollection = client.db("warehouse").collection("orders");
    const paymentCollection = client.db("warehouse").collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requestCount = await userCollection.findOne({ email: requester });
      if (requestCount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    };

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

    app.get("/users", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.delete("/management/:id", verifyJWT, async (req, res) => {
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

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });

    app.put("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const profile = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: profile.name,
          education: profile.education,
          location: profile.location,
          phoneNumber: profile.phoneNumber,
          profileLink: profile.profileLink,
        },
      };
      const result = await profileCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };

      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);

      res.send(result);
    });

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

    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const items = await orderCollection.findOne(query);
      res.send(items);
    });

    app.get("/allOrders", verifyJWT, verifyAdmin, async (req, res) => {
      const allOrderss = await orderCollection.find().toArray();
      res.send(allOrderss);
    });

    app.get("/orders", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const myOrders = await cursor.toArray();
        res.send(myOrders);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    app.post("/item", async (req, res) => {
      const myItem = req.body;
      const result = await itemCollection.insertOne(myItem);
      res.send(result);
    });

    app.post("/management", async (req, res) => {
      const items = req.body;
      const result = await warehouseCollection.insertOne(items);
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const myOrder = req.body;
      const result = await orderCollection.insertOne(myOrder);
      res.send(result);
    });

    app.patch("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updateOrder = await orderCollection.updateOne(filter, updateDoc);
      res.send({ updateDoc });
    });

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const items = req.body;
      const price = items.price;
      console.log(price);
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent?.client_secret });
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

    app.patch("/payments/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          paid: true,
          pending: payment.pending,
          status: "shipped",
        },
      };
      const updateOrder = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send({ updateDoc });
    });

    app.get("/supplier", async (req, res) => {
      const query = {};
      const cursor = suppliersCollection.find(query);
      const suppliers = await cursor.toArray();
      res.send(suppliers);
    });
    app.delete("/orders/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    app.delete("/allOrders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
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

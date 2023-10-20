const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());


// MongoDB code snippet

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xeklkbf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();




        const productCollection = client.db("carCollection").collection("car");
        const brandCollection = client.db("carCollection").collection("brandCollection");



        //Get all the products
        app.get("/products", async (req, res) => {
            const query = productCollection.find();
            const result = await query.toArray();
            res.send(result);
        })


        // Get all the brands
        app.get("/brands", async (req, res) => {
            const query = brandCollection.find();
            const result = await query.toArray();
            res.send(result);
        })


        // Get products by brand
        app.get("/products/:brandName", async (req, res) => {
            const brandName = req.params.brandName;
            console.log("I am reaching brand")
            const query = { brandName: brandName };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })


        // Get products by ID
        app.get("/brandProducts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        })


        // Get and update product by ID
        app.get("/updateProducts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        })


        // Post new data into the database
        app.post("/products", async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result)
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



// Checking if the server is running
app.get("/", (req, res) => {
    res.send("Motor Mingle Server is running fine");
})


// Checking the running port
app.listen(port, () => {
    console.log("Motor Mingle Server is running on port:", port)
})
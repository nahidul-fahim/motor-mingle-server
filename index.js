const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        // await client.connect();


        // Database and collection
        const productCollection = client.db("carCollection").collection("car");
        const brandCollection = client.db("carCollection").collection("brandCollection");
        const cartProductsCollection = client.db("carCollection").collection("cartProducts");
        const userListCollection = client.db("carCollection").collection("usersList");



        // JSON realted api
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_WEB_TOKEN, { expiresIn: '1h' });
            res.send({ token });
        })



        // verify token middleware
        const verifyToken = (req, res, next) => {
            const tokenAuthorization = req.headers.authorization;
            if (!tokenAuthorization) {
                return res.status(401).send({ message: 'Unauthorized' })
            }
            const token = tokenAuthorization.split(' ')[1]
            // verify token
            jwt.verify(token, process.env.ACCESS_WEB_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized' })
                }
                req.decoded = decoded;
                console.log(req.decoded, " ---getting from decoded")
                next();
            })
        }




        // verify admin middleware
        // TODO: REMOVE VERIFYADMIN FROM ALL PRODUCTS ROUTE (app.get)
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userListCollection.findOne(query);
            const isAdmin = user?.userType === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: "Forbidden access!" })
            };
            next();
        }



        // post new created user data to databse
        app.post("/newuser", async (req, res) => {
            const newUserInfo = req.body;
            const query = { email: newUserInfo?.email }
            const existingUser = await userListCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "User already exists", insertedId: null })
            }
            else {
                const result = await userListCollection.insertOne(newUserInfo);
                res.send(result);
            }
        })


        // Post new product data into the database
        app.post("/products", verifyToken, verifyAdmin, async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result)
        })


        // Post new data into the Cart Collection database
        app.post("/productsOnCart", verifyToken, async (req, res) => {
            const newProduct = req.body;
            const result = await cartProductsCollection.insertOne(newProduct);
            res.send(result);
        })



        // verify admin middleware
        app.get("/user/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userListCollection.findOne(query);
            if (user.userType === "admin") {
                admin = true;
                res.send({ admin })
            }
        })



        // get the current user
        app.get("/currentuser", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await userListCollection.findOne(query);
            res.send(result);
        })


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
            const query = { brandName: brandName };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })


        // Get product by ID
        app.get("/brandProducts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        })


        // Get a single product
        app.get("/singleproduct", async (req, res) => {
            const id = req.query;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        })


        // Get product from cart collection
        app.get("/productsOnCart/:id", verifyToken, async (req, res) => {
            const currentUserEmail = req.params.id;
            const query = { userEmail: currentUserEmail };
            const result = await cartProductsCollection.find(query).toArray();
            res.send(result);
        })



        // update a product
        app.put("/updateproduct/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const updatedInfo = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedProductInfo = {
                $set: {
                    productName: updatedInfo.productName,
                    brandName: updatedInfo.brandName,
                    carType: updatedInfo.carType,
                    productPrice: updatedInfo.productPrice,
                    rating: updatedInfo.rating,
                    photo: updatedInfo.photo,
                    updateDate: updatedInfo.updateDate,
                    description: updatedInfo.description
                },
            };
            const result = await productCollection.updateOne(filter, updatedProductInfo, options);
            res.send(result)
        })



        // delete a product from all product collection
        app.delete("/deleteproduct/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = productCollection.deleteOne(query);
            res.send(result);
        })




        // Delete a user from cart collection
        app.delete("/productsOnCart/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartProductsCollection.deleteOne(query);
            res.send(result);
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
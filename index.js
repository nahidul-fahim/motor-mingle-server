const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// Middleware
app.use(cors({
    origin: ["http://localhost:5173", "https://motor-mingle.web.app"]
}));
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


        // this is the new database after revamp
        const userListCollection = client.db("carCollection").collection("usersList");
        const productListingsBySellers = client.db("carCollection").collection("oldCarsByUsers");
        const savedAdsListCollection = client.db("carCollection").collection("savedAdsList");
        const feedbackListCollection = client.db("carCollection").collection("allFeedbacks");



        // JSON related api
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
                next();
            })
        }




        // verify admin middleware
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



        // post new created user data to database
        app.post("/newUserApi", async (req, res) => {
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



        // post old product upload by user
        app.post("/newCarSellByUser", verifyToken, async (req, res) => {
            const newProductByUser = req.body;
            const result = await productListingsBySellers.insertOne(newProductByUser);
            res.send(result);
        })


        // post new saved ad to database
        app.post("/newSavedAd", async (req, res) => {
            const newSavedPostInfo = req.body;
            const result = await savedAdsListCollection.insertOne(newSavedPostInfo);
            res.send(result)
        })



        // post feedback by user
        app.post("/userFeedback", async (req, res) => {
            const newFeedback = req.body;
            const result = await feedbackListCollection.insertOne(newFeedback);
            res.send(result);
        })



        // get a single feedback
        app.get("/singleFeedback/:id", async (req, res) => {
            const id = req.params.id;
            const query = { feedbackBy: id };
            const result = await feedbackListCollection.findOne(query);
            res.send(result);
        })



        // get all the feedback
        app.get("/allFeedbacks", async (req, res) => {
            const result = (await feedbackListCollection.find().sort({ _id: -1 }).toArray()).slice(0, 5);
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


        // get single saved ad
        app.get("/getSingleSavedAd/:id", async (req, res) => {
            const id = req.params.id;
            const email = req.query;
            const query = { singleAdId: id, userEmail: email.email };
            const result = await savedAdsListCollection.findOne(query);
            res.send(result);
        })



        // get all the users
        app.get("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
            const userType = "user";
            const query = { userType: userType };
            const result = await userListCollection.find(query).toArray();
            res.send(result);
        })



        // get the current user
        app.get("/currentUser", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await userListCollection.findOne(query);
            res.send(result);
        })


        // get all the listings
        app.get("/allListings", async (req, res) => {
            const result = await productListingsBySellers.find().toArray();
            res.send(result);
        })


        // get paginated listings
        app.get("/filteredListings", async (req, res) => {
            const totalListings = await productListingsBySellers.find().sort({ _id: -1 }).toArray();
            const listingPerPage = parseInt(req.query.listingPerPage);
            const currentPage = parseInt(req.query.currentPage);
            const totalPages = Math.ceil(totalListings.length / listingPerPage)
            const startIndex = (currentPage - 1) * listingPerPage;
            const endIndex = (currentPage) * listingPerPage;
            const paginatedListings = totalListings.slice(startIndex, endIndex);
            res.send({ totalPages, paginatedListings });
        })



        // get sliced listings for homepage
        app.get("/homeListings", async (req, res) => {
            const result = await productListingsBySellers.find().sort({ _id: -1 }).toArray();
            const slicedResult = result.slice(0, 8);
            res.send(slicedResult);
        });



        // get saved items by the users
        app.get("/savedAdsList/:email", async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const result = await savedAdsListCollection.find(query).toArray();
            res.send(result);
        })



        // get specific seller listings
        app.get("/listings/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email };
            const result = await productListingsBySellers.find(query).toArray();
            res.send(result);
        })


        // Get a single listing
        app.get("/singleListing/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productListingsBySellers.findOne(query);
            res.send(result);
        })



        // update verification request for a user
        app.put("/updateUserDetails/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedDetails = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: {} };

            // update request status
            if (updatedDetails.requestUpdate) {
                updateDoc.$set.verificationRequest = updatedDetails.requestUpdate
            }
            // update verification status
            if (updatedDetails.updatedVerifyStatus) {
                updateDoc.$set.verifyStatus = updatedDetails.updatedVerifyStatus
            }
            // update phone
            if (updatedDetails.phone) {
                updateDoc.$set.phone = updatedDetails.phone
            }
            // update address
            if (updatedDetails.address) {
                updateDoc.$set.address = updatedDetails.address
            }
            const result = await userListCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })



        // update seller verification status in the product list
        app.put("/updateSellerVerification/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const updatedVerificationStatus = req.body;
            const filter = { sellerId: id };
            const updateStatus = {
                $set: {
                    sellerVerificationStatus: updatedVerificationStatus.updatedVerifyStatus
                }
            };
            const result = await productListingsBySellers.updateMany(filter, updateStatus);
            res.send(result);
        })



        // update a listing
        app.put("/updateListing/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedInfo = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    carName: updatedInfo.carName,
                    carBrand: updatedInfo.carBrand,
                    carType: updatedInfo.carType,
                    price: updatedInfo.price,
                    carCondition: updatedInfo.carCondition,
                    purchasingDate: updatedInfo.purchasingDate,
                    description: updatedInfo.description,
                    photo: updatedInfo.photo,
                    approvalStatus: updatedInfo.approvalStatus,
                    addingDate: updatedInfo.addingDate,
                    manufactureYear: updatedInfo.manufactureYear,
                    engineCapacity: updatedInfo.engineCapacity,
                    totalRun: updatedInfo.totalRun,
                    fuelType: updatedInfo.fuelType,
                    transmissionType: updatedInfo.transmissionType,
                    registeredYear: updatedInfo.registeredYear,
                    sellerPhone: updatedInfo.sellerPhone,
                },
            };
            const result = await productListingsBySellers.updateOne(filter, updatedDoc, options);
            res.send(result)
        })



        // update a sell status of a listing
        app.put("/updateSellStatus/:id", async (req, res) => {
            const id = req.params.id;
            const updatedSellInfo = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    sellStatus: updatedSellInfo.sellStatus,
                },
            };
            const result = await productListingsBySellers.updateOne(filter, updatedDoc, options);
            res.send(result)
        })



        // delete a single saved ad
        app.delete("/removedSavedAd/:id", async (req, res) => {
            const id = req.params.id;
            const email = req.query;
            const query = { singleAdId: id, userEmail: email.email };
            const result = await savedAdsListCollection.deleteOne(query);
            res.send(result);
        })



        // Delete a product from collections of seller post
        app.delete("/allCarsListing/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productListingsBySellers.deleteOne(query);
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
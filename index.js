const express = require('express');
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
// middleware 
app.use(cors());
app.use(express.json());

// doctors-portal-firebase-adminsdk



const serviceAccount = require("./doctors-portal-firebase-adminsdk.json");
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7niub.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(uri);
// verify token function
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(" ")[1];


        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;

        }
        catch {

        }
    }



    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db("doctors-portal");
        const appointmentsCollection = database.collection('appoinments');
        const usersCollection = database.collection('users');

        app.get("/appointments", verifyToken, async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;


            // const date = format(new Date(req.query.date).getDate() - 1, 'MM-dd-yy');


            const query = { email: email, date: date };
            const cursor = appointmentsCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);
            res.json(result)
        });


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        })
        app.put("/users", async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const option = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, option)
            res.json(result);
        })

        app.put("/users/admin", verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;

            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === "Admin") {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'Admin' } }
                    const result = await usersCollection.updateOne(filter, updateDoc)
                    res.json(result);
                }

            }
            else {
                res.status(401).json({ message: "you do not have access to make an admin portal" });
            }



        })

        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === "Admin") {
                isAdmin = true;
            }
            res.json({ admin: isAdmin })
        })
    }
    finally {
        // await client.close();
    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Doctors portal Server')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
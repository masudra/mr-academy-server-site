const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorization access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    
    if (err) {
      return res.status(403).send({ error: true, message: 'forbidden  access' });
    }
    req.decoded = decoded;
    next()
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xyvppop.mongodb.net/?retryWrites=true&w=majority`;

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
    const classCollection = client.db('mrAcademy').collection('classes');
    const studentSelectCollection = client.db('mrAcademy').collection('studentSelect');
    const userCollection = client.db('mrAcademy').collection('user');

    // JWT 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    // varyfi Admin 
    const verifyAdmin = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'forbidden message '});
      }
      next();
    }


    // varyfi instructor
    const verifyInstructor = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const result = await userCollection.findOne(query);
      if(user?.role !== 'instructor'){
        return res.status(403).send({error: true, message: 'forbidden message '});
      }
      next();
    }

    // user Releted Apis
    // get all users
    app.get('/users', verifyJWT,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    // verifyInstructor
    app.get('/users', verifyJWT,verifyInstructor, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })


    // Creat Users One 
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User Already Exist' })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })




    // Make Admin ***************

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);

    })


    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    // Make Instructor 

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' };
      res.send(result);

    })


    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })




    //  classes Apis
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result)
    })

    app.post('/classes', async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item)
      res.send(result)
    })

    app.get('/classes',async(req,res)=>{
      console.log(req.query.email)
      let query ={};
      if(req.query?.email){
        query ={Email: req.query?.email}
      }
      const result = await classCollection.find(query).toArray();
      res.send(result)
    })

    // Student Seleted  Releted Apis
    // get student seleted  all data 
    app.get('/studentSelect', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }
      const query = { email: email }
      const result = await studentSelectCollection.find(query).toArray()

      res.send(result)
    })


    //  get one student selected data
    app.post('/studentSelect', async (req, res) => {
      const item = req.body;
      const result = await studentSelectCollection.insertOne(item)
      res.send(result)
    })

    // Dellet one Student seleted data
    app.delete('/studentSelect/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await studentSelectCollection.deleteOne(query)
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





app.get('/', (req, res) => {
  res.send('Hellow World')
})

app.listen(port, () => {
  console.log(`port is running on ${port}`);
})


require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//var encrypt = require("mongoose-encryption");
//var md5 = require("md5");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const ejs = require('ejs');
const app = express();

app.set('view engine','ejs');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));

// if you want to change the port change here
const port = 3000;

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required:true,
        unique: true
    },
    password: {
        type: String,
        required:true
    }
  });

  //var secret = process.env.SECRET;
  //userSchema.plugin(encrypt, { secret:secret, encryptedFields:['password'] });

  const User = mongoose.model('User',userSchema);

// GET REQUESTS
app.get('/',function (req,res){
    res.render('home');
});

app.get('/login',function (req,res){
    res.render('login');
});

app.get('/register',function (req,res){
    res.render('register');
});

app.get('/api/users',async (req,res)=>{
    try{
        const allUsers = await User.find({});
        res.status(200).json(allUsers)
    } catch (err){
        console.log(err);
        res.status(500).json(err)
    }
})

// POST REQUESTS
app.post("/register", async (req,res)=>{

    bcrypt.hash(req.body.password, saltRounds,async function(err, hash) {
        const newUser = new User({
            username: req.body.username,
            password: hash
        });
    
        try{
            await newUser.save();
            res.status(200).redirect('/')
        } catch (err) {
            console.log(err);
            res.status(500).json(err)
        }
    });
})

app.post('/login', async (req,res)=> {
    try{
        const reqUsername = req.body.username;
        const reqUserPass = req.body.password;

        const stored = await User.findOne({username:reqUsername});
        
        bcrypt.compare(reqUserPass, stored.password, function(err, result) {
            if(result === true){
                res.status(200).render('secrets');
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json(err)
    }
})

const connectDB = async () => {
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/secretsDB");
      console.log("Connected to MongoDB!");
    } catch (err) {
      throw err;
    }
  };

app.listen(process.env.PORT || port, () => {
    console.log("Server is running at port: " + port + "/" + process.env.PORT)
    connectDB();
  });
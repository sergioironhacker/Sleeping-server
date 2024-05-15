const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const jwtSecret = 'gg';
const imageDownloader = require('image-downloader');
const multer = require('multer')
const fs = require('fs')
const path = require('path');


const Place = require('./models/Place')
const User = require('./models/user');
const Booking = require('./models/Booking.js');


mongoose.connect(process.env.MONGO_URL);


app.use(express.json());
app.use(cookieParser());
console.log("Ruta del directorio de subidas:", path.join(__dirname, 'uploads'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));



app.get('/test', (req, res) => {
    res.json('test ok');
});




app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        const userDoc = await User.create({
            name,
            email,
            password: hashedPassword,
        });
        res.json(userDoc);
    } catch (error) {
        res.status(422).json({ error: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email });

    if (userDoc) {
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign({
                email: userDoc.email,
                id: userDoc._id,

            }, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json(userDoc);
            });
        } else {
            res.status(422).json({ error: 'Contraseña incorrecta' });
        }
    } else {
        res.status(404).json({ error: 'Usuario no encontrado' });
    }
});


app.get('/profile', (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {token} = req.cookies;
    if (token) {
      jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const {name,email,_id} = await User.findById(userData.id);
        res.json({name,email,_id});
      });
    } else {
      res.json(null);
    }
  });



app.post('/logout', (req, res) => {
    res.cookie('token', '').json(true)
})






app.post('/upload-by-link', async (req, res) => {
    const { link } = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    const destinationPath = path.join(__dirname, 'uploads', newName);
    
    await imageDownloader.image({
        url: link,
        dest: destinationPath,
    });
    res.json(newName);
});



const photosMiddleware = multer({ dest: 'uploads' });

app.post('/upload', photosMiddleware.array('photos', 100), async (req, res) => {
    const uploadedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
        const { path, originalname } = req.files[i];
        console.log("Uploaded file:", originalname); // Log 
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1]; // 
        const newName = 'photo' + Date.now() + '.' + ext; 
        const newPath = path + '.' + ext; 
        fs.renameSync(path, newPath); 
        uploadedFiles.push(newName); 
    }
    res.json(uploadedFiles); 
});



    app.post('/places', (req,res) => {
        mongoose.connect(process.env.MONGO_URL);
        const {token} = req.cookies;
        const {
          title,address,addedPhotos,description,price,
          perks,extraInfo,checkIn,checkOut,maxGuests,
        } = req.body;
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
          if (err) throw err;
          const placeDoc = await Place.create({
            owner:userData.id,price,
            title,address,photos:addedPhotos,description,
            perks,extraInfo,checkIn,checkOut,maxGuests,
          });
          res.json(placeDoc);
        });
      });


      app.get('/places/:id', async (req,res) => {
        mongoose.connect(process.env.MONGO_URL);
        const {id} = req.params;
        res.json(await Place.findById(id));
      });
      



      app.get('/user-places', (req,res) => {
        mongoose.connect(process.env.MONGO_URL);
        const {token} = req.cookies;
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
          const {id} = userData;
          res.json( await Place.find({owner:id}) );
        });
      });




      app.put('/places', async (req,res) => {
        mongoose.connect(process.env.MONGO_URL);
        const {token} = req.cookies;
        const {
          id, title,address,addedPhotos,description,
          perks,extraInfo,checkIn,checkOut,maxGuests,price,
        } = req.body;
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
          if (err) throw err;
          const placeDoc = await Place.findById(id);
          if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
              title,address,photos:addedPhotos,description,
              perks,extraInfo,checkIn,checkOut,maxGuests,price,
            });
            await placeDoc.save();
            res.json('ok');
          }
        });
      });


      app.post('/bookings', async (req, res) => {
        mongoose.connect(process.env.MONGO_URL);
        const userData = await getUserDataFromReq(req);
        const {
          place,checkIn,checkOut,numberOfGuests,name,phone,price,
        } = req.body;
        Booking.create({
          place,checkIn,checkOut,numberOfGuests,name,phone,price,
          user:userData.id,
        }).then((doc) => {
          res.json(doc);
        }).catch((err) => {
          throw err;
        });
      });
      
      function getUserDataFromReq(req) {
        return new Promise((resolve, reject) => {
          jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            resolve(userData);
          });
        });
      }
      
      
      app.get('/bookings', async (req,res) => {
        mongoose.connect(process.env.MONGO_URL);
        const userData = await getUserDataFromReq(req);
        res.json( await Booking.find({user:userData.id}).populate('place') );
      });


app.listen(4000, () => {
    console.log('Servidor Express en funcionamiento en el puerto 4000 💛💚🧡💙💜🤎🖤');
});

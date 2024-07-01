const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { User, Property } = require('./schemas');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

const mongoUrl = 'mongodb+srv://shivarammittakola:LubPSfYqTtSEsnrb@helpdeskfb.wkwxabo.mongodb.net/test';


mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Failed to connect to MongoDB Atlas', err));

app.get('/', (req, res) => {
    res.send('Hello World! Database connection successful.');
});

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hashedPassword,
            phoneNumber: req.body.phoneNumber,
            role: req.body.role
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, 'yourSecretKey', { expiresIn: '1h' }); // Change 'yourSecretKey' to your secret key

        res.send({
            message: "User registered successfully",
            token: token,
            id: user._id.toString()
        });
    } catch (error) {
        console.error('Error occurred during registration:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).send('User not found');
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).send('Invalid password');
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, role:user.role }, "yourSecret", { expiresIn: '1h' }); // Change 'yourSecret' to your secret key
    
        console.log(user.role);
        res.send({
            message: "User logged in successfully",
            token: token,
            role: user.role,
            id: user._id.toString()
        });
    } catch (error) {
        console.error('Error occurred during login:', error);
        res.status(500).send('Internal Server Error');
    }
}
);


app.post('/property', async (req, res) => {
    try {
        const property = new Property(req.body);
        const user = await User.findById(req.body.seller);
        if (!user) {
            return res.status(400).send('Seller not found');
        }
        user.properties.push(property._id);
        await user.save();
        await property.save();
        res.send({
            message: "Property added successfully",
            id: property._id.toString()
        });
    } catch (error) {
        console.error('Error occurred while adding property:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/allProperties', async (req, res) => {
    try {
        const properties = await Property.find();
        res.send(properties);
    } catch (error) {
        console.error('Error occurred while fetching properties:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/getUserProperties/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate if the ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send('Invalid User ID');
        }

        // Find the user by ID
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch properties based on the array of property IDs in the user document
        const properties = await Property.find({ _id: { $in: user.properties } });

        // Return the properties array
        res.send(properties);
    } catch (error) {
        console.error('Error occurred while fetching user properties:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/getUser/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(400).send('User not found');
        }

        res.send(user);
    } catch (error) {
        console.error('Error occurred while fetching user:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/addProperty/:id', async (req, res) => {   //id is of user
    try {
        const {
            place,
            area,
            bedrooms,
            bathrooms,
            hospitals,
            colleges,
            parking,
            propertyType,
            description,
            price,
            yearBuilt,
            totalFloors,
            amenities,
            furnishedStatus
        } = req.body;

        // Get seller ID from authenticated user (you might need to modify this based on your authentication setup)
        const sellerId = req.params.id; 

        // Create new property
        const newProperty = new Property({
            place,
            area,
            bedrooms,
            bathrooms,
            hospitals,
            colleges,
            parking,
            propertyType,
            description,
            price,
            yearBuilt,
            totalFloors,
            amenities,
            furnishedStatus,
            seller: sellerId
        });

        // Save property to database
        await newProperty.save();

        // Update seller's properties array
        await User.findByIdAndUpdate(sellerId, {
            $push: { properties: newProperty._id }
        });

        res.status(201).json({ message: 'Property added successfully', property: newProperty });
    } catch (error) {
        console.error('Error adding property:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/deleteProperty/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(400).send('Property not found');
        }

        const user = await User.findById(property.seller);
        if (!user) {
            return res.status(400).send('User not found');
        }

        user.properties.pull(property._id);
        await user.save();
        await property.remove();

        res.send('Property deleted successfully');
    } catch (error) {
        console.error('Error occurred while deleting property:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/updateProperty/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(400).send('Property not found');
        }

        await Property.findByIdAndUpdate(req.params.id, req.body);
        res.send('Property updated successfully');
    } catch (error) {
        console.error('Error occurred while updating property:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/likeProperty/:id', async (req, res) => {
    try {
        const userId = req.user.userId; // Now you can access userId from req.user
        const propertyId = req.params.id;

        const property = await Property.findById(propertyId);
        const user = await User.findById(userId);

        if (!property) {
            return res.status(404).send('Property not found');
        }

        const isLiked = user.likedProperties.includes(propertyId);

        if (isLiked) {
            user.likedProperties.pull(propertyId); // Remove the property ID from likedProperties
            property.likes -= 1; // Decrement the likes count
        } else {
            user.likedProperties.push(propertyId); // Add the property ID to likedProperties
            property.likes += 1; // Increment the likes count
        }

        await user.save(); // Save the user document
        await property.save(); // Save the property document

        res.json({ likes: property.likes, liked: !isLiked });
    } catch (error) {
        console.error('Error occurred while liking property:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/isPropertyLiked/:propertyId', async (req, res) => {
    try {
        const propertyId = req.params.propertyId;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        const isLiked = user.likedProperties.includes(propertyId);

        res.json({ liked: isLiked });
    } catch (error) {
        console.error('Error occurred while checking liked property:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

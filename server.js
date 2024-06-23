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
//const mongoUrl = 'mongodb+srv://gsnagc5022:UpcJyLq7L00p5h4t@cluster0.scdenlt.mongodb.net/test';

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
        const token = jwt.sign({ userId: user._id }, "yourSecret", { expiresIn: '1h' }); // Change 'yourSecret' to your secret key
    
        console.log(await user.role);
        res.send({
            message: "User logged in successfully",
            token: token,
            role: await user.role,
            id: await user._id.toString()
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
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).send('Property not found');
        }
        property.likes += 1;
        await property.save();
        res.send(property);
    } catch (error) {
        console.error('Error occurred while liking property:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

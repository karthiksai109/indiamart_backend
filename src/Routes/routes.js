const express = require('express');
const { default: mongoose } = require("mongoose");

const userModel = require("../Models/userModel");
const router = express.Router();
const Product=require('../Models/productModel')
const Cart=require('../Models/cartModel')
const { registerUser, getUser, updateUsers, login } = require('../Controllers/userController');
const{isAuthentication}=require('../Middlewares/commonMiddleware')

//=======APIs for User=========
router.post("/register",  registerUser);
router.post("/login", login);
router.get('/user/:userId/profile', isAuthentication, getUser);

//==========API for Products======
var user=[]
router.post('/padd', async (req, res) => {
    try {
        const { name, category, price, description, imageUrl, stock } = req.body;

        if (!name || !category || !price || !stock) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        const newProduct = new Product({ name, category, price, description, imageUrl, stock });
        await newProduct.save();
        res.status(201).json({ message: 'Product added successfully', product: newProduct });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product', error: error.message });
    }
});

// Search Products
router.get('/products', async (req, res) => {
    try {
        const { name, category } = req.query;
        const query = {};

        if (name) query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
        if (category) query.category = { $regex: category, $options: 'i' };

        const products = await Product.find(query);
        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ message: 'Error searching products', error: error.message });
    }
});

// View All Products
router.get('/allp', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving products', error: error.message });
    }
});



//==================================API for cart=================================


// Add Product to Cart
router.post('/cadd', async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;

        if (!userId || !productId || !quantity) {
            return res.status(400).json({ message: 'User ID, Product ID, and Quantity are required' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if the product is already in the user's cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const existingProductIndex = cart.products.findIndex(p => p.productId.toString() === productId);
        if (existingProductIndex >= 0) {
            cart.products[existingProductIndex].quantity += quantity;
        } else {
            cart.products.push({ productId, quantity });
        }

        await cart.save();
        res.status(200).json({ message: 'Product added to cart', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product to cart', error: error.message });
    }
});



// View Cart
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await Cart.findOne({ userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        res.status(200).json({ cart });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving cart', error: error.message });
    }
});




// Set Budget
router.post('/user/:userId/budget', isAuthentication, async (req, res) => {
    try {
        const { userId } = req.params;
        const { budget } = req.body;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (userId !== req.token) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        user.budget = budget;
        await user.save();

        res.status(200).json({ message: "Budget updated successfully", budget: user.budget });
    } catch (error) {
        res.status(500).json({ message: "Error updating budget", error: error.message });
    }
});

// Get Budget
router.get('/user/:userId/budget', isAuthentication, async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (userId !== req.token) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        res.status(200).json({ budget: user.budget });
    } catch (error) {
        res.status(500).json({ message: "Error fetching budget", error: error.message });
    }
});


router.get('/user/:userId/cart/check-budget', isAuthentication, async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (userId !== req.token) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        const cart = await Cart.findOne({ userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const cartTotal = cart.products.reduce((total, product) => {
            return total + product.quantity * product.productId.price;
        }, 0);

        if (cartTotal > user.budget) {
            return res.status(400).json({ message: "Cart total exceeds budget", cartTotal, budget: user.budget });
        }

        res.status(200).json({ message: "Cart is within budget", cartTotal, budget: user.budget });
    } catch (error) {
        res.status(500).json({ message: "Error validating cart against budget", error: error.message });
    }
});
router.post('/budget-check', async (req, res) => {
    try {
        const { budget, items } = req.body;

        if (!budget || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Budget and item list are required" });
        }

        const products = await Product.find({ name: { $in: items } });
        const availableItems = [];
        const missingItems = [];
        let totalCost = 0;

        items.forEach(item => {
            const product = products.find(p => p.name.toLowerCase() === item.toLowerCase());
            if (product) {
                if (totalCost + product.price <= budget) {
                    availableItems.push(product);
                    totalCost += product.price;
                }
            } else {
                missingItems.push(item);
            }
        });

        res.status(200).json({
            availableItems,
            missingItems,
            totalCost,
            budget,
            withinBudget: totalCost <= budget
        });
    } catch (error) {
        res.status(500).json({ message: "Error checking budget", error: error.message });
    }
});




module.exports = router
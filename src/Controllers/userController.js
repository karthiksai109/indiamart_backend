const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { default: mongoose } = require("mongoose");

const userModel = require("../Models/userModel");
const { validateName, validateEmail, validateMobileNo, validatePassword, validatePlace, validatePincode } = require("../Validator/validator");




const registerUser = async function (req, res) {
    try {
        res.setHeader("Access-Control-Allow-Origin", "*");
        const body = req.body;
        const { fname, lname, email, password, address } = body;

        if (Object.keys(body).length === 0) {
            return res.status(400).send({ status: false, message: "Request body can't be empty." });
        }// if you havent entered any feild
        else if(!fname){
            return res.status(400).send({status:false,message:'please enter firstname'})
        }
        else if(!validateName(fname)) {
            return res.status(400).send({ status: false, message: "please enter valid firstname" });
        }
        else if(!lname){
            return res.status(400).send({status:false,message:'please enter lastname'})
        }
        else if(!validateName(lname)){
            return res.status(400).send({status:false,message:'please enter valid lastname'})
        }
        else if(!email){
            return res.status(400).send({status:false,message:'please enter email'})
        }
        else if(!validateEmail(email)){
            return res.status(400).send({status:false,message:'please enter valid email'})
        }
        else if(!password){
            return res.status(400).send({status:false,message:'please enter password'})
        }
        else if(!validatePassword(password)){
            return res.status(400).send({status:false,message:'please enter valid password'})
        }


        else if(!address){
            return res.status(400).send({status:false,message:'please enter address'})
        }
     
        const hashedPassword = bcrypt.hashSync(password, 10);
        body.password = hashedPassword;

        const registerUser = await userModel.create(body);
        const { __v, ...otherData } = registerUser._doc;

        res.status(201).send({ status: true, message: "User created successfully", data: otherData });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};





const login = async function (req, res) {
    try {
        res.setHeader("Access-Control-Allow-Origin", "*");
        const { email, password } = req.body;
        

        if (!email || typeof email !== "string" || !validateEmail(email.trim())) {
            return res.status(400).send({ status: false, message: "Please enter a valid Email." });
        }

        if (!password || typeof password !== "string") {
            return res.status(400).send({ status: false, message: "Password is required and must be a string." });
        }

        const user = await userModel.findOne({ email: email.trim() });
        if (!user) {
            return res.status(404).send({ status: false, message: "No such user exists." });
        }

        // Compare hashed password
        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res.status(401).send({ status: false, message: "Invalid credentials." });
        }

        const token = jwt.sign({ userId: user._id }, "NKTCGROUPTHREEPROJECTFIVE", { expiresIn: "10h" });

        return res.status(200).send({ status: true, message: "Login successful", data: { userId: user._id, token, name: user.fname } });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};




const getUser = async function (req, res) {
    try {
        const userId = req.params.userId;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid user Id." });
        }

        if (!req.token || userId !== req.token) {
            return res.status(403).send({ status: false, message: "You are not authorized to access this resource." });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found." });
        }

        res.status(200).send({ status: true, message: "User profile details", data: user });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};






const updateUsers = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Validate userId
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId." });
        }

        // Authorization check
        if (userId !== req.token) {
            return res.status(403).send({ status: false, message: "You are not authorized to update this profile." });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found." });
        }

        const data = req.body;

        if (Object.keys(data).length === 0) {
            return res.status(400).send({ status: false, message: "No data provided for update." });
        }

        const { fname, lname, email, password, address } = data;

        // Validate and update first name
        if (fname) {
            if (typeof fname !== "string" || !validateName(fname.trim())) {
                return res.status(400).send({ status: false, message: "Invalid first name." });
            }
            user.fname = fname.trim();
        }

        // Validate and update last name
        if (lname) {
            if (typeof lname !== "string" || !validateName(lname.trim())) {
                return res.status(400).send({ status: false, message: "Invalid last name." });
            }
            user.lname = lname.trim();
        }

        // Validate and update email
        if (email) {
            if (typeof email !== "string" || !validateEmail(email.trim())) {
                return res.status(400).send({ status: false, message: "Invalid email." });
            }
            const emailExists = await userModel.findOne({ email });
            if (emailExists) {
                return res.status(400).send({ status: false, message: "Email is already in use." });
            }
            user.email = email.trim();
        }

        // Validate and update password
        if (password) {
            if (typeof password !== "string" || !validatePassword(password.trim())) {
                return res.status(400).send({
                    status: false,
                    message: "Password must be 8-15 characters and include mixed characters with special characters.",
                });
            }
            user.password = bcrypt.hashSync(password.trim(), 10);
        }

       
        const updatedUser = await user.save();

        res.status(200).send({
            status: true,
            message: "User updated successfully.",
            data: updatedUser,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ status: false, message: "An error occurred during the update process.", error: err.message });
    }
};








const updateOrders = async function (req, res) {
    try {
        const userId = req.params.userId;
        console.log(userId)

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid user Id." });
        }

        if (!req.token || userId !== req.token) {
            return res.status(403).send({ status: false, message: "You are not authorized to access this resource." });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).send({ status: false, message: "User not found." });
        }

        // Increment orders by 1 in DB
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $inc: { orders: 1 } },
            { new: true } // Return the updated document
        );
        console.log(updatedUser.orders)

        return res.status(200).send({
            status: true,
            message: "User order count updated successfully",
            data: { userId: updatedUser._id, orders: updatedUser.orders }
        });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};


module.exports = { registerUser, updateUsers, getUser, login,updateOrders };

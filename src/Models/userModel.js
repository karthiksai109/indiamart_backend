const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    fname: {
        type: String,
        required: true,
        trim: true
    },
    lname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    }, 
    address: {
        type: String,
        required: true,
        trim: true
    },
    budget: { type: Number, default: 0 }, // New budget field


}, { timestamps: true });

module.exports = mongoose.model("UserData", userSchema);
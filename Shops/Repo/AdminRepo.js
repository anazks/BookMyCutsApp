console.log("ADMINREPO LOADED - Govind test 123");
const express = require('express');
const UserModel = require('../../Auth/Model/UserModel');
const ShoperModel = require('../../Auth/Model/ShoperModel');
const ShopModel = require('../Model/ShopModel');
const BookingModel = require('../../Booking/Models/BookingModel');

module.exports.fetchDashboardStats = async () => {
    try {
        const usersCount = await UserModel.countDocuments({});
        const shopOwnersCount = await ShoperModel.countDocuments({});
        const shopsCount = await ShopModel.countDocuments({});
        const todayBookings = await BookingModel.find({
        createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
        });
        return {
            usersCount,
            shopOwnersCount,
            shopsCount,
            todayBookings
        }
    } catch (error) {
        console.log(error)
    }
}
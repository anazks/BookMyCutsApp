const express = require('express')
const { fetchDashboardStats } = require('../Repo/AdminRepo')


const getDashboardStats = async (req,res)  => {
  try {
     const stats = await fetchDashboardStats()
   if(stats){
    res.status(200).json({
        success:true,
        message:"successfully get dashboard stats",
        stats
    })
   }else{
    res.status(404).json({
        success:false,
        message:"failed to get dashboard stats"
    })
   }
  } catch (error) {
    console.log(error)
    res.stats(500).json({
        success:false,
        message:"internal server error"
    })
  }
}

module.exports = { getDashboardStats }
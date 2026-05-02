const express = require('express')
const { fetchDashboardStats, fetchTransactionLogs } = require('../Repo/AdminRepo')


const getTransactionLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      stage,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    const result = await fetchTransactionLogs({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // cap at 100 per page
      stage,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder: parseInt(sortOrder)
    });

    res.status(200).json({
      success: true,
      message: 'Transaction logs fetched successfully',
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching transaction logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

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

module.exports = { getDashboardStats, getTransactionLogs }
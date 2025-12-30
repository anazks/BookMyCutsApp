const express = require('express');
const router = express.Router({ mergeParams: true });
const { createWorkingHours,getShopWorkingHours,updateWorkingHours,deleteWorkingHours } = require('../Controller/WorkingHoursController')

router.route('/addWorkingHours').post(createWorkingHours)
router.route('/getWorkingHoursByShop/:id').get(getShopWorkingHours)
router.route('/updateWorkingHours').put(updateWorkingHours)
router.route('/deleteWorkingHours/:shopId').delete(deleteWorkingHours)

module.exports = router
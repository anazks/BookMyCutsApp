const express = require('express');
const router = express.Router();
const {upsertPayoutAccount,getEarningsSummary} = require('../Controller/PayoutController')


router.route('/accounts').post(upsertPayoutAccount)
router.route('/earnings').get(getEarningsSummary)

module.exports = router

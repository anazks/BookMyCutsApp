const axios = require('axios');

async function testInsecureWebhook() {
  const url = 'http://localhost:3002/api/booking/webhook/razorpay';
  const payload = JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_insecure',
          amount: 50000,
          notes: {
            bookingId: '65f1234567890abcdef12345'
          }
        }
      }
    }
  });

  console.log('Sending INSECURE test webhook (no signature)...');

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
        // No x-razorpay-signature header
      }
    });
    console.log('Response Status:', response.status);
    console.log('Response Body:', response.data);
  } catch (error) {
    console.error('Error Status:', error.response?.status);
    console.error('Error Body:', error.response?.data);
  }
}

testInsecureWebhook();

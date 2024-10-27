const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.listen(3001, () => {
    console.log('Listening to port 3001');
})

app.get("/", (req, res) => {
    res.send("eSewa Payment Integration");
})


function generateHmacSha256Hash(data, secret) {
  if (!data || !secret) {
    throw new Error("Both data and secret are required to generate a hash.");
  }

const hash = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64");

  return hash;
}

function safeStringify(obj) {
  const cache = new Set();
  const jsonString = JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (cache.has(value)) {
        return; // Discard circular reference
      }
      cache.add(value);
    }
    return value;
  });
  return jsonString;
}

// eSewa Configuration //Later we will serve it from .env 
const esewaConfig = {
    merchantId: "EPAYTEST", // Replace with your eSewa Merchant ID
    successUrl: "http://localhost:5173/payment-success", //Replace with front-end success route page
    failureUrl: "http://localhost:5173/payment-failure", //Replace with front-end failure route page
    esewaPaymentUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    secret: "8gBm/:&EnhH.1/q",
  };

app.post("/initiate-payment", async (req, res) => {
    const { amount, productId } = req.body;

  let paymentData = {
    amount,
    failure_url: esewaConfig.failureUrl,
    product_delivery_charge: "0",
    product_service_charge: "0",
    product_code: esewaConfig.merchantId,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    success_url: esewaConfig.successUrl,
    tax_amount: "0",
    total_amount: amount,
    transaction_uuid: productId,
  };

  const data = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;

  const signature = generateHmacSha256Hash(data, esewaConfig.secret); 
  console.log(signature);

  paymentData = { ...paymentData, signature };
  try {
    const payment = await axios.post(esewaConfig.esewaPaymentUrl, null, {
      params: paymentData,
    });

    const reqPayment = JSON.parse(safeStringify(payment));
    if (reqPayment.status === 200) {
        console.log("Success");
      return res.send({
        url: reqPayment.request.res.responseUrl,
      });
    }
  } catch (error) {
    res.send(error);
  }
})
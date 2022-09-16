const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const multer = require('multer');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/category');
const productRoutes = require('./routes/product');
const optionRoutes = require('./routes/option');
const locationRoutes = require('./routes/location');
const transferRoutes = require('./routes/transfer');
const salesTaxRoutes = require('./routes/salesTax');
const creditNoteRoutes = require('./routes/creditNote');
const debitNoteRoutes = require('./routes/debitNote');
const invoiceRoutes = require('./routes/invoice');
const paymentRoutes = require('./routes/payment');
const expenseRoutes = require('./routes/expense');
const purchaseRoutes = require('./routes/purchase');
const billRoutes = require('./routes/bill');
const contactRoutes = require('./routes/contact');
const sellerRoutes = require('./routes/seller');
const macRoutes = require('./routes/mac');
const groupRoutes = require('./routes/group');
const quoteRoutes = require('./routes/quote');
const accountRoutes = require('./routes/account');
const notificationRoutes = require('./routes/notification');
const websiteUserRoutes = require('./routes/websiteUser');
const websiteAdminRoutes = require('./routes/websiteAdmin');

const app = express();
const dbURI =
  'mongodb+srv://nicolas:NWbY85NcQXQ6bQh@test-database.48eqo.mongodb.net/test-database';

const storage = multer.diskStorage({
  destination: './assets',
  filename: (req, file, cb) => {
    cb(null, file.fieldname + path.extname(file.originalname));
  }
});

app.use(helmet());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Authorization');

  next();
});




app.use(
  multer({ storage: storage }).single('file')
);

app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/mac', macRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/option', optionRoutes);
app.use('/api/product', productRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/tax', salesTaxRoutes);
app.use('/api/credit', creditNoteRoutes);
app.use('/api/debit', debitNoteRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/bill', billRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/website/user', websiteUserRoutes);
app.use('/api/website/admin', websiteAdminRoutes);



app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true
  })
  .then(succes => {
    app.listen(process.env.PORT || 3000);
    console.log('Database connected.');
  })
  .catch(err => console.log(err));

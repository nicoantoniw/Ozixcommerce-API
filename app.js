const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/category');
const productRoutes = require('./routes/product');
const saleRoutes = require('./routes/sale');
const afipRoutes = require('./routes/afip');
const purchasesRoutes = require('./routes/purchase');
const personRoutes = require('./routes/person');
const sellerRoutes = require('./routes/seller');
const macRoutes = require('./routes/mac');
const groupRoutes = require('./routes/group');
const orderRoutes = require('./routes/order');

const app = express();
const dbURI =
  'mongodb+srv://nicolas:surfinGLife30@node-database-bac9y.mongodb.net/commerce-test';

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

app.use('/api/auth', authRoutes);
app.use('/api/person', personRoutes);
app.use('/api/mac', macRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/product', productRoutes);
app.use('/api/sale', saleRoutes);
app.use('/api/afip', afipRoutes);
app.use('/api/purchase', purchasesRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/order', orderRoutes);

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
    app.listen(process.env.PORT || 8080);
    console.log('Database connected.');
  })
  .catch(err => console.log(err));

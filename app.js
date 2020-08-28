const path = require('path');

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const multer = require('multer');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/category');
const productRoutes = require('./routes/product');
const optionRoutes = require('./routes/option');
const locationRoutes = require('./routes/location');
const transferRoutes = require('./routes/transfer');
const invoiceRoutes = require('./routes/invoice');
const purchasesRoutes = require('./routes/purchase');
const personRoutes = require('./routes/person');
const sellerRoutes = require('./routes/seller');
const macRoutes = require('./routes/mac');
const groupRoutes = require('./routes/group');
const quoteRoutes = require('./routes/quote');
const accountRoutes = require('./routes/account');
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
app.use('/api/person', personRoutes);
app.use('/api/mac', macRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/option', optionRoutes);
app.use('/api/product', productRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/purchase', purchasesRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/account', accountRoutes);
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

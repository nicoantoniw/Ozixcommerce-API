const jwt = require('jsonwebtoken');

exports.isAdmin = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secretwordnamedzoerottweiler');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  if (decodedToken.status !== 'active' || decodedToken.role !== 'admin' &&
    decodedToken.role !== 'super') {
    const error = new Error('Not authorized.');
    error.statusCode = 403;
    throw error;
  }
  req.userId = decodedToken.userId;
  req.groupId = decodedToken.groupId;
  next();
};

exports.isSeller = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated header.');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secretwordnamedzoerottweiler');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated token.');
    error.statusCode = 401;
    throw error;
  }

  if (
    decodedToken.status !== 'active' ||
    (decodedToken.role !== 'seller' && decodedToken.role !== 'admin' &&
      decodedToken.role !== 'super')
  ) {
    const error = new Error('Not authorized.');
    error.statusCode = 403;
    throw error;
  }
  req.userId = decodedToken.userId;
  req.groupId = decodedToken.groupId;
  next();
};

exports.isUser = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secretwordnamedzoerottweiler');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  if (
    decodedToken.status !== 'active' ||
    (decodedToken.role !== 'seller' &&
      decodedToken.role !== 'admin' &&
      decodedToken.role !== 'user' &&
      decodedToken.role !== 'super')
  ) {
    const error = new Error('Not authorized.');
    error.statusCode = 403;
    throw error;
  }
  req.userId = decodedToken.userId;
  req.groupId = decodedToken.groupId;
  next();
};

exports.isSuper = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secretwordnamedzoerottweiler');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  if (decodedToken.role !== 'super') {
    const error = new Error('Not authorized.');
    error.statusCode = 403;
    throw error;
  }
  req.userId = decodedToken.userId;
  req.groupId = decodedToken.groupId;
  next();
};


exports.isPrime = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secretwordnamedzoerottweiler');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  if (decodedToken.plan !== 'prime') {
    const error = new Error('Not authorized.');
    error.statusCode = 403;
    throw error;
  }
  req.userId = decodedToken.userId;
  req.groupId = decodedToken.groupId;
  next();
};

exports.isWebsiteUser = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secretwordnamedzoerottweiler');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated.');
    error.statusCode = 401;
    throw error;
  }
  req.userId = decodedToken.userId;
  req.email = decodedToken.email;
  req.groupId = decodedToken.groupId;
  req.clientId = decodedToken.clientId;
  next();
};
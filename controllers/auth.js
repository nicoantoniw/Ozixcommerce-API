const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const macaddress = require('macaddress');

const User = require('../models/user');
const WebsiteUser = require('../models/websiteUser');
const Group = require('../models/group');
const Mac = require('../models/mac');
const Person = require('../models/person');

exports.login = async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const group = await Group.findById(user.group);
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error('Password incorrect');
      error.statusCode = 401;
      throw error;
    }
    if (user.role !== 'admin' && user.role !== 'super') {
      const macAddress = macaddress.one(function (err, mac) {
        return mac;
      });
      const address = await Mac.findOne({ address: macAddress, creator: group._id });
      if (!address) {
        const error = new Error('Not authorized in this device');
        error.statusCode = 403;
        throw error;
      }
    }
    const token = jwt.sign(
      {
        username: user.username,
        role: user.role,
        status: user.status,
        plan: group.plan,
        userId: user._id.toString(),
        groupId: user.group._id.toString()
      },
      'secretwordnamedzoerottweiler',
      { expiresIn: '12h' }
    );
    res.status(200).json({
      token: token,
      userId: user._id.toString(),
      groupId: user.group.toString(),
      role: user.role,
      status: user.status,
      plan: group.plan
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activateUserStatus = async (req, res, next) => {
  const userStatusId = req.params.userStatusId;
  try {
    const user = await User.findById(userStatusId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    user.status = 'active';
    await user.save();
    res.status(200).json({ message: 'User activated.' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivateUserStatus = async (req, res, next) => {
  const userStatusId = req.params.userStatusId;
  try {
    const user = await User.findById(userStatusId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    user.status = 'inactive';
    await user.save();
    res.status(200).json({ message: 'User deactivated.' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  const username = req.body.username;
  const groupId = req.body.group;
  const password = req.body.password;
  const role = req.body.role;
  try {
    const hashedPw = await bcrypt.hash(password, 12);
    const group = await Group.findById(groupId);
    const user = new User({
      username,
      password: hashedPw,
      role,
      group: groupId
    });
    group.users.push(user);
    await user.save();
    await group.save();
    res.status(200).json({ message: 'User created' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.websiteLogin = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    if (email === 'liliana') {
      const user = await User.findOne({ username: email });
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      const group = await Group.findById(user.group);
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
        const error = new Error('Password incorrect');
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: user.username,
          userId: user._id.toString(),
          groupId: user.group._id.toString(),
          role: user.role,
          status: user.status
        },
        'secretwordnamedzoerottweiler',
        { expiresIn: '6h' }
      );
      res.status(200).json({
        token,
        email: user.username,
        userId: user._id.toString(),
        groupId: user.group.toString(),
        role: user.role
      });
    } else {
      const user = await WebsiteUser.findOne({ email: email });
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      const group = await Group.findById(user.group);
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
        const error = new Error('Password incorrect');
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: user.email,
          userId: user._id.toString(),
          groupId: user.group._id.toString(),
          clientId: user.clientId
        },
        'secretwordnamedzoerottweiler',
        { expiresIn: '6h' }
      );
      res.status(200).json({
        token,
        userId: user._id.toString(),
        email: user.email,
        groupId: user.group._id.toString(),
        clientId: user.clientId
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.websiteSignup = async (req, res, next) => {
  const email = req.body.email;
  const groupId = '5eb9d8dcdb624f0a8b7822cb';
  const password = req.body.password;
  const name = req.body.name;
  const surname = req.body.surname;
  const id = req.body.id;
  const phone = req.body.phone;
  const address = req.body.address;
  const province = req.body.province;
  const city = req.body.city;
  const zip = req.body.zip;
  let regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const result = regex.test(email);
  if (!result) {
    const error = new Error('Email incorrect');
    error.statusCode = 422;
    next(error);
  }
  try {
    const websiteUser = await WebsiteUser.findOne({ email: email });
    if (websiteUser) {
      const error = new Error('The user already exists');
      error.statusCode = 605;
      throw error;
    }
    const hashedPw = await bcrypt.hash(password, 12);
    const group = await Group.findById(groupId);
    const user = new WebsiteUser({
      email,
      password: hashedPw,
      group: group._id,
      name,
      surname,
      idNumber: id,
      phone,
      cart: {
        items: [],
        total: 0
      },
      address,
      province,
      city,
      zip
    });
    group.websiteUsers.push(user);

    const person = new Person({
      name: `${name} ${surname}`,
      type: 'customer',
      description: 'Cliente de pagina web',
      numberId: id,
      address: `${address} ${province} ${city} ${zip}`,
      phoneNumber: phone,
      email: email,
      creator: '5ea9c4a058eb5371b70d4dc6'
    });
    await group.save();
    await person.save();
    user.clientId = person._id;
    await user.save();
    res.status(200).json({ message: 'User Created' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
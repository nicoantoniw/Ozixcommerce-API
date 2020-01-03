const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const Group = require('../models/group');

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

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
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
  const groupId = req.body.group
  const password = req.body.password;
  const role = req.body.role;
  try {
    const hashedPw = await bcrypt.hash(password, 12);
    const group = await Group.findById(groupId);
    const user = new User({
      username,
      password: hashedPw,
      role,
      group: group._id
    });
    await user.save();
    res.status(200).json({ message: 'User created' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }

}
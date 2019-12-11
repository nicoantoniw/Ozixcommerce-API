const { validationResult } = require('express-validator');

const Person = require('../models/person');

exports.getCustomers = async (req, res, next) => {
  try {
    const totalCustomers = await Person.find({
      creator: req.groupId,
      type: 'customer'
    }).countDocuments();
    const customers = await Person.find({
      creator: req.groupId,
      type: 'customer'
    })
      .populate('creator', {
        name: 1,
        _id: 1
      })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

    if (totalCustomers === 0) {
      const error = new Error('No customers found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      customers: customers,
      totalCustomers: totalCustomers
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSuppliers = async (req, res, next) => {
  try {
    const totalSuppliers = await Person.find({
      creator: req.groupId,
      type: 'supplier'
    }).countDocuments();
    const suppliers = await Person.find({
      creator: req.groupId,
      type: 'supplier'
    })
      .populate('creator', {
        name: 1,
        _id: 1
      })
      .sort({ createdAt: -1 });
    // .skip((currentPage - 1) * perPage)
    // .limit(perPage);

    if (totalSuppliers === 0) {
      const error = new Error('No suppliers found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      suppliers: suppliers,
      totalSuppliers: totalSuppliers
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPerson = async (req, res, next) => {
  const personId = req.params.personId;
  try {
    const person = await Person.findOne({
      _id: personId,
      creator: req.groupId
    }).populate('creator', {
      name: 1,
      _id: 1
    });
    if (!person) {
      const error = new Error('No person found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.listCustomer = async (req, res, next) => {
  try {
    let value = req.query.value;
    const customer = await Person.find(
      {
        type: 'customer',
        $or: [
          { 'name': new RegExp(value, 'i') },
          { 'lastName': new RegExp(value, 'i') },
          { 'numberId': new RegExp(value, 'i') },
          { 'email': new RegExp(value, 'i') }
        ]
      },
      { createdAt: 0 }
    )
      .populate('creator', { name: 1, _id: 1 });
    res.status(200).json({
      customer: customer
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.listSupplier = async (req, res, next) => {
  try {
    let value = req.query.value;
    const supplier = await Person.find(
      {
        type: 'supplier',
        $or: [

          { 'name': { $regex: value, $options: 'i' } },
          { 'lastName': { $regex: value, $options: 'i' } },
          { 'company': { $regex: value, $options: 'i' } },
          { 'numberId': { $regex: value, $options: 'i' } },
          { 'email': { $regex: value, $options: 'i' } },
        ]
      },
      { createdAt: 0 }
    ).populate('creator', { name: 1, _id: 1 });
    res.status(200).json({
      supplier: supplier
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addPerson = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const calculatedAge = getAge(req.body.birth);
  const person = new Person({
    name: req.body.name,
    lastName: req.body.lastName,
    birth: req.body.birth,
    age: calculatedAge,
    type: req.body.type,
    company: req.body.company,
    typeId: req.body.typeId,
    numberId: req.body.numberId,
    address: req.body.address,
    phoneNumber: req.body.phoneNumber,
    email: req.body.email,
    creator: req.groupId
  });
  try {
    await person.save();
    res.status(200).json({
      message: 'Person created.',
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePerson = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const personId = req.params.personId;
  try {
    const person = await Person.findById(personId).populate('creator');
    if (!person) {
      const error = new Error('Could not find any person');
      error.statusCode = 404;
      throw error;
    }
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    const calculatedAge = getAge(req.body.birth);
    person.name = req.body.name;
    person.lastName = req.body.lastName;
    person.birth = req.body.birth;
    person.age = calculatedAge;
    person.type = req.body.type;
    person.company = req.body.company;
    person.typeId = req.body.typeId;
    person.numberId = req.body.numberId;
    person.address = req.body.address;
    person.phoneNumber = req.body.phoneNumber;
    person.email = req.body.email;
    await person.save();
    res.status(200).json({
      message: 'Person updated.',
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.activatePerson = async (req, res, next) => {
  const personId = req.params.personId;
  try {
    const person = await Person.findById(personId);
    if (!person) {
      const error = new Error('Could not find any person');
      error.statusCode = 404;
      throw error;
    }
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    person.status = 'active';
    await person.save();
    res.status(200).json({
      message: 'Person has been activated',
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deactivatePerson = async (req, res, next) => {
  const personId = req.params.personId;
  try {
    const person = await Person.findById(personId);
    if (!person) {
      const error = new Error('Could not find any person');
      error.statusCode = 404;
      throw error;
    }
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    person.status = 'inactive';
    await person.save();
    res.status(200).json({
      message: 'Person has been deactivated',
      person: person
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePerson = async (req, res, next) => {
  const personId = req.params.personId;
  try {
    const person = await Person.findById(personId);
    if (!person) {
      const error = new Error('Could not find any person');
      error.statusCode = 404;
      throw error;
    }
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized.');
      error.statusCode = 403;
      throw error;
    }
    await Person.findByIdAndRemove(personId);
    res.status(200).json({
      message: 'Person deleted'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addDebt = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const personId = req.params.personId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const type = req.body.type;
  const data = {
    debt: debt,
    description: description,
    typeDebt: type
  };
  try {
    const person = await Person.findById(personId);
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    person.account.push(data);
    person.totalDebt += data.debt;
    await person.save();
    res.status(200).json({
      message: 'Debt created.',
      data: data
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.subtractDebt = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const personId = req.params.personId;
  const debt = Number(req.body.debt);
  const description = req.body.description;
  const type = req.body.type;
  const data = {
    debt: debt,
    description: description,
    typeDebt: type
  };
  try {
    const person = await Person.findById(personId);
    if (person.creator._id.toString() !== req.groupId) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    person.account.push(data);
    person.totalDebt -= data.debt;
    await person.save();
    res.status(200).json({
      message: 'Debt created.',
      data: data
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const getAge = date => {
  const today = new Date();
  const birth = new Date(date);
  const age = today.getFullYear() - birth.getFullYear();
  return age;
};

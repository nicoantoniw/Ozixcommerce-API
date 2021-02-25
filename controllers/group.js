const fs = require('fs');

const aws = require('aws-sdk');
const path = require('path');

const Group = require('../models/group');


exports.getGroups = async (req, res, next) => {
    try {
        const groups = await Group.find();
        if (!groups) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            groups
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getGroup = async (req, res, next) => {
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            group
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addGroup = async (req, res, next) => {
    const name = req.body.name;
    const plan = req.body.plan;

    try {
        const group = new Group({
            name,
            plan
        });
        await group.save();
        res.status(200).json({ message: 'Group created' });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};

exports.updateBusinessInfo = async (req, res, next) => {
    try {
        const group = await Group.findById(
            req.groupId
        );
        if (!group) {
            const error = new Error('No group found');
            error.statusCode = 404;
            throw error;
        }
        group.name = req.body.group.name;
        group.legalName = req.body.group.legalName;
        group.idNumber = req.body.group.idNumber;
        group.industry = req.body.group.industry;
        group.contactDetails.phone = req.body.group.contactDetails.phone;
        group.contactDetails.email = req.body.group.contactDetails.email;
        group.contactDetails.customerFacingEmail = req.body.group.contactDetails.customerFacingEmail;
        group.contactDetails.website = req.body.group.contactDetails.website;
        group.companyAddress.state = req.body.group.companyAddress.state;
        group.companyAddress.city = req.body.group.companyAddress.city;
        group.companyAddress.streetAddress = req.body.group.companyAddress.streetAddress;
        group.companyAddress.zip = req.body.group.companyAddress.zip;
        group.customerFacingAddress.state = req.body.group.customerFacingAddress.state;
        group.customerFacingAddress.city = req.body.group.customerFacingAddress.city;
        group.customerFacingAddress.streetAddress = req.body.group.customerFacingAddress.streetAddress;
        group.customerFacingAddress.zip = req.body.group.customerFacingAddress.zip;

        await group.save();
        res.status(200).json({
            group,
            message: 'Data updated'
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.addLogo = async (req, res, next) => {
    const groupId = req.groupId;
    let data;
    const s3 = new aws.S3({
        accessKeyId: 'AKIAUEN42P7LBOUCJDJF',
        secretAccessKey: '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',
        Bucket: 'ozixcommerce.com-images'
    });
    const ext = req.file.originalname.split('.').pop();
    // const file = fs.readFileSync(`/home/ubuntu/apps/Ozixcommerce-API/assets/file.${ext}`);
    const file = fs.readFileSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/file.${ext}`);
    if (ext === 'jpg') {
        ext2 = 'jpeg';
    } else {
        ext2 = 'png';
    }
    const params = {
        Bucket: 'ozixcommerce.com-images',
        acl: 'public-read',
        Key: `${Date.now()}-${req.file.originalname}`,
        Body: file,
        ContentType: `image/${ext2}`
    };
    try {
        const group = await Group.findById(groupId);
        s3.upload(params, (err, data) => {
            if (err) {
                throw err;
            }
            group.logo = {
                url: data.Location,
                key: data.Key
            };
            group.hasLogo = true;
            group.save().then(success => {
                // fs.unlinkSync(`/home/ubuntu/apps/Ozixcommerce-API/assets/file.${ext}`);
                fs.unlinkSync(`/home/nicolas/Documents/dev/Projects/Ozix/Ozixcommerce/app/api/assets/file.${ext}`);
                res.status(200).json({
                    message: 'Logo uploaded'
                });
            }).catch(err => console.log(err));
        });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
};
const express = require('express');
const { body } = require('express-validator');

const notificationController = require('../controllers/notification');
const auth = require('../middleware/is-auth');

const router = express.Router();

router.get('/notifications', auth.isAdmin, notificationController.getNotifications);
router.get('/notifications5', auth.isAdmin, notificationController.getFirst5Notifications);
router.get(
    '/notifications/:notificationId',
    auth.isUser,
    notificationController.getNotification
);
router.post(
    '/add',
    auth.isAdmin,
    notificationController.addNotification
);
router.put(
    '/mark-as-read/:notificationId',
    auth.isAdmin,
    notificationController.markAsRead
);
router.delete(
    '/delete/:notificationId',
    auth.isAdmin,
    notificationController.deleteNotification
);

module.exports = router;

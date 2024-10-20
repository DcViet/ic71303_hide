'use strict';

const controller = {};
const passport = require('./passport');
const models = require('../models');
const { where } = require('sequelize');

// const emailValidation = body('email')
//     .trim().notEmpty().withMessage('Email is required!')
//     .isEmail().withMessage('Invalid email address!');

// const passwordValidation = body('password')
//     .trim().notEmpty().withMessage('Password is required!')
//     .matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/)
//     .withMessage('Password must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters');


controller.show = (req, res) => {

    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('login', { loginMessage: req.flash('loginMessage'), reqUrl: req.query.reqUrl, registerMessage:  req.flash('registerMessage') });
}

controller.login = (req, res, next) => {
    let keepSignedIn = req.body.keepSignedIn; //lay thong tin tu req.body xem user muon keepsignedin hay k
    let reqUrl = req.body.reqUrl ? req.body.reqUrl : '/users/my-account'; //chuyen huong sau khi user dang nhap
    let cart = req.session.cart; 
    // xem cau hinh local-login trong passport.js , goi ham callback (error,user) sau khi hoan thanh, neu ok thi user da xac thuc, k co user thi tra lai thong bao
    passport.authenticate('local-login', (error, user) => {
        if (error) {
            return next(error);
        }
        if (!user) {
            return res.redirect(`/users/login?reqUrl=${reqUrl}`);
        }
        //ham cua passport: thiet lap time song cua cookie
        req.logIn(user, (error) => {
            if (error) { return next(error); }
            req.session.cookie.maxAge = keepSignedIn ? (24 * 60 * 60 * 1000) : null;
            // neu chon keepsignedin: time song cookie 1 ngay hoac nguoc lai: null
            req.session.cart = cart;
            return res.redirect(reqUrl); //bien reqUrl de chuyen huong
        });
    })(req, res, next);

}

controller.logout = (req, res, next) => {
    let cart = req.session.cart;
    req.logout((error) => {
        if (error) { return next(error); }
        req.session.cart = cart;
        res.redirect('/');
    });
}

controller.isLoggedIn = (req, res, next) => {

    if(req.isAuthenticated()){
        return next();
    }
    res.redirect(`/users/login?reqUrl=${req.originalUrl}`);
}

controller.register = (req, res, next) => {
    let reqUrl = req.body.reqUrl ? req.body.reqUrl : '/users/my-account';
    let cart = req.session.cart;
    passport.authenticate('local-register', (error, user) => {
        if (error) { return next (error); }
        if (!user) { return res.redirect(`/users/login?reqUrl=${reqUrl}`); }
        req.logIn(user, (error) => {
            if (error) { return next (error); }
            req.session.cart = cart;
            res.redirect(reqUrl);
        })

    }) (req, res, next);
}

controller.showForgotPassword = (req, res) => {

    res.render('forgot-password');
}
controller.forgotPassword = async (req, res) => {
    let email = req.body.email;
    // kiem tra email ton tai
    let user = await models.User.findOne({where: { email } });
    if (user) {
        const { sign } = require('.jwt');
        const host = req.header('host');
        const resetLink =`${req.protocol}://${host}/users/reset?token=${sign(email)}&email=${email}`;
        const {sendForgotPasswordMail } = require('./mail');
        sendForgotPasswordMail(user, host, resetLink)
        .then ((result) => {
            console.log('email has been sent');
            return res.render('forgot-password', { done: true});
        })
        .catch (error => {
            console.log(error.statusCode);
            return res.render('forgot-password', {message: 'An error has occured when sending to your email. Please check your email address!'});
        });

    } else {
        return res.render('forgot-password', { message: 'Email does not exist!' });
    }
    // tao link 
    // Gui mail
    // Thong bao
    // nguoc lai, thong bao email ko ton tai
}

controller.showResetPassword = (req, res) => {

    let email = req.query.email;
    let token = req.query.token;
    let { verify } = require('./jwt'); //xac thuc token bang jwt
    if (!token || !verify(token)) {
        return res.render('reset-password', { expired: true });
    } else {
        return res.render('reset-password');
    }
}

controller.resetPassword = async (req, res) => {
    let email = req.body.email;
    let token = req.body.token;
    let bcrypt = require('bcrypt');
    let password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8)); //them muoi va bam mat khau

    await models.User.update({ password }, { where: { email } });
    res.render('reset-password', { done: true });

}

module.exports = controller;
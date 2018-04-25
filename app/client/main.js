import { Users } from '/collections/Users';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

/*************************************************************/
/*********************** MAIN TEMPLATE ***********************/
/*************************************************************/

Template.main.onCreated(function() {
    Session.set('currentUser', '');
});

Template.main.helpers({
    getCurrentUser() {
        return Session.get('currentUser');
    },
});

/*************************************************************/
/********************** LOGIN TEMPLATE ***********************/
/*************************************************************/

Template.login.onCreated(function() {
    this.loginError = new ReactiveVar("please enter your username");
    this.signupError = new ReactiveVar("please enter your username");
});

Template.login.onRendered(function() {
    $('#enterUsername').focus();
});

Template.login.helpers({
    getLoginError() {
        return Template.instance().loginError.get();
    },
    getSignupError() {
        return Template.instance().signupError.get();
    },
});

Template.login.events({
    'submit #login-user': function(event) {
        event.preventDefault();
        $("#ins-one").css("visibility", "hidden");
        $('#signup-error').css('display', 'none');

        var newUsername = event.target.loginUser.value;

        if(newUsername) {
            var userExists = Users.find({ username: newUsername }).count();

            if(userExists) {
                Session.set('currentUser', newUsername);

                $('#login-error').css('display', 'none');
            }
            else {
                Template.instance().loginError.set("username does not exist");
                $('#login-error').css('display', 'block');
            }
        }
        else {
            Template.instance().loginError.set("please enter your username");
            $('#login-error').css('display', 'block');
        }
    },
    'submit #signup-user': function(event) {
        event.preventDefault();
        $("#ins-two").css("visibility", "hidden");
        $('#login-error').css('display', 'none');

        var newUsername = event.target.signupUser.value;

        if(newUsername) {
            var userExists = Users.find({ username: newUsername }).count();

            if(userExists) {
                Template.instance().signupError.set("username already exists");
                $('#signup-error').css('display', 'block');
            }
            else {
                Session.set('currentUser', newUsername);

                Meteor.call('addUser', newUsername);

                $('#signup-error').css('display', 'none');
            }
        }
        else {
            Template.instance().signupError.set("please enter your username");
            $('#signup-error').css('display', 'block');
        }
    },
    'keyup #enterUsername': function(event) {
        $("#ins-two").css("visibility", "hidden");

        if(event.keyCode != 13) {
            $('#login-error').css('display', 'none');
            $('#signup-error').css('display', 'none');
        }

        if(event.keyCode == 13) {
            $("#ins-one").css("visibility", "hidden");
        }
        else {
            var input = $.trim($("#enterUsername").val());
            if(input) {
                $("#ins-one").css("visibility", "visible");
            }
            else {
                $("#ins-one").css("visibility", "hidden");
            }
        }
    },
    'click #new-user': function() {
        $("#enter-new-username").css("visibility", "visible");
        $('#enter-new-username').focus();
        $("#new-user").css("visibility", "hidden");
        $('#login-error').css('display', 'none');
    },
    'keyup #enter-new-username': function(event) {
        if(event.keyCode != 13) {
            $('#signup-error').css('display', 'none');
        }

        if(event.keyCode == 13) {
            $("#ins-one").css("visibility", "hidden");
        }
        else {
            var input = $.trim($("#enter-new-username").val());
            if(input) {
                $("#ins-one").css("visibility", "visible");
            }
            else {
                $("#ins-one").css("visibility", "hidden");
            }
        }
    },
});

/*************************************************************/
/*********************** GAME TEMPLATE ***********************/
/*************************************************************/

Template.game.onCreated(function() {
    this.currScore = new ReactiveVar(0);
});

Template.game.onRendered(function() {
    initGame(Template.instance(), Session, Meteor);
});

Template.game.helpers({
    getCurrentUser() {
        return Session.get('currentUser');
    },
    getHighScore() {
        return Users.findOne({ username: Session.get('currentUser') }).highScore;
    },
    getCurrScore() {
        return Template.instance().currScore.get();
    },
    getTopScores() {
        return Users.find({}, { sort: { highScore: -1 }, limit: 5 }).fetch();
    },
});

Template.game.events({
    'click #logout': function(event) {
        event.preventDefault();

        Session.set('currentUser', '');
    },
	'click #help-btn': function() {
        $("#keys").html("<p>w - forward</p><p>a - left</p><p>s - back</p><p>d - right</p><p>space - jump</p>");
	},
});

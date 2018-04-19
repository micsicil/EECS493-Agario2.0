import { Users } from '/collections/Users';
import { Meteor } from 'meteor/meteor';

Meteor.startup(function() {

	return Meteor.methods({
		clearUsers: function() {
			Users.remove({});
		},
		addUser: function(newUsername) {
			Users.insert({
				username: newUsername,
				highScore: 0
			});
		},
		updateHighScore: function(user, newScore) {
			var currUser = Users.findOne({ username: user });

			if(newScore > currUser.highScore) {
				Users.update(currUser, {
					$set: { highScore: newScore },
				});
			}
		},
	});
});

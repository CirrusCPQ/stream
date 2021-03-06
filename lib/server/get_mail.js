var Imap = require('imap'),
		MailParser = require('mailparser').MailParser



module.exports = function(userScope,email,password){
	GetEmail.initImap(email,password);
	GetEmail.initUserVars(userScope);
	GetEmail.connectToInbox();
}

function die(err) {
  console.log('Uh oh: ' + err);
  process.exit(1);
}
var GetEmail = {
	_imap : undefined,
	_lastRead : new Date(new Date().setDate(new Date().getDate()-1)),
	_user : undefined,
	initImap : function(email,password) {
		GetEmail._imap = new Imap({
			user 		: email,
			password: password,
			host		: 'imap.gmail.com',
			port 		: 993,
			secure	: true
		});
	},

	initUserVars : function(userScope) {
		var lastRead = userScope.get('emailsLastReadAt');
		if(lastRead) {
			GetEmail._lastRead = lastRead	;
		}
		GetEmail._user = userScope;
	},

	connectToInbox : function(){
		console.log('Connecting to inbox');
		GetEmail._user.set('reading', true);
		GetEmail._imap.connect(GetEmail.openInbox);
	},

	openInbox : function(err) {
		console.log('Opening inbox');
		if(err) die(err);
		GetEmail._imap.openBox('INBOX', true, GetEmail.searchInbox)
	},

	searchInbox : function(err, mailbox){
		console.log('Searching inbox');
		if(err) die(err);
		GetEmail._imap.search(['ALL', ['SINCE',GetEmail._lastRead.toString()]], GetEmail.fetchEmails)
	},

	fetchEmails : function(err, results) {
		console.log('Fetching Emails')
		if(err) die(err);
		GetEmail._imap.fetch(results, {
			headers: {parse:false},
			body: true,
			cb : function(fetch) {
				fetch.on('message', function(message) {
					mailparser = new MailParser();

          mailparser.on('end',function(mailObj){
            // console.log(mailObj);
            console.log("----New Email----");
            console.log('From: '+mailObj.from[0].address)
            console.log('Subject: '+mailObj.subject)
            console.log('Headers: '+mailObj.headers.date)
            GetEmail._user.push('messages', mailObj);
          });

          message.on('data',function(chunk){
            mailparser.write(chunk.toString());
          });
          
          message.on('end',function(){
            mailparser.end();
          });
				});
			}}, function(){
				GetEmail._user.set('emailsLastReadAt', new Date);
				GetEmail._user.set('reading', false);
			}
		);
	}
};
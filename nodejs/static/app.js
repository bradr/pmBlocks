$('#confirm-delete').on('show.bs.modal', function(e) {
    $(this).find('.btn-ok').attr('href', $(e.relatedTarget).data('href'));
});

$('#usertable').editableTableWidget();

$('table td').on('change', function(evt, newValue) {
  var element = $(this);
  if (element.index()===0) {
    return false;
  } else {
    alert("hello");
  }
});

jQuery(function ($) {
	'use strict';

	Handlebars.registerHelper('eq', function(a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		}

	};

	var App = {
		init: function () {
			this.cacheElements();
			this.bindEvents();

		},
		cacheElements: function () {
      this.$loginButtons = $('#loginButtons');
      this.$p6login = this.$loginButtons.find('#p6login');
      this.$tmweblogin = this.$loginButtons.find('#tmweblogin');

      this.$superuser = $('#superuser');
        this.$orgTable = this.$superuser.find('#orgTable');
        this.$addOrg = $('#addOrg');
        this.$neworg = $('#neworg');
        this.$org = this.$neworg.find('#org');
        this.$user = this.$neworg.find('#user');
        this.$email = this.$neworg.find('#email');
        this.$addOrgButton = this.$addOrg.find('#addOrgButton');
        this.$incrTM = $("a[name=incrTM]");
        this.$decrTM = $("a[name=decrTM]");
        this.$incrPM = $("a[name=incrPM]");
        this.$decrPM = $("a[name=decrPM]");

      this.$users = $('#users');
      //  this.$
        this.$addTMUser = $('#addTMUser');
        this.$addPMUser = $('#addPMUser');
        this.$addTMUserButton = this.$addTMUser.find('#addUserButton');
        this.$addPMUserButton = this.$addPMUser.find('#addUserButton');
        this.$pmTable = this.$users.find('#pmusers');
        this.$tmTable = this.$users.find('#timewriters');
        this.$newTMuser = this.$addTMUser.find('#newuser');
        this.$newPMuser = this.$addPMUser.find('#newuser');
        this.$TMuser = this.$newTMuser.find('#user');
        this.$TMemail = this.$newTMuser.find('#email');
        this.$PMuser = this.$newPMuser.find('#user');
        this.$PMemail = this.$newPMuser.find('#email');
        this.$newTMUserError = this.$addTMUser.find('#error');
        this.$newPMUserError = this.$addPMUser.find('#error');

		},
		bindEvents: function () {
      this.$addTMUserButton.on('click', this.addTimewriter.bind(this));
      this.$addPMUserButton.on('click', this.addPM.bind(this));
      this.$addOrgButton.on('click', this.addOrg.bind(this));
      this.$p6login.on('click', this.p6login.bind(this));
      this.$tmweblogin.on('click', this.tmweblogin.bind(this));
      this.$incrTM.on('click', this.incrTM.bind(this, event));
      this.$decrTM.on('click', this.decrTM.bind(this, event));
      this.$incrPM.on('click', this.incrPM.bind(this, event));
      this.$decrPM.on('click', this.decrPM.bind(this, event));
		},

    switchAdminUser: function() {

    },
    incrTM: function() {
      var _this = this;
      $.ajax({
        type: 'PUT',
        url: '/service/org/'+event.target.id,
        contentType: "application/json",
        data: JSON.stringify({action:'+', val:'Timewriterlicenses'}),
        complete: function() {
          console.log('success');
          $.get('/service/User/ReadOrgs',function(result) {
            _this.render(_this.$orgTable,'orgTable',{ org:JSON.stringify(result) });
            console.log(JSON.stringify(result));
          });
        }
      });
    },
    decrTM: function() {
      var _this = this;
      console.log('decrTM:');
      $.ajax({
        type: 'PUT',
        url: '/service/org/'+event.target.id,
        contentType: "application/json",
        data: JSON.stringify({action:'-', val:'Timewriterlicenses'}),
        complete: function() {
          console.log('success');
          $.get('/service/User/ReadOrgs',function(result) {
            _this.render(_this.$orgTable,'orgTable',{ org:JSON.stringify(result) });
            console.log(JSON.stringify(result));
          });
        }
      });
    },
    incrPM: function() {
      var _this = this;
      $.ajax({
        type: 'PUT',
        url: '/service/org/'+event.target.id,
        contentType: "application/json",
        data: JSON.stringify({action:'+', val:'PMlicenses'}),
        complete: function() {
          console.log('success');
          $.get('/service/User/ReadOrgs',function(result) {
            _this.render(_this.$orgTable,'orgTable',{ org:JSON.stringify(result) });
            console.log(JSON.stringify(result));
          });
        }
      });
    },
    decrPM: function() {
      var _this = this;
      $.ajax({
        type: 'PUT',
        url: '/service/org/'+event.target.id,
        contentType: "application/json",
        data: JSON.stringify({action:'-', val:'PMlicenses'}),
        complete: function() {
          console.log('success');
          $.get('/service/User/ReadOrgs',function(result) {
            _this.render(_this.$orgTable,'orgTable',{ org:JSON.stringify(result) });
            console.log(JSON.stringify(result));
          });
        }
      });
    },
    addOrg: function() {
      var $org = this.$org.val();
      var $user = this.$user.val();
      var $email = this.$email.val();

      var _this = this;

      var orgVars = {
        OrgName:$org,
        UserName:$user,
        EmailAddress:$email
      };
      console.log(JSON.stringify(orgVars));

      $.post('/service/User/CreateOrg',orgVars, function(postret){
        $.get('/service/User/ReadOrgs',{},function(getret){
          _this.render(_this.$pmTable,'orgTable',{org:JSON.stringify(getret)});
          _this.$addOrg.modal('hide');
        });
      });

    },
    addPM: function() {
      var $user = this.$PMuser.val();
      var $email = this.$PMemail.val();

      var _this = this;

      $.post('/service/User/CreatePM',{Name:$user,EmailAddress:$email},function(postret){
        $.get('/service/User/ReadPMs',{},function(getret){
          _this.render(_this.$pmTable,'tableUsers',{users:JSON.stringify(getret)});
          _this.$addPMUser.modal('hide');
        });
      })
      .fail(function(xhr) {
        console.log(xhr.responseText);
        _this.$newPMUserError.html(xhr.responseText);
        _this.$newPMUserError.toggle();
      });

    },

    addTimewriter: function() {
      var $user = this.$TMuser.val();
      var $email = this.$TMemail.val();

      var _this = this;

      $.post('/service/User/CreateTimewriter',{Name:$user,EmailAddress:$email},function(postret){
        $.get('/service/User/ReadTimewriters',{},function(getret){
          _this.render(_this.$tmTable,'tableUsers',{users:JSON.stringify(getret)});
          _this.$addTMUser.modal('hide');
        });
      })
      .fail(function(xhr) {
        console.log(xhr.responseText);
        _this.$newTMUserError.html(xhr.responseText);
        _this.$newTMUserError.toggle();
      });
    },
    render: function($dest, $templatefile,$args) {
      $.get('views/partials/'+$templatefile+'.hbs', function(template) {
        var render = Handlebars.compile(template);
        alert($args);
        $dest.html(render($args));
      });
    },


    p6login: function() {
      window.location.href = '/p6login';
/*
      var form=document.createElement('FORM');
      form.name='loginForm';
      form.method='POST';
      form.action='https://pmblocks.com/p6/action/login';

      var my_tb=document.createElement('INPUT');
      my_tb.type='TEXT';
      my_tb.name='username';
      my_tb.value='admin';
      form.appendChild(my_tb);

      my_tb=document.createElement('INPUT');
      my_tb.type='TEXT';
      my_tb.name='password';
      my_tb.value='r9cUMnVkJEKfRmdPUzgPRjsA';
      form.appendChild(my_tb);

      my_tb=document.createElement('INPUT');
      my_tb.type='TEXT';
      my_tb.name='databaseId';
      my_tb.value='1';
      form.appendChild(my_tb);

      my_tb=document.createElement('INPUT');
      my_tb.type='hidden';
      my_tb.name='actionType';
      my_tb.value='login';
      form.appendChild(my_tb);

      document.body.appendChild(form);
      form.submit();
*/
    },
    tmweblogin: function() {
      var form=document.createElement('FORM');
      form.name='formLogin';
      form.method='POST';
      form.action='https://pmblocks.com/p6tmweb/login';

      var my_tb=document.createElement('INPUT');
      my_tb.type='TEXT';
      my_tb.name='userName';
      my_tb.value='admin';
      form.appendChild(my_tb);

      my_tb=document.createElement('INPUT');
      my_tb.type='TEXT';
      my_tb.name='password';
      my_tb.value='r9cUMnVkJEKfRmdPUzgPRjsA';
      form.appendChild(my_tb);

      document.body.appendChild(form);
      form.submit();
    }
  };
	App.init();
});

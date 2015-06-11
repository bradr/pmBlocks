var express = require('express');
var hbs = require('express-handlebars');
//var redis = require('./redis.js');
var ws = require ('./ws.js');
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');
var reload = require('reload');
var querystring = require('querystring');
var asyncblock = require('asyncblock');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var redis = require('redis');
var redisClient = redis.createClient(6379, '127.0.0.1');

var cookieParser = require( "cookie-parser" );

//var PORT = 8080;

var app = express();

app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'main'}));
app.set('view engine', 'hbs');
app.set('port', 8888);

app.use( cookieParser() );

app.use(session({
  store: new RedisStore(({
    host:'127.0.0.1',
    port: 6379,
    prefix:'sess'
  })),
  secret: 'Sy7NN5DfnwYm',
  cookie: { secure: false },
  resave: true,
  saveUninitialized: true
}));

/// parse various different custom JSON types as JSON
app.use(bodyParser.json({ type: 'application/*+json' }));
// parse some custom thing into a Buffer
//app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
// parse an HTML body into a string
//app.use(bodyParser.text({ type: 'text/html' }));
//app.use(bodyParser());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

// a middleware with no mount path; gets executed for every request to the app
app.use(function (req, res, next) {
  console.log('Time:', Date.now());
  next();
});
app.use('/static',express.static('static'));
app.use('/views',express.static('views'));

// Main Search Page
app.get('/', function (req, res, next) {
  //ws.describe(function(){});
  res.render('index', { isLoggedIn:req.session.isLoggedIn} );
});

//{0,} is equivalent to * (zero or many)
app.get('/admin/?:id([0-9]{0,})', function (req, res, next) {
  if (req.session.isLoggedIn) {
    asyncblock(function(flow){
      var userid = req.session.userid;
      ws.readOrgs(req.session, flow.set('RBSs'));//function(RBSs) {
      var RBSs = flow.get('RBSs');

      if (req.params.id && req.session.isSuperUser) {
        redisClient.set('users:'+req.session.userid+':rbs',req.params.id, flow.add());
      }

      flow.wait();

      redisClient.get('users:'+req.session.userid+':rbs',flow.set('rbs'));
      redisClient.get('rbs:'+flow.get('rbs')+':name',flow.set('orgname'));
      ws.readPMs(req.session, flow.set('PMs'));//function(PMs) {
      ws.readTimewriters(req.session, flow.set('TMs'));//function(TMs) {
      var adminvars = {
        admin:req.session.isAdmin,
        superuser:req.session.isSuperUser,
        isLoggedIn:req.session.isLoggedIn,
        PMs:flow.get('PMs'),
        TMs:flow.get('TMs'),
        orgname: flow.get('orgname'),
        org:RBSs
      };
      res.render('admin', adminvars);

    });
  } else {
   res.redirect('/login');
  }
});

app.get('/admin/deleteUser/:user', function (req, res, next) {
  if (req.session.isLoggedIn) {
    ws.deleteUser(req.session,req.params.user, function() {
      res.redirect('/admin');
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/service/User/CreateOrg', function(req, res, next) {
  if (req.session.isSuperUser) {
    console.log(req.body.OrgName);
    ws.createOrg(req.session,req.body.OrgName,req.body.UserName,req.body.EmailAddress,function(result){
      console.log(result);
      res.setHeader('Content-Type', 'application/json');
      res.send(result);
    });
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.send('You do not have permissions to create a new organization');
  }
});
app.post('/service/User/CreatePM', function(req, res, next) {
  console.log('createPM!');
  if (req.session.isLoggedIn) {
    ws.createUser(req.session,"pm",req.body.Name,req.body.EmailAddress,function(err, result){
      if (err) {
        console.log('error caught:'+err);
        res.status(500).send(err.message);
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(result);
    });
  } else {
    res.redirect('/login');
  }
});
app.post('/service/User/CreateTimewriter', function(req, res, next) {
  if (req.session.isLoggedIn) {
    ws.createUser(req.session,"timewriter",req.body.Name,req.body.EmailAddress,function(err, result){
      if (err) {
        console.log('error caught:'+err.message);
        res.status(500).send(err.message);
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      //console.log(result);
      //res.send(result);
    });
  } else {
    res.redirect('/login');
  }
});
app.get('/service/User/ReadOrgs', function(req,res,next) {
  if (req.session.isLoggedIn) {
    ws.readOrgs(req.session, function(Orgs){
      res.setHeader('Content-Type', 'application/json');
      res.send(Orgs);
    });
  } else {
    res.redirect('/login');
  }
});
app.get('/service/User/ReadPMs', function(req,res,next) {
  if (req.session.isLoggedIn) {
    ws.readPMs(req.session, function(PMs){
      res.setHeader('Content-Type', 'application/json');
      res.send(PMs);
    });
  } else {
    res.redirect('/login');
  }
});
app.get('/service/User/ReadTimewriters', function(req,res,next) {
  if (req.session.isLoggedIn) {
    ws.readTimewriters(req.session,function(PMs){
        res.setHeader('Content-Type', 'application/json');
        res.send(TWs);
    });
  } else {
    res.redirect('/login');
  }
});

//old
app.get('/service/User/ReadUsers', function(req,res,next) {
  var UserFields = { Field: [
    'Name',
    'EmailAddress',
    'ObjectId'
  ]};
  if (req.session.isLoggedIn) {
    ws.run('ReadUsers','User', UserFields, req.session, function(err, users){
      if (err) {console.log("Error Reading Users:"+err);}
      res.setHeader('Content-Type', 'application/json');
      res.send(users);
    });
  } else {
    res.redirect('/login');
  }
});
app.put('/service/org/:id', function(req,res,next) {
  if (req.body.action=="+") {
    redisClient.incr('rbs:'+ req.params.id +':'+req.body.val, function(err, result) {
      if (err) {console.log(err);}
      res.setHeader('Content-Type', 'application/json');
      res.send({result: result});
    });
  } else if (req.body.action=="-") {
    redisClient.decr('rbs:'+ req.params.id +':'+req.body.val, function(err, result) {
      if (err) {console.log(err);}
      res.setHeader('Content-Type', 'application/json');
      res.send({result: result});
    });
  }
  return;
});
app.get('/p6login', function (req, res, next) {
  if (req.session.isLoggedIn) {

    var data = querystring.stringify({
      username: req.session.user,
      password: req.session.pass,
      databaseId: '1',
      actionType: 'login'
    });
    var options = {
      host: 'pmblocks.com',
      port: 443,
      path: '/p6/action/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    var httpreq = https.request(options, function (response) {
      var output='';
      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        output += chunk;
      });
      response.on('end', function() {
        res.send(output);
        //res.redirect('https://pmblocks.com/p6/action/home');
      });
    });
    httpreq.write(data);
    httpreq.end();
  } else {
    res.redirect('/login');
  }
});
app.get('/tmweblogin', function (req, res, next) {
  if (req.session.isLoggedIn) {
      res.redirect('/admin');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', function (req, res, next) {
  if (req.session.isLoggedIn) {
    res.redirect('/admin');
  } else {
    res.render('login', {isLoggedIn:false});
  }
});

app.post('/login', function (req, res, next) {
  req.session.user=req.body.user;
  req.session.pass=req.body.password;
  var loginvars = {
    UserName:req.session.user,
    Password:req.session.pass
  };
  asyncblock(function(flow){
    ws.run('Login','Authentication', loginvars, req.session, flow.set('loginSuccess'));//function(err, loginSuccess){
    ws.run('ReadUsers','User', {Field: ['Name', 'ObjectId'], Filter: ["Name = '"+req.session.user+"'"]}, req.session, flow.set('loginResult'));//function(err, loginResult){
    var loginResult = flow.get('loginResult');
    var loginSuccess = flow.get('loginSuccess');
    req.session.userid = loginResult.User[0].ObjectId;
  //    });
      //console.log("Login Result:", loginSuccess);
      if (loginSuccess.Return) {
        req.session.isLoggedIn = true;
        redisClient.get('users:'+req.session.userid+':rbs',function(err, rbs){
          redisClient.get('rbs:'+rbs+':adminid',function(err, admin){
            if (req.session.userid==admin) {
              req.session.isAdmin = true;
            }
          });
        });
        if (req.session.user=="admin") { req.session.isAdmin = true; }
        if (req.session.user=="admin") { req.session.isSuperUser = true; }
        res.redirect('/admin');
      } else {
        res.render('login', { message:"Login Failed" });
      }
    //});
  });
});

app.get('/logout', function (req, res, next) {
  delete req.session.user;
  delete req.session.pass;
  delete req.session.isAdmin;
  delete req.session.isSuperUser;
  delete req.session.isLoggedIn;
  req.session.destroy();
  res.redirect('/');
});


var server = http.createServer(app);
reload(server,app);
server.listen(app.get('port'),function(){
  console.log('Running on localhost:' + app.get('port'));
});

//Library to talk to P6 Tmweb service
var redis = require('redis');
var redisClient = redis.createClient(6379, '127.0.0.1');
//var dump = require('redis-dump');

var asyncblock = require('asyncblock');

/*
var getData = function(callback) {
  dump({
    // These are default values, you can omit them
    filter: '*',
    port: 6379,
    host: '127.0.0.1'
  },
  function(err, result){
    return callback(result);
  });
};
*/
var login = function (user, pass, callback) {
  var soap = require('soap');
  var url = 'http://p6.pmblocks.com:8206/p6ws/services/AuthenticationService?wsdl';
  var args = {UserName: user, Password: pass, DatabaseInstanceId:'1'};
  soap.createClient(url,function(err,client) {
    client.setSecurity(new soap.WSSecurity(user,pass));
    client.Login(args, function(err,result) {
      console.log(result.Return);
      return callback(err, result.Return);
    });
  });
};

var createOrg = function (session, orgname, name, email, callback) {
  asyncblock(function(flow){
    console.log('creating org');
    run('CreateResources','Resource', { Resource: [{Id:orgname, Name:orgname}] }, session, flow.set('rbs')); //function(err,result){
    var rbs = flow.get('rbs');
    console.log(rbs);
    var rbsid = rbs.ObjectId;
    console.log("New Org: "+rbsid);
      //Temporarily set the Admin user's RBS ID to the new RBS
    redisClient.set('users:'+session.userid+':rbs', rbsid, flow.add());
    flow.wait();

    redisClient.rpush('rbs',rbsid,flow.add());
    redisClient.set('rbs:'+rbsid+':name',orgname,flow.add());
    redisClient.set('rbs:'+rbsid+':Timewriterlicenses',0);
    redisClient.set('rbs:'+rbsid+':numberofTimewriters',0);
    redisClient.set('rbs:'+rbsid+':PMlicenses',1, flow.add());
    redisClient.set('rbs:'+rbsid+':numberofPMs',0, flow.add());
    flow.wait();
    createUser(session,"pm", name,email,flow.set('newPM'));
    var newuser = flow.get('newPM');
    console.log("New PM: "+newuser);
    redisClient.set('rbs:'+rbsid+':adminid',newuser);

    return true;
  }, callback);
};

var createUserResource = function (session, rbs, username, userid,callback) {
  asyncblock(function(flow){
    redisClient.get('rbs:'+rbs+':name', flow.set('rbsname'));
    var rbsname = flow.get('rbsname');
    var resourceFields = { Resource: {
      Id:username,
      Name:username,
      UserName:username,
      'UserObjectId':userid,
      'ParentObjectId':rbs
    }};

    run('CreateResources','Resource', resourceFields, session, flow.set('result'));
    var result = flow.get('result');

    return result.ObjectId;
  }, callback);
};

var createUser = function (session, type, name, email, callback) {
  asyncblock(function(flow){
    console.log('creating '+type);
    redisClient.get('users:'+session.userid+':rbs', flow.set('rbs')); //function(err, rbs) {
    var rbs = flow.get('rbs');
    if (type=="pm") {
      redisClient.get('rbs:'+rbs+':numberofPMs', flow.set('numusers'));
      redisClient.get('rbs:'+rbs+':PMlicenses', flow.set('numlicenses'));
    } else if (type=="timewriter") {
      redisClient.get('rbs:'+rbs+':numberofTimewriters', flow.set('numusers'));
      redisClient.get('rbs:'+rbs+':Timewriterlicenses', flow.set('numlicenses'));
    } else { return "User type not specified!"; }

    var numusers = flow.get('numusers');
    var numlicenses = flow.get('numlicenses');

    if (numlicenses-numusers>0) {
      run('CreateUsers','User', { User: [{Name:name, EmailAddress:email}] }, session, flow.set('result'));
      var result=flow.get('result');
/*      console.log("Result:"+result.toJSON);
      if (result.Error) {
        console.log('there was an error');
        throw new Error(result.Error);
      }
      console.log("Error:"+result.Error);
*/
      var userid = result.ObjectId[0];
      console.log(userid+rbs);
      createUserResource(session, rbs, name, userid, flow.set('resource'));
      var resid = flow.get('resource');

      console.log('New user:'+userid);
      redisClient.rpush('users',userid, flow.add());
      redisClient.set('users:'+userid+':name', name, flow.add());
      redisClient.set('users:'+userid+':email', email, flow.add());
      redisClient.set('users:'+userid+':role',type, flow.add());
      redisClient.set('users:'+userid+':rbs',rbs, flow.add());
      redisClient.set('users:'+userid+':rbsId',resid, flow.add());
      if (type=="pm") {
        redisClient.incr('rbs:'+rbs+':numberofPMs', flow.add());
        redisClient.rpush('rbs:'+rbs+':PMs',userid, flow.add());
      } else if (type=="timewriter") {
        redisClient.incr('rbs:'+rbs+':numberofTimewriters', flow.add());
        redisClient.rpush('rbs:'+rbs+':Timewriters',userid, flow.add());
      }

      flow.wait();
      return userid;

    } else {
      //console.log("You do not enough licenses to add a user");
      throw new Error("You do not enough licenses to add a user");
    }
  }, callback);
};

var deleteUser = function (session, userid, callback) {
  asyncblock(function(flow){
    redisClient.get('users:'+userid+':rbs', flow.set('rbs')); //function(err, rbs) {
    var rbs = flow.get('rbs');
    console.log('rbs:'+rbs);

    redisClient.get('users:'+userid+':role', flow.set('role'));
    redisClient.get('users:'+userid+':rbsId', flow.set('rbsId'));

    var role = flow.get('role');
    var rbsId = flow.get('rbsId');

    console.log(role+userid+rbs);

    if (flow.get('role')=='timewriter') {
      console.log('tm');
      redisClient.decr('rbs:'+rbs+':numberofTimewriters', flow.add());
      redisClient.lrem('rbs:'+rbs+':Timewriters',0, userid, flow.add());
    } else if (flow.get('role')=='pm') {
      console.log('pm');
      redisClient.decr('rbs:'+rbs+':numberofPMs', flow.add());
      redisClient.lrem('rbs:'+rbs+':PMs',0, userid, flow.add());
    }

    redisClient.lrem('users',0, userid, flow.add());
    redisClient.del('users:'+userid+':name', flow.add());
    redisClient.del('users:'+userid+':email', flow.add());
    redisClient.del('users:'+userid+':role', flow.add());
    redisClient.del('users:'+userid+':rbs', flow.add());


    run('DeleteUsers','User', { ObjectId:[userid] }, session, flow.add());
    run('DeleteResources','Resource', { ObjectId:[rbsId] }, session, flow.add());

    flow.wait();
    return 1;

  }, callback);
};

var readOrgs = function (session, callback) {
  asyncblock(function(flow){
    flow.errorCallback = callback;
    var RBSs=[];
    var rbsIds;

    redisClient.lrange('rbs',0,-1,flow.set('rbsIds'));
    rbsIds = flow.get('rbsIds');

    if (rbsIds) {
      rbsIds.forEach(function(rbsId) {
        var input = [
          'rbs:'+rbsId+':name',
          'rbs:'+rbsId+':numberofPMs',
          'rbs:'+rbsId+':numberofTimewriters',
          'rbs:'+rbsId+':PMlicenses',
          'rbs:'+rbsId+':Timewriterlicenses'
        ];

        redisClient.mget(input, flow.set('res'+rbsId));
        var result = flow.get('res'+rbsId);
        RBSs.push({
          Id:rbsId,
          Name:result[0],
          PMs:result[1],
          PMLicenses:result[3],
          TMs:result[2],
          TMLicenses:result[4]
        });
      });
    }
    return RBSs;
  }, callback);
};
var readPMs = function (session, callback) {
  asyncblock(function(flow) {
    redisClient.get('users:'+session.userid+':rbs', flow.set('rbs'));
    redisClient.lrange('rbs:'+flow.get('rbs')+':PMs',0,-1, flow.set('pmIds'));
    var PMs=[];
    var pmIds = flow.get('pmIds');
    if (pmIds) {
      pmIds.forEach(function(pmId){
        redisClient.get('users:'+pmId+':name', flow.set('pmname'+pmId));
        redisClient.get('users:'+pmId+':email', flow.set('pmemail'+pmId));
        PMs.push({ObjectId:pmId, Name:flow.get('pmname'+pmId), EmailAddress:flow.get('pmemail'+pmId)});
      });
    }
    return PMs;
  }, callback);
};
var readTimewriters = function (session, callback) {
  asyncblock(function(flow) {
    redisClient.get('users:'+session.userid+':rbs',flow.set('rbs'));
    redisClient.lrange('rbs:'+flow.get('rbs')+':Timewriters',0,-1,flow.set('tmIds'));
    var TMs=[];
    var tmIds = flow.get('tmIds');
    if (tmIds) {
      tmIds.forEach(function(tmId){
        redisClient.get('users:'+tmId+':name', flow.set('tmname'+tmId));
        redisClient.get('users:'+tmId+':email', flow.set('tmemail'+tmId));
        TMs.push({ObjectId:tmId, Name:flow.get('tmname'+tmId), EmailAddress:flow.get('tmemail'+tmId)});
      });
    }
    return TMs;
  }, callback);
};

var readActivities = function (session, callback) {
  var soap = require('soap');
  var url = 'http://p6.pmblocks.com:8206/p6ws/services/ActivityService?wsdl';
  soap.createClient(url,function(err,client) {
    client.setSecurity(new soap.WSSecurity(session.user,session.pass));
    client.ReadActivities({Field:'Name'}, function(err,result) {
      console.log(err);
      console.log(result);
    });

  });
};


var describe = function(callback) {
  var soap = require('soap');
  var service='ResourceCode';
  var url = 'http://p6.pmblocks.com:8206/p6ws/services/' + service + 'Service?wsdl';
  soap.createClient(url,function(err,client) {
//    client.setSecurity(new soap.WSSecurity(session.user,session.pass));
//    client[describe().fn](function(err,result) {
    var result = client.describe().ResourceCodeService.ResourceCodePort;
    console.log(result);
    return callback(result);
  });
};

var run = function(fn, service, args, session, callback) {
  asyncblock(function(flow){
    var soap = require('soap');
    var url = 'http://p6.pmblocks.com:8206/p6ws/services/' + service + 'Service?wsdl';
    soap.createClient(url, flow.set('client'));
    var client = flow.get('client');
    client.setSecurity(new soap.WSSecurity(session.user,session.pass));
    console.log("Running "+service);
    client[fn](args, flow.set('result'));
    var result = flow.get('result');
    console.log('Run Result: ' + JSON.stringify(result));
    return result;
  }, callback);
};


/*
  var clientParams = {
    host:'https://pmblocks.com',
    path:'/p6ws/services/AuthenticationService',
    wsdl:'/p6ws/services/AuthenticationService?wsdl'
  };
  var clientOptions = {
    secure : true/false //is https or http
  };

  var client = soap.Client(clientParams, clientOptions);
  client.once('initialized', function() {

  })

  .done(
    function(res) {
      console.log('Results:'+res.data)
    },
    function(err){
      console.log(err);
    }
  );
*/
/*  var args = {UserName: 'admin', Password: 'r9cUMnVkJEKfRmdPUzgPRjsA', DatabaseInstanceId:'1'};
  soap.createClient(url, function(err, client) {
    client.Login(args, function(err,result) {
      console.log('Error:' + err);
      console.log('Result:' + result);
    })
  });
  */



/*
redisConnect = function () {
  var redisHost  = process.env.DB_PORT_6379_TCP_ADDR;
  var redisPort  = process.env.DB_PORT_6379_TCP_PORT;
  var redis = require('redis'),
          client = redis.createClient(redisPort,redisHost);
  return client;
}

exports.listSources = function (callback) {
  var client = redisConnect();
  client.get("sources", function(err, output){
    console.log("Data:"+output);
    var sources = JSON.parse(output);
    client.quit();
    return callback(sources);
  });
}

exports.editSources = function (data) {
  var client = redisConnect();
  var newdata = [];
  var i = 0;
  data = JSON.parse(data);
  for(var key in data) {
    if (data[key].url) {
      newdata[i] = data[key];
      i++;
    }
  }
  client.set("sources", JSON.stringify(newdata), function(err, output){
    client.quit();
    return;
  });
}

//Check if the document has changed
exports.checkDocument = function (url) {
  var localText = "";//check redis database for url
  var documentText = "";//curl URL
  //Compare the text
  return true; //or false, or "URL no longer exists"
}

function async(callback, args) {
  console.log('do something with \''+args+'\', return 1 sec later');
  setTimeout(function() { callback(args); }, 1000);
}
*/

/*
var createPM = function (session, name, email, callback) {
  asyncblock(function(flow){
    console.log('creating pm user');
    redisClient.get('users:'+session.userid+':rbs', flow.set('rbs'));//function(err, rbs) {
    var rbs = flow.get('rbs');
    redisClient.get('rbs:'+rbs+':numberofPMs', flow.set('pms')); //function(err, pms){
    redisClient.get('rbs:'+rbs+':PMlicenses', flow.set('lic')); //function(err, lic){
    var pms = flow.get('pms');
    var lic = flow.get('lic');
    if (lic-pms>0) {
      run('CreateUsers','User', { User: [{Name:name, EmailAddress:email}] }, req.session, flow.set('result')); //function(err,result){
      var userid=flow.get('result').ObjectId;
      createUserResource(session, rbs, name, userid, flow.set('resource'));
      var resid = flow.get('resource');

      console.log('New user:'+userid);
      redisClient.rpush('users',userid, flow.add());
      redisClient.set('users:'+userid+':name', name, flow.add());
      redisClient.set('users:'+userid+':role','pm', flow.add());
      redisClient.set('users:'+userid+':rbs',rbs, flow.add());
      redisClient.set('users:'+userid+':rbsId',resid, flow.add());
      redisClient.set('users:'+userid+':email',email, flow.add());
      redisClient.incr('rbs:'+rbs+':numberofPMs', flow.add());
      redisClient.rpush('rbs:'+rbs+':PMs',userid, flow.add());
      flow.wait();
      return userid; //callback(result.Return);
    }
  }, callback);
};

var createTimewriter = function (session, name, email, callback) {
  asyncblock(function(flow){
    console.log('creating tm');
    redisClient.get('users:'+session.userid+':rbs', flow.set('rbs')); //function(err, rbs) {
    var rbs = flow.get('rbs');
    redisClient.get('rbs:'+rbs+':numberofTimewriters', flow.set('tms')); //function(err, tms){
    redisClient.get('rbs:'+rbs+':Timewriterlicenses', flow.set('lic')); //function(err, lic){

    var tms = flow.get('tms');
    var lic = flow.get('lic');

    if (lic-tms>0) {
      console.log('run1');
      run('CreateUsers','User', { User: [{Name:name, EmailAddress:email}] }, session, flow.set('result')); //function(err,result){
      var result=flow.get('result');
      var userid = result.ObjectId[0];
      console.log(userid+rbs);
      createUserResource(session, rbs, name, userid, flow.set('resource'));
      var resid = flow.get('resource');

      console.log('New user:'+userid);
      redisClient.rpush('users',userid, flow.add());
      redisClient.set('users:'+userid+':name', name, flow.add());
      redisClient.set('users:'+userid+':email', email, flow.add());
      redisClient.set('users:'+userid+':role','timewriter', flow.add());
      redisClient.set('users:'+userid+':rbs',rbs, flow.add());
      redisClient.set('users:'+userid+':rbsId',resid, flow.add());
      redisClient.incr('rbs:'+rbs+':numberofTimewriters', flow.add());
      redisClient.rpush('rbs:'+rbs+':Timewriters',userid, flow.add());

      flow.wait();
      return userid; //callback(result.Return);

    } else {
      return "You do not enough licenses to add a user";
    }
  }, callback);
};
*/

/*
var readUsers = function (session, callback) {
  var soap = require('soap');
  var url = 'http://p6.pmblocks.com:8206/p6ws/services/UserService?wsdl';
  var args = {'Name':'','ObjectId':'','EmailAddress':''};
  soap.createClient(url,function(err,client) {
    client.setSecurity(new soap.WSSecurity(session.user,session.pass));
    client.ReadUsers({Field:['Name', 'EmailAddress']}, function(err,result) {
      console.log(err);
      return callback(result.User);
    });
  });
};
*/

module.exports = {
//  getData: getData,
  login: login,
//  readUsers: readUsers,
  createOrg: createOrg,
  createUserResource: createUserResource,
//  createPM: createPM,
//  createTimewriter: createTimewriter,
  createUser: createUser,
  deleteUser: deleteUser,
  readOrgs: readOrgs,
  readPMs: readPMs,
  readTimewriters: readTimewriters,
  readActivities: readActivities,
  describe: describe,
  run: run
};

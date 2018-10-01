var express = require('express');
var app = express();
var user = require('./usertest.js');
var bodyParser = require('body-parser');
//var nodemailer = require('nodemailer');
var connection = require('./dbconnection.js');
var async = require('async');


app.use(bodyParser.json());

app.use(function(req, res, next) {

  res.header("Access-Control-Allow-Origin", "*");

  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  next();

});

/*-----Getting all Users list , which will use for super admin---*/
app.get('/users',function(req,res){
   connection.query('SELECT ngcs_users.*,ngcs_role.role_name from ngcs_users left join ngcs_role ON ngcs_users.role = ngcs_role.role_id',
    function (err, rows, fields) {
	  if (err) throw err
	  res.send(rows)
	})
});


/*-----Getting Org user list, which will use for orguser and orgadmin ------*/
app.post('/orguser', function(req,res){
  orgId = req.body.orgId;
  connection.query('SELECT ngcs_users.*,ngcs_role.role_name from ngcs_users left join ngcs_role ON ngcs_users.role = ngcs_role.role_id where org_id=?', [orgId], function (err, rows, fields) {
	  if (err) throw err
	  //console.log('Org list: ', rows[0].org_name)
	  //console.log('all data', rows)
    res.send(rows)
  })
});


/*-----To view user profile-----*/
app.post('/userview', function(req,res){
  userId = req.body.userId;
  connection.query('SELECT ngcs_users.*,ngcs_role.role_name from ngcs_users left join ngcs_role ON ngcs_users.role = ngcs_role.role_id where id=?', [userId], function (err, rows, fields) {
    if (err) throw err
    res.send(rows)
  })
});

/*----getting list of orgs-----*/
app.get('/orgs',function(req, res){
  connection.query('SELECT * from ngcs_orgs', function (err, rows, fields) {
	  if (err) throw err
	  res.send(rows)
	})
});

/*----getting list of org's app---*/
app.post('/orgApps',function(req, res){
  let orgId = req.body.orgId
  connection.query("SELECT * from ngcs_apps WHERE org_id=?",[orgId], function (err, rows, fields) {
	  if (err) throw err
	  res.send(rows)
	})
});


/*----getting list of apps for that org is not assigned---*/
app.get('/unassignedOrgApps',function(req, res){
  let orgId = req.body.orgId
  connection.query("SELECT * from ngcs_apps WHERE org_id=?",[0], function (err, rows, fields) {
	  if (err) throw err
	  res.send(rows)
	})
});


/*------getting list of user roles-----*/
app.get('/roles',function(req, res){
  connection.query('SELECT * from ngcs_role', function (err, rows, fields) {
	  if (err) throw err
	  res.send(rows)
	})
});


/*-------add new app, which only superadmin can do -----*/
app.post('/addApps', function(req,res){
  let appname = req.body.appname
  let data = {
    "Data":""
  };
  const appData = { org_id: 0, app_name: appname}
  connection.query('INSERT INTO ngcs_apps SET ?', appData, (err, rows, fields) => {
    console.log('Error log', err);
    if(err === null){
      data["Data"] = "app added"; 
      res.json(data);
    }else{
      data["Data"] = err;
      res.json(data);
    }

  });

});


/*-----Assign users to app ,org admin will assign users to their apps-----*/
app.post('/assignAppUser', function(req,res){
  let appId = req.body.appassignId
  let userId = req.body.appassignUserId 
  let userName = req.body.appassignUserName
  let data = {
    "Data":""
  };
  const appData = { id:null, app_assign_id: appId, appassign_user_id: userId, app_assign_user: userName}
  connection.query('SELECT * from ngcs_app_assignusers WHERE app_assign_id=? AND  appassign_user_id=?', [appId, userId], function(err, rows, fields){
    if(rows.length != 0){
      data["Data"] = "user already assigned";
      res.json(data);
    }else{
      connection.query('INSERT INTO ngcs_app_assignusers SET ?', appData, (err, rows, fields) => {
        console.log('Error log', err);
        if(err === null){
          data["Data"] = "user assigned"; 
          res.json(data);
        }else{
          data["Data"] = err
          res.json(data);
        }
      });
    }
  });
})


/*------------getting list of assigned users for the org's app-----*/
app.post('/getOrgAppassignUserTree', function(req,res){
  let orgId = req.body.orgId
  var rowData = [];

  connection.query("SELECT * from ngcs_apps WHERE org_id=?",[orgId], function (err, rows, fields) {
  async.eachSeries(rows, function(row, orgCb) {
    var appdetails = {};  
    appdetails = row;
    
    connection.query("SELECT * from ngcs_app_assignusers WHERE app_assign_id=?",[appdetails.app_id], function (err, rowitems, fields) {
      var temp = {};
      temp.app_id = appdetails.app_id;
      temp.app_name = appdetails.app_name;
      temp.items = [];
      temp.items = rowitems;
      async.eachSeries(temp.items, function(rowitem, inCb) 
      { 
        inCb(null);  // inner callback
      },function(err, result) 
      {
        //console.log('innerloop', temp)
        rowData.push(temp)
        orgCb(null);  // outer callback
      });
    })
  }, function(err, result) {
    if (err) {
      // Send appr response on err
      console.log(err);
    } else {
      // Send the consolidated array of results as response
      res.send(rowData)
    }
  });
  })
})

/*------add new org, which only super admin can do----*/
app.post('/addOrgs', function(req,res){
  let orgname = req.body.orgname
  let data = {
    "Data":"",
    "orgId":""
  };
  const orgData = { org_name: orgname}
  connection.query("SELECT * from ngcs_orgs WHERE org_name=?",[orgname],function(err, rows, fields){
    if(rows.length != 0){
      data["Data"] = "org exist";
      res.json(data);
    }else{
      connection.query('INSERT INTO ngcs_orgs SET ?', orgData, (err, rows, fields) => {
        console.log('Error log', err);
        if(err === null){ 
          data["Data"] = "org added";
          data["orgId"] = rows.insertId;
          res.json(data);
        }else{
          data["Data"] = err;
          res.json(data);
        }
    
      });
    }
  }); 
});


/*-------Add/create new user----super admin will create orgadmin users and orgadmin will create their
 org users------*/
app.post('/createUser',function(req,res){
  let name = req.body.name
  let lastname = req.body.lastname
  let email = req.body.email
  let pass = req.body.password
  let org = req.body.org
  let role = req.body.role
  let mailpassword = req.body.mailpass
  var now = new Date();
  var jsonDate = now.toJSON();
  var data = {
    "Data":""
  };

  const employee = { name: name, last_name: lastname,email: email, password: pass, date: jsonDate, role: role, group_id:0, org_id: org, user_status:1 };
  console.log('registerdata', employee)
  connection.query("SELECT * from ngcs_users WHERE email=?",[email],function(err, rows, fields){
    if(rows.length != 0){
      data["Data"] = "user exist";
      res.json(data);
    }else{
      connection.query('INSERT INTO ngcs_users SET ?', employee, (err, rows, fields) => {
        console.log('Error log', err);
        if(err === null){
          data["Data"] = "user created"; 
    
          /*nodemailer.createTestAccount((err, account) => {
            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: account.user, // generated ethereal user
                    pass: account.pass // generated ethereal password
                }
            });
        
            // setup email data with unicode symbols
            let mailOptions = {
                from: 'aprajita.kumari@tarento.com', // sender address
                to: email, // list of receivershttp://ngcs.idc.tarento.com
                subject: 'NGCS Account Created', // Subject line
                text: 'please click on below link to activate your account after using below login detail ', // plain text body
                html: '<a href="http://ngcs.idc.tarento.com">Click here to get login</a><br/>'
                       +'<span>Username: '+name+' </span><br/><span>Password: '+mailpassword+'</span>' // html body
            };
        
            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info.messageId);
                // Preview only available when sending through an Ethereal account
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        
                // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
                // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
            });
        });*/
    
          res.json(data);
        }else{
          data["Data"] = err;
          res.json(data);
        }
      });
    }
  });
  
});


/*-----Delete user----*/
app.post('/dltUsers',function(req,res){
  var userId = req.body.UserId;
  var data = {
    "Data":""
 };
  connection.query('DELETE FROM ngcs_users WHERE ?', {id: userId}, (err, rows, fields) => {
    console.log('Error log', err);
    if(err === null){
      data["Data"] = "User has been deleted!"; 
      res.json(data);
    }else{
      data["Data"] = "Error";
      res.json(data);
    }
  });

});


/*-------------delete users from assigned app----*/
app.post('/dltAppUser',function(req,res){
  var userId = req.body.userId;
  var appId = req.body.appId;
  var data = {
    "Data":""
 };
  connection.query('DELETE FROM ngcs_app_assignusers WHERE app_assign_id=? and appassign_user_id=?', [req.body.appId, req.body.userId], (err, rows, fields) => {
    console.log('Error log', err);
    if(err === null){
      data["Data"] = "User has been deleted!"; 
      res.json(data);
    }else{
      data["Data"] = "Error";
      res.json(data);
    }
  });
});

/*-----Update user status like Active/Inactive/ and Blocked ----*/
app.post('/updateStatus', function(req,res){
  var userId = req.body.UserId;
  var statusId = req.body.statusId;
  var data = {
    "Data":""
  };
  connection.query('UPDATE ngcs_users SET user_status=? WHERE id=?', [req.body.statusId, req.body.UserId], (err, rows, fields) => {
    console.log('Error log', err);
    if(err === null){
      data["Data"] = "User status has been updated"; 
      res.json(data);
    }else{
      data["Data"] = "Error";
      res.json(data);
    }
  });
})


/*------Update user detail------*/
app.post('/updateUser', function(req,res){
  let userId = req.body.UserId;
  let name = req.body.name
  let lastname = req.body.lastname
  let email = req.body.email
  let grpId = req.body.gropuId
  let org = req.body.org
  var data = {
    "Data":""
  };
  connection.query('UPDATE ngcs_users SET name=?, lastname=?, email=?, group_id=? WHERE id=?', [name, email, grpId, userId], (err, rows, fields) => {
    console.log('Error log', err);
    if(err === null){
      data["Data"] = "User has been updated"; 
      res.json(data);
    }else{
      data["Data"] = err;
      res.json(data);
    }
  });
})


/*-----------Update org app while assigning org to any app----*/
app.post('/updateAppOrg', function(req,res){
  var data = {
    "Data":""
  };
  connection.query('UPDATE ngcs_apps SET org_id=? WHERE app_id=?', [req.body.orgId, req.body.appId], (err, rows, fields) => {
    console.log('Error log', err);
    if(err === null){
      data["Data"] = "app assigned"; 
      res.json(data);
    }else{
      data["Data"] = "Error";
      res.json(data);
    }
  });
})


/*-------------Update org name------*/
app.post('/updateOrg', function(req,res){
  var data = {
    "Data":""
  };
  connection.query('UPDATE ngcs_orgs SET org_name=? WHERE org_id=?', [req.body.orgName, req.body.orgId], (err, rows, fields) => {
    console.log('Error log', err);
    if(err === null){
      data["Data"] = "org updated"; 
      res.json(data);
    }else{
      data["Data"] = "Error";
      res.json(data);
    }
  });
})


/*---------------user login------------*/
app.post('/login',function(req,res){
  var name = req.body.name;
  var pass = req.body.password;
  var email = req.body.email;
  var loginType = req.body.loginType;
  var lastInsertedId = ''
  var userdatas = '';
  var data = {
      "Data":"",
      "name":"",
      "role":"",
  };
  //console.log("login data", req.body)
  if(loginType === 'systemLogin') {
      connection.query("SELECT * from ngcs_users WHERE name=? and password=? LIMIT 1",[name,pass],function(err, rows, fields){
          if(rows.length != 0){
              console.log(rows)
              rows.forEach(function(element){
                if(element.user_status === 1){
                  data["Data"] = "Successfully logged in";
                }else if(element.user_status === 0 || element.user_status === 2){
                  data["Data"] = "Your account is not active";
                }
                data["name"] = element.name;
                data["role"] = element.role;
                data["org_id"] = element.org_id;
              })
              console.log('dataaaa', data)
              res.json(data);
          }else{
              data["Data"] = "name or password is incorrect";
              console.log(data["Data"])
              res.json(data);
          }
      });
  } if(loginType === 'googleLogin') {
    var authTkoen = req.body.authTkoen
    var now = new Date();
    var jsonDate = now.toJSON();
    console.log(authTkoen)
    if(authTkoen != ''){
    connection.query("SELECT * from ngcs_users WHERE email=? LIMIT 1",[email],function(err, rows, fields){
          if(rows.length != 0){
              data["Data"] = "Successfully logged in";
              rows.forEach(function(element){
                data["name"] = element.name;
                data["lastname"] = element.last_name
                data["role"] = element.role;
              })
              console.log(rows)
              res.json(data);
          }else{
              const employee = { id:'', first_name: name, email: email, password: pass, date:jsonDate, role:3, user_status:1 };
              console.log('employeee',employee)
              connection.query('INSERT INTO ngcs_users SET ?', employee, (err, res, fileds) => {
                console.log('Last insert ID:', res.insertId);
              });
                data["Data"] = "Successfully logged in";
                data["name"] = name;
                console.log('googlelogin dtaaaaa', data);
          }
      });
    }
  }
});

app.listen(4000);
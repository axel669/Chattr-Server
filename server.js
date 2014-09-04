var http = require('http');
var https=require("https");
var fs=require("fs");
var path=require("path");

var express=require("express");
var app=express();
var server=http.Server(app);


app.get("/auth/:username/:password",function(request,response){
	Users.auth(request.params.username,request.params.password).then(function(user){
		response.set("Content-Type","application/json");
		response.send(JSON.stringify({success:user!==null,user:user}));
	});
});
app.get("/register/:username/:password",function(request,response){
	Users.create(request.params.username,request.params.password).then(function(user){
		response.set("Content-Type","application/json");
		response.send(JSON.stringify({success:user!==null}));
	});
});

app.get("/",function(request,response,next){
	if(request.get("x-forwarded-proto")==="http")
	{
		response.set("content-type","text/html");
		response.send(
			sprintf(
				"<!DOCTYPE html><html><head><title>Chattr</title></head><body>Redirecting to https...<script>document.location='https://%{0}';</script></body></html>",
				request.get("host")
			)
		);
		return;
	}
	next();
});

app.use(function(request,response){
	if(request.get("x-forwarded-proto")==="http")
	{
		response.status(404).send("This is not the page you are looking for");
		return;
	}
	var filepath=__dirname+"/content"+request.path;
	if(fs.existsSync(filepath))
	{
		if(fs.statSync(filepath).isDirectory())
		{
			if(filepath.slice(-1)!=="/")
				filepath+="/";
			filepath+="index.htm";
		}
		response.sendFile(filepath);
	}
	else
		response.status(404).send("WOAH WHAT");
});

var io=require("socket.io")(server);

var users={};

io.on('connection',function(socket){
	var username=null;
	console.log("connection accepted");
	socket.on("disconnect",function(){
		io.emit("chat message",{msg:username+" has disconnected."});
		delete users[username];
		io.emit("user list",Object.keys(users));
	});
	socket.on('chat message',function(msg){
		msg.from=username;
		socket.broadcast.emit('chat message',msg);
	});
	socket.on("identify",function(name){
		username=name;
		users[name]=null;
		// console.log("identified:",name);
		socket.broadcast.emit("chat message",{from:null,msg:name+" has connected"});
		io.emit("user list",Object.keys(users));
	});
});

server.listen(80);
// sserver.listen(80);


require("./content/js/factotum");
var mongojs=require("mongojs");
// var db=mongojs.connect("mongodb://chattr-admin:LOLCHAT@ds063869.mongolab.com:63869/chattr-users",["users"]);

var DB={
	_connection:null,
	_tid:null,
	activeRequests:0,
	getConnection:function(){
		if(this._connection===null)
			this._connection=mongojs.connect("mongodb://chattrDB:chattr-experimental@ds033740.mongolab.com:33740/chattr",["users"]);
		if(this._tid!==null)
			clearTimeout(this._tid);
		var self=this;
		this._tid=setTimeout(function(){
			self.shutdown();
		},5*60*100);
		return this._connection;
	},
	shutdown:function(){
		// console.log("attempting to shutdown...");
		if(this.activeRequests>0)
		{
			// console.log("gotta wait for cons");
			var self=this;
			this._tid=setTimeout(function(){
				self.shutdown();
			},5000);
			return;
		}
		// console.log("closed connection");
		if(this._connection!==null)
		{
			this._connection.close();
			clearTimeout(this._tid);
			this._tid=null;
			this._connection=null;
		}
	}
};
Object.defineProperty(DB,"con",{
	get:function(){
		return this.getConnection();
	}
});

var Users={
	exists:function(username){
		var p=new promise();
		DB.activeRequests++;
		DB.con.users.findOne({username:username},{_id:1},function(err,doc){
			DB.activeRequests--;
			if(err!==null)
				p.reject(err);
			else
				p.resolve(doc!==null);
		});
		return p;
	},
	create:function(username,password){
		var p=new promise();
		DB.activeRequests++;
		this.exists(username).then(function(exists){
			DB.activeRequests--;
			if(exists)
			{
				p.resolve(null);
				return;
			}
			DB.con.users.insert({username:username,password:sha512Hash(password)},{w:1},function(err,result){
				if(err!==null)
					p.reject(err);
				else
					p.resolve(result);
			});
		});
		return p;
	},
	auth:function(username,password){
		var p=new promise(true);
		DB.activeRequests++;
		DB.con.users.findOne({username:username,password:sha512Hash(password)},{_id:1,username:1},function(err,doc){
			DB.activeRequests--;
			p.resolve(doc);
		});
		return p;
	}
};

var crypto=require("crypto");
function sha512Hash(str,salt)
{
	salt=salt||"";
	return crypto.createHash("sha512").update(str).update(salt).digest("hex");
}

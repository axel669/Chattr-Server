var http = require('http');
var https=require("https");
var fs=require("fs");
var path=require("path");

var axel=(function(){
})();

function getMtime(file)
{
	return fs.statSync(file).mtime.getTime();
}
var files={};
function loadFile(filename,isTemplate)
{
	var contents=fs.readFileSync(filename);
	return {
		contents:isTemplate?F.template(contents,{args:["GET","POST","COOKIE","header"]}):contents,
		isTemplate:isTemplate,
		mtime:getMtime(filename)
	};
}
function getFile(filename,isTemplate,data,cb)
{
	isTemplate=!!isTemplate;
	var info=files[filename]||{mtime:0,isTemplate:isTemplate};
	var mtime=getMtime(filename);
	if(info.mtime!==mtime)
		info=files[filename]=loadFile(filename,isTemplate);
	var headers={};
	data.header=function(name,value){
		headers[name]=value;
	};
	if(info.isTemplate)
		cb(null,info.contents(data),headers);
	else
		cb(null,info.contents,headers);
}

var mimeTypes={
	".htm":"text/html",
	".js":"text/javascript",
	".lol":"text/html",
	".css":"text/css"
};
function getMime(file)
{
	var ext=path.extname(file);
	if(!mimeTypes.hasOwnProperty(ext))
		return "text/plain";
	return mimeTypes[ext];
}

function resolvePath(url)
{
	var file="content"+url;
	file=path.resolve(file);
	file=path.relative(__dirname,file).replace(/\\/g,"/");
	if(file.split("/")[0]!=="content")
		return null;
	if(fs.existsSync(file) && fs.statSync(file).isDirectory())
		file+="/index.htm";
	return file;
}
function standardResponse(url,request,response,data,cb)
{
	var filename=resolvePath(url);
	if(!fs.existsSync(filename))
	{
		cb({
			filename:"/404.htm",
			html:"Nope",
			status:400,
			encoding:"utf8",
			headers:{}
		});
		return;
	}
	getFile(filename,path.extname(filename)===".lol",data,function(err,data,headers){
		cb({
			filename:filename,
			html:data,
			status:200,
			encoding:"utf8",
			headers:headers
		});
	});
}

function HashTable()
{
	this.data={};
	this.queue=[];
}

var router={
	root:{
		process:function(url,request,response,data,cb){
			standardResponse(url,request,response,data,cb);
		},
		file:{
			register:function(url,request,response,data,cb){
				Users.create(data.POST.username,sha512Hash(data.POST.password)).then(function(created){
					cb({
						filename:"register.htm",
						html:"this is a test: "+created,
						status:200,
						encoding:"utf8",
						headers:{}
					});
				});
			}
		},
		auth:function(url,request,response,data,cb){
			Users.auth(data.GET.username,data.GET.password).then(function(doc){
				data.userInfo=doc;
				standardResponse("/content/test.lol",request,response,data,cb);
			});
		}
	}
};

function Cookie(request)
{
	this.__cookie_string=request.headers.cookie;
	this.__cache={};
}
Cookie.prototype.get=function(name){
	if(!this.__cache.hasOwnProperty(name))
	{
		var index=this.__cookie_string.indexOf(name+"=");
		if(index===-1)
		{
			this.__cache[name]=null;
			return null;
		}
		index=index+name.length+1;
		var end=this.__cookie_string.indexOf(";",index);
		if(end===-1) end=this.__cookie_string.length;
		this.__cache[name]=decodeURIComponent(this.__cookie_string.substring(index,end));
	}
	return this.__cache[name];
};

function serverCall(request, response){
	var url=URL.parse(request.url,true);
	
	if(request.headers["x-forwarded-proto"]==="http")
	{
		if(url.pathname==="/")
		{
			response.writeHead(200,{"Content-Type":"text/html"});
			response.end("<!DOCTYPE html><html><head><title>Chattr</title></head><body>Gotta use dat <a href='https://"+request.headers.host+"'>https</a></body></html>");
		}
		else
		{
			response.writeHead(404,{});
			response.end("This is not the page you are looking for");
		}
		return;
	}
	
	var paths=url.pathname.split("/");
	var current=router.root;
	var index=0;
	while(++index<paths.length && current.hasOwnProperty('paths') && current.paths.hasOwnProperty(paths[index]))
		current=current.paths[paths[index]];
	var proc=(current.file && current.file[paths[index]])||current.process||standardResponse;
	var url=URL.parse(request.url,true);
	var postData="";
	request.on("data",function(data){
		postData+=data;
	});
	request.on("end",function(){
		// console.log(request.headers.cookie);
		switch(url.query.postFormat)
		{
			case "json":
				postData=JSON.parse(postData);
				break;
			
			case "urlencode": default:
				postData=URL.parse("?"+postData,true).query;
				break;
		}
		proc(url.pathname,request,response,{GET:url.query,POST:postData,COOKIE:new Cookie(request)},function(info){
			var headers=info.headers;
			if(!headers.hasOwnProperty("Content-Type"))
				headers["Content-Type"]=getMime(info.filename);
			headers["Content-Length"]=info.html.length;
			// console.log('showing page:',request.url,"->",info.filename);
			response.writeHead(info.status,headers);
			response.end(info.html,info.encoding);
		});
	});
}

var URL=require("url");
// var sslOptions={
// 	key:fs.readFileSync("test-key.pem"),
// 	cert:fs.readFileSync("test-cert.pem")
// };
var sserver=http.createServer(serverCall);

var io=require("socket.io")(sserver);

var users={};

io.on('connection',function(socket){
	var username=null;
	socket.on("disconnect",function(){
		io.emit("chat message",{msg:username+" has disconnected."});
		delete users[username];
		io.emit("user list",Object.keys(users));
	});
	socket.on('chat message',function(msg){
		socket.broadcast.emit('chat message',msg);
	});
	socket.on("login",function(name){
		username=name;
		users[name]=null;
		io.emit("user list",Object.keys(users));
	});
	socket.on("user auth",function(info){
		// Users.
	});
});

// server.listen(80);
sserver.listen(80);


require("./content/js/factotum");
var mongojs=require("mongojs");
// var db=mongojs.connect("mongodb://chattr-admin:LOLCHAT@ds063869.mongolab.com:63869/chattr-users",["users"]);

var DB={
	_connection:null,
	_tid:null,
	getConnection:function(){
		if(this._connection===null)
			this._connection=mongojs.connect("mongodb://chattr-admin:LOLCHAT@ds063869.mongolab.com:63869/chattr-users",["users"]);
		if(this._tid!==null)
			clearTimeout(this._tid);
		var self=this;
		this._tid=setTimeout(function(){
			self._tid=null;
			self._connection.close();
			self._connection=null;
			console.log("closed server connection");
		},5*60*10);
		return this._connection;
	},
	shutdown:function(){
		if(this._connection!==null)
		{
			this._connection.close();
			clearTimeout(this._tid);
		}
	}
};

var Users={
	exists:function(username){
		var p=new promise();
		var keys={};
		var db=DB.getConnection();
		keys["users."+username]=1;
		keys._id=0;
		db.users.findOne({_id:"users","users":{$exists:username}},keys,function(err,doc){
			if(err!==null)
				p.reject(err);
			else
				p.resolve(doc.users.hasOwnProperty(username));
		});
		return p;
	},
	create:function(username,pw){
		var p=new promise();
		var db=DB.getConnection();
		this.exists(username).then(function(exists){
			if(exists)
			{
				p.resolve(false);
				return;
			}
			var key="users."+username;
			var update={$set:{}};
			update.$set[key]={pw:sha512Hash(pw),friends:[]};
			db.users.update({_id:"users"},update,function(){
				p.resolve(true);
			});
		});
		return p;
	},
	auth:function(username,password){
		var p=new promise(true);
		var keys={};
		keys["users."+username]=1;
		keys._id=0;
		var db=DB.getConnection();
		var query={_id:"users"};
		query.users={};
		query.users[username]={pw:sha512Hash(password)};
		console.log("checking",query);
		db.users.findOne(query,keys,function(err,doc){
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

// Users.auth("watman","wat").then(function(doc){
// 	console.log("doc:",doc);
// 	DB.shutdown();
// });
// Users.exists("watman").then(F.log);

var db=DB.getConnection();
db.users.findOne({username:"watman"},{_id:0,username:1},function(err,doc){
	console.log("found:",doc);
});
// db.users.insert({username:"watman",password:sha512Hash("wat")},{w:1},function(err,result){
// 	F.puts(err,result);
// });

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
				Users.create(data.GET.username,data.GET.password).then(function(user){
					cb({
						filename:"file </register>",
						html:JSON.stringify(user!==null),
						status:200,
						encoding:"utf8",
						headers:{}
					});
				});
			},
			auth:function(url,request,response,data,cb){
				Users.auth(data.GET.username,data.GET.password).then(function(doc){
					// standardResponse("/test.lol",request,response,data,cb);
					console.log("auth result:",doc);
					cb({
						filename:"file </auth>",
						html:JSON.stringify({success:doc!==null,user:doc}),
						status:200,
						encoding:"utf8",
						headers:{}
					});
				});
			}
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
			response.end(sprintf("<!DOCTYPE html><html><head><title>Chattr</title></head><body>Redirecting to https...<script>document.location='\
				https://%{0}';</script></body></html>",request.headers.host));
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
// var sserver=http.createServer(serverCall);
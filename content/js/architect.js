(function(window){

var requestFrame=null, cancelFrame=null;
function emptyf(){}
function slice(array,start,size)
{
	var len=array.length;
	start=start||0;
	size=size||(len-start);
	if(size<=0) return [];
	var end=start+size;
	var index=start-1;
	var r=new Array(size);
	while(++index<end)
		r[index-start]=array[index];
	return r;
}
function concat()
{
	if(typeof(arguments[0])==='string')
	{
		var r=arguments[0], i=0, e=arguments.length;
		while(++i<e)
			r+=arguments[i];
		return r;
	}
	var r=[];
	var count=-1, end=arguments.length;
	while(++count<end)
	{
		var array=arguments[count];
		var index=-1, len=array.length;
		while(++index<len)
			r.push(array[index]);
	}
	return r;
}
function bind(method,self)
{
	var args=slice(arguments,2);
	return function(){
		return method.apply(self,concat(args,arguments));
	};
}

if(typeof(webkitRequestAnimationFrame)!="undefined")
{
	requestFrame=webkitRequestAnimationFrame;
	cancelFrame=webkitCancelAnimationFrame||$.emptyf;
}
if(typeof(mozRequestAnimationFrame)!="undefined")
{
	requestFrame=mozRequestAnimationFrame;
	cancelFrame=mozCancelAnimationFrame||emptyf;
}
if(typeof(oRequestAnimationFrame)!="undefined")
{
	requestFrame=oRequestAnimationFrame;
	cancelFrame=oCancelAnimationFrame||emptyf;
}
if(typeof(requestAnimationFrame)!="undefined")
{
	requestFrame=requestAnimationFrame;
	cancelFrame=cancelAnimationFrame||emptyf;
}
if(requestFrame===null)
{
	requestFrame=function(f){
		return setTimeout(f,15);
	};
	cancelFrame=function(id){
		clearTimeout(id);
	};
}
requestFrame=bind(requestFrame,window);
var tag=document.querySelectorAll("script");
tag=tag[tag.length-1];
if(tag.getAttribute("data-expose-frames")==="true")
	window.requestFrame=requestFrame;


function execSandboxed(tag,args)
{
	if(typeof(tag)==='string')
		tag=document.querySelector(tag);
	var script='"use strict";'+tag.innerHTML;
	args=args||{};
	argNames=Object.keys(args);
	var argList=[];
	for(var x=0;x<argNames.length;++x)
		argList.push(args[argNames[x]]);
	try{
		var f=new Function(argNames,script);
		f.apply(null,argList);
	}
	catch(e){
		console.log("Error in sandbox: "+(tag.getAttribute("data-sandbox")||"<unnamed>"));
		throw e;
	}
}

var layoutVars={};



function parse_word(str,pos)
{
	var start=pos;
	var c=str.charCodeAt(pos);
	while(c>=97 && c<=122) c=str.charCodeAt(++pos);
	return str.substring(start,pos);
}
function parse_num(str,pos)
{
	var start=pos;
	if(str.charCodeAt(pos)===45)
		++pos;
	var c=str.charCodeAt(pos);
	while(c>=48 && c<=57) c=str.charCodeAt(++pos);
	return str.substring(start,pos);
}
function parseAnchor(str)
{
	var pos=0, len=str.length;
	var info={
	};
	while(pos<len)
	{
		var type=parse_word(str,pos);
		pos+=type.length;
		while(str.charCodeAt(pos)!==93)
		{
			++pos;
			var prop=parse_word(str,pos);
			pos+=prop.length+1;
			var value=parse_num(str,pos);
			pos+=value.length;
			if(!info.hasOwnProperty(prop))
				info[prop]={};
			info[prop][type]=+value;
		}
		pos+=2;
	}
	return info;
}

function compileAnchor(elem,layoutVars)
{
	var anchorText=elem.getAttribute("data-layout");
	anchorText=anchorText.replace(/\{([a-zA-Z_\$](\w|\$)*?)\}/g,function(s,name){
		return layoutVars[name];
	});
	var info=parseAnchor(anchorText);
	
	var style=elem.style;
	if(info.width)
	{
		if(info.left)
		{
			info.right={};
			info.right.anchor=100-info.left.anchor;
			info.right.offset=-info.width.size;
		}
		else if(info.right)
		{
			info.left={};
			info.left.anchor=100-info.right.anchor;
			info.left.offset=-info.width.size;
		}
	}
	if(info.height)
	{
		if(info.top)
		{
			info.bottom={};
			info.bottom.anchor=100-info.top.anchor;
			info.bottom.offset=-info.height.size;
		}
		else if(info.bottom)
		{
			info.top={};
			info.top.anchor=100-info.bottom.anchor;
			info.top.offset=-info.height.size;
		}
	}
	
	var def=['left','right','top','bottom'];
	for(var x=0;x<4;++x)
		if(!info.hasOwnProperty(def[x]))
			info[def[x]]={offset:0};
	
	if(info.left.hasOwnProperty('anchor'))
	{
		style.left=info.left.anchor+"%";
		if(info.left.offset)
			style.marginLeft=info.left.offset+"px";
	}
	else
		style.left=info.left.offset+"px";
	
	if(info.top.hasOwnProperty('anchor'))
	{
		style.top=info.top.anchor+"%";
		if(info.top.offset)
			style.marginTop=info.top.offset+"px";
	}
	else
		style.top=info.top.offset+"px";
	
	if(info.right.hasOwnProperty('anchor'))
	{
		style.right=info.right.anchor+"%";
		if(info.right.offset)
			style.marginRight=info.right.offset+"px";
	}
	else
		style.right=info.right.offset+"px";
	
	if(info.bottom.hasOwnProperty('anchor'))
	{
		style.bottom=info.bottom.anchor+"%";
		if(info.bottom.offset)
			style.marginBottom=info.bottom.offset+"px";
	}
	else
		style.bottom=info.bottom.offset+"px";
	
	elem.lastLayout=anchorText;
	
	var styleCheck=getComputedStyle(elem);
	if(styleCheck.position!=='absolute')
		elem.style.position='absolute';
}

function reflow()
{
	// requestFrame(reflow);
	var elements=document.querySelectorAll("*[data-layout]");
	for(var x=0, end=elements.length;x<end;++x)
	{
		var elem=elements[x];
		if(!elem.hasOwnProperty("lastLayout") || elem.getAttribute("data-layout")!==elem.lastLayout)
			compileAnchor(elem,layoutVars);
	}
}

window.compileAnchor=compileAnchor;
window.parseAnchor=parseAnchor;

var message=Math.random();
function domReadySetup(e)
{
	if(!document.body)
	{
		window.postMessage(message,"*");
		return;
	}
	if(+e.data!==message)
		return;
	window.removeEventListener("message",domReadySetup);
	reflow();
	
	// requestFrame(reflow);
	
	var elems=document.querySelectorAll("*[data-name]");
	var elements={};
	for(var x=0, end=elems.length;x<end;++x)
	{
		var elem=elems[x];
		elements[elem.getAttribute("data-name")]=elem;
	}
	
	var sandboxes=document.querySelectorAll("script[type='sandbox-js']");
	for(var x=0, end=sandboxes.length;x<end;++x)
		execSandboxed(sandboxes[x],elements);
}
window.addEventListener("message",domReadySetup);
window.postMessage(message,"*");

})(window);

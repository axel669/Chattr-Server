(function(){
//

function createElem(tag,cn)
{
	var r=document.createElement(tag);
	r.className=cn||"";
	return r;
}

function showAlert(msg)
{
	contentWrapper.innerHTML=msg;
}

var overlay=createElem("div","iboxxy-overlay");
var displayWrapper=createElem("div","iboxxy-display-wrapper");

var titleWrapper=createElem("div","iboxxy-title-wrapper");
var contentWrapper=createElem("div","iboxxy-content-wrapper");
var buttonWrapper=createElem("div","iboxxy-button-wrapper");

var okButton=createElem("button","iboxxy-button");
okButton.addEventListener("click",function(evt){
	console.log("WAT");
},false);
okButton.innerHTML="OK";

buttonWrapper.appendChild(okButton);

displayWrapper.appendChild(titleWrapper);
displayWrapper.appendChild(contentWrapper);
displayWrapper.appendChild(buttonWrapper);
overlay.appendChild(displayWrapper);

domready.then(function(){
	document.body.appendChild(overlay);
});

})();

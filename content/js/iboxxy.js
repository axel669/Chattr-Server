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
}

var overlay=createElem("div","iboxxy-overlay");
var displayWrapper=createElem("div","iboxxy-display-wrapper");
var buttonWrapper=createElem("div","iboxxy-button-wrapper");

buttonWrapper.innerHTML="<button class='iboxxy-button'>Wat</button>";

displayWrapper.appendChild(buttonWrapper);
overlay.appendChild(displayWrapper);

domready.then(function(){
	document.body.appendChild(overlay);
});

})();

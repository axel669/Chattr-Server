{%

Users.create($POST.username,sha512Hash($POST.password)).then(function(){
});

%}
<!DOCTYPE html>
<html>
	<head>
		<script src="js/factotum.js"></script>
		<title>LOL Test</title>
	</head>
	<body>
		<form method="post">
			<input type="text" name="wat" value="LOL" />
			<input type="submit" valu="test" />
		</form>
		<div><pre>{%: JSON.stringify(GET) %}</div></pre>
		<div><pre>{%: JSON.stringify(POST) %}</div></pre>
		<div><pre>{%: JSON.stringify($data.userInfo) %}</div></pre>
	</body>
</html>

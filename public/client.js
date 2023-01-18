var socket = io();
		
//Send start event
var startButton = document.getElementById('start');
startButton.addEventListener('click', function(e){

	socket.emit('start');
});
		
//Handle start event
socket.on('start', function(heroes){
	setImages(heroes[0], heroes[1], heroes[2]);
});
		
//Send pick event
		
//Receive update event
		
		
//Helper funcs
function setImages(strHeroes, agiHeroes, intHeroes){
		
	strHeroes.forEach(function(e){
		var elem = document.createElement("img");		
		elem.src = '/assets/images/' + e + '.webp';
		document.getElementById("str").appendChild(elem);
	});
			
	agiHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		document.getElementById("agi").appendChild(elem);
	});
	
	intHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		document.getElementById("int").appendChild(elem);
	});
}
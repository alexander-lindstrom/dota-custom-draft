var socket = io();
		
//Send start event
var startButton = document.getElementById('start');
startButton.addEventListener('click', function(e){
	socket.emit('start');
});

//Send stop event
var startButton = document.getElementById('stop');
startButton.addEventListener('click', function(e){
	socket.emit('stop');
});
		
//Handle start event
socket.on('start', function(heroes){
	setImages(heroes[0], heroes[1], heroes[2]);
});

//Handle start event
socket.on('stop', function(){
	resetState()
});
		
//Send pick event
//Add some kind of confirm (select, cancel)
		
//Receive update event
		
initialState()
		
//Helper funcs - move to some other file later
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

function initialState(){
	
	var h2 = document.createElement('h2');
    h2.innerHTML= "Strenght heroes" ;
	document.getElementById("str").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Agility heroes" ;
	document.getElementById("agi").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Intelligence heroes" ;
	document.getElementById("int").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Radiant bans" ;
	document.getElementById("radiant_bans").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Radiant picks" ;
	document.getElementById("radiant_picks").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Dire bans" ;
	document.getElementById("dire_picks").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Dire picks" ;
	document.getElementById("dire_picks").appendChild(h2);
}

function resetState(){
	
	document.getElementById("str").replaceChildren();
	document.getElementById("agi").replaceChildren();
	document.getElementById("int").replaceChildren();
	
	document.getElementById("radiant_bans").replaceChildren();
	document.getElementById("radiant_picks").replaceChildren();
	document.getElementById("dire_bans").replaceChildren();
	document.getElementById("dire_picks").replaceChildren();
	
	initialState()
}
var socket = io();
var radiantTimer;
var direTimer;
var radiantReserveTimer = 20;
var direReserveTimer = 20;

//Buttons
var startButton = document.getElementById('start');
startButton.addEventListener('click', function(e){
	socket.emit('start');
});

var stopButton = document.getElementById('stop');
stopButton.addEventListener('click', function(e){
	socket.emit('stop');
});

var captainButton = document.getElementById('become_captain');
captainButton.addEventListener('click', function(e){
	socket.emit('become_captain', socket.id);
});

		
//Event handling
socket.on('start', function(heroes){
	setImages(heroes[0], heroes[1], heroes[2], heroes[3]);
});

socket.on('stop', function(){
	resetState()
});
		
function sendPickEvent(id){
	socket.emit('pick', id, socket.id);
}
		
socket.on('pick', function(phase, faction, child_id){
	const parent_id = faction + '_' + phase;
	
	document.getElementById(parent_id).appendChild(document.getElementById(child_id));
});

socket.on('radiant_timer_start', function(initialValue){
	radiantTimer = startTimer("radiant_timer", initialValue);
});

socket.on('radiant_timer_stop', function(){
	clearInterval(radiantTimer); 
});

socket.on('dire_timer_start', function(initialValue){
	direTimer = startTimer("dire_timer", initialValue);
});
socket.on('dire_timer_stop', function(){
	clearInterval(direTimer); 
});

socket.on('radiant_reserve_timer_start', function(initialValue){
	radiantReserveTimer = startTimer("radiant_reserve_timer", initialValue);
});

socket.on('radiant_reserve_timer_stop', function(){
	clearInterval(radiantReserveTimer); 
});

socket.on('dire_reserve_timer_start', function(initialValue){
	direReserveTimer = startTimer("dire_reserve_timer", initialValue);
});

socket.on('dire_reserve_timer_stop', function(){
	clearInterval(direReserveTimer); 
});

socket.on('update_radiant_captain', function(user_id){
	document.getElementById("radiant_captain").innerHTML = "Radiant captain: " + user_id;
});

socket.on('update_dire_captain', function(user_id){
	document.getElementById("dire_captain").innerHTML = "Dire captain: " + user_id;
});


		
initialState()
		
//Helper funcs - move to some other file later
function startTimer(id, initialVal){
	console.log(id, initialVal)
	var timerId = setInterval(function(){
	  if(initialVal <= 0){
		clearInterval(timerId);
	  }
	  document.getElementById(id).innerHTML = id + ": " + initialVal;
	  initialVal -= 1;
	}, 1000);
	return timerId;
}

function setImages(strHeroes, agiHeroes, intHeroes, uniHeroes){
		
	strHeroes.forEach(function(e){
		var elem = document.createElement("img");		
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			sendPickEvent(elem.id);
		}
		document.getElementById("available_heroes").appendChild(elem);
	});
			
	agiHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			sendPickEvent(elem.id);
		}
		document.getElementById("available_heroes").appendChild(elem);
	});
	
	intHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			sendPickEvent(elem.id);
		}
		document.getElementById("available_heroes").appendChild(elem);
	});
	
	uniHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			sendPickEvent(elem.id);
		}
		document.getElementById("available_heroes").appendChild(elem);
	});
}

function initialState(){
	
	var h2 = document.createElement('h2');
    h2.innerHTML= "Available heroes" ;
	document.getElementById("available_heroes").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Radiant bans" ;
	document.getElementById("radiant_ban").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Radiant picks";
	document.getElementById("radiant_pick").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Dire bans" ;
	document.getElementById("dire_ban").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Dire picks" ;
	document.getElementById("dire_pick").appendChild(h2);
}

function resetState(){
	
	document.getElementById("available_heroes").replaceChildren();
	document.getElementById("radiant_ban").replaceChildren();
	document.getElementById("radiant_pick").replaceChildren();
	document.getElementById("dire_ban").replaceChildren();
	document.getElementById("dire_pick").replaceChildren();
	
	initialState()
}
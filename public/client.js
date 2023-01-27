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
		
function sendPickEvent(id){
	socket.emit('pick', id);
}
//Add some kind of confirm (select, cancel)
		
//Receive pick events
socket.on('pick', function(phase, faction, child_id){
	const parent_id = faction + '_' + phase;
	console.log(parent_id, child_id)
	
	document.getElementById(parent_id).appendChild(document.getElementById(child_id));
});

//Timer events


//radiant_timer_start
socket.on('radiant_timer_start', function(initialValue){
	startRadiantTimer(initialValue);
});



		
initialState()
		
//Helper funcs - move to some other file later
function startRadiantTimer(initialVal){
	console.log(initialVal)
	var downloadTimer = setInterval(function(){
	  if(initialVal <= 0){
		clearInterval(downloadTimer);
	  }
	  document.getElementById("radiant_timer").innerHTML = initialVal;
	  initialVal -= 1;
	}, 1000);
}

/* How to remove timer?
function stopRadiantReserve(){
	var downloadTimer = setInterval(function(){
	  if(initialVal <= 0){
		clearInterval(downloadTimer);
	  }
	  document.getElementById("radiant_reserve").innerHTML = initialVal;
	  initialVal -= 1;
	}, 1000);
}
*/

function setImages(strHeroes, agiHeroes, intHeroes){
		
	strHeroes.forEach(function(e){
		var elem = document.createElement("img");		
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			sendPickEvent(elem.id);
		}
		document.getElementById("str").appendChild(elem);
	});
			
	agiHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			sendPickEvent(elem.id);
		}
		document.getElementById("agi").appendChild(elem);
	});
	
	intHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			sendPickEvent(elem.id);
		}
		document.getElementById("int").appendChild(elem);
	});
}

function initialState(){
	
	var h2 = document.createElement('h2');
    h2.innerHTML= "Strength heroes" ;
	document.getElementById("str").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Agility heroes" ;
	document.getElementById("agi").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Intelligence heroes" ;
	document.getElementById("int").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Radiant bans" ;
	document.getElementById("radiant_ban").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Radiant picks" ;
	document.getElementById("radiant_pick").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Dire bans" ;
	document.getElementById("dire_ban").appendChild(h2);
	
	h2 = document.createElement('h2');
    h2.innerHTML= "Dire picks" ;
	document.getElementById("dire_pick").appendChild(h2);
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
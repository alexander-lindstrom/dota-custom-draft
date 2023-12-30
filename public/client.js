var socket = io();
var radiantTimer;
var direTimer;
var radiantReserveTimer;
var direReserveTimer;

//Buttons
var startButton = document.getElementById('start');
startButton.addEventListener('click', function(e){
	socket.emit('start');
});

var stopButton = document.getElementById('reset');
stopButton.addEventListener('click', function(e){
	socket.emit('reset');
});

var captainButton = document.getElementById('save_captain_button');
captainButton.addEventListener('click', function(e){
	var userName = document.getElementById("captain_name").value;
	socket.emit('become_captain', userName);
});

var copyButton = document.getElementById('copy_draft');
copyButton.addEventListener('click', function(e){
	copyTextToClipboard(getDraftString());
});

var saveSettingsbutton = document.getElementById('save_settings_button');
saveSettingsbutton.addEventListener('click', function(e){
	var numHeroes = document.getElementById("settings_heroes_per_attribute").value;
	var numBans = document.getElementById("settings_num_bans").value;
	var startingFaction = document.getElementById("settings_starting_faction").value;
	var reserveTime = document.getElementById("settings_reserve_time").value;
	var increment = document.getElementById("settings_increment").value;
	socket.emit('settings_req', numHeroes, numBans, startingFaction,
		reserveTime, increment);
});

function getDraftString(){
	
	const dire = document.getElementById("dire_pick").getElementsByTagName('*');
	const radiant = document.getElementById("radiant_pick").getElementsByTagName('*');
	
	var str = "Radiant: ";
	//Indexing needs to be like this for some reason
	for (var i = 1; i < radiant.length; i++){
		str = str + radiant[i].id + ", ";
    }
	
	str = str + "\nDire: "
	for (var i = 1; i < dire.length; i++){
		str = str + dire[i].id + ", ";
    }
	return str;
}

function copyTextToClipboard(text) {
	
	var textArea = document.createElement("textarea");

	// Probably don't need all of this styling.
	// Place in the top-left corner of screen regardless of scroll position.
	textArea.style.position = 'fixed';
	textArea.style.top = 0;
	textArea.style.left = 0;

	// Ensure it has a small width and height. Setting to 1px / 1em
	// doesn't work as this gives a negative w/h on some browsers.
	textArea.style.width = '2em';
	textArea.style.height = '2em';

	// We don't need padding, reducing the size if it does flash render.
	textArea.style.padding = 0;

	// Clean up any borders.
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';

	// Avoid flash of the white box if rendered for any reason.
	textArea.style.background = 'transparent';

	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try{
		var successful = document.execCommand('copy');
		var msg = successful ? 'successful' : 'unsuccessful';
	} 
	catch (err){
		console.log('Could not copy text to clipboard');
	}
	document.body.removeChild(textArea);
}

		
//Event handling
socket.on('start', function(heroes){
	setImages(heroes[0], heroes[1], heroes[2], heroes[3]);
});

socket.on('reset', function(){
	resetState()
});
		
function sendPickEvent(id){
	socket.emit('pick', id);
}
		
socket.on('pick', function(phase, faction, child_id){
	const parent_id = faction + '_' + phase;
	
	document.getElementById(parent_id).appendChild(document.getElementById(child_id));
});

socket.on('radiant_timer_start', function(initialValue){
	radiantTimer = startTimer("radiant_timer", "Timer: ", initialValue);
});

socket.on('radiant_timer_stop', function(){
	clearInterval(radiantTimer); 
});

socket.on('dire_timer_start', function(initialValue){
	direTimer = startTimer("dire_timer", "Timer: ", initialValue);
});
socket.on('dire_timer_stop', function(){
	clearInterval(direTimer); 
});

socket.on('radiant_reserve_start', function(initialValue){
	radiantReserveTimer = startTimer("radiant_reserve", "Reserve: ", initialValue);
});

socket.on('radiant_reserve_timer_stop', function(){
	clearInterval(radiantReserveTimer); 
});

socket.on('dire_reserve_start', function(initialValue){
	direReserveTimer = startTimer("dire_reserve", "Reserve: ", initialValue);
});

socket.on('dire_reserve_timer_stop', function(){
	clearInterval(direReserveTimer); 
});

socket.on('update_radiant_captain', function(user_name){
	document.getElementById("radiant_captain").innerHTML = "Captain: " + user_name;
});

socket.on('update_dire_captain', function(user_name){
	document.getElementById("dire_captain").innerHTML = "Captain: " + user_name;
});

socket.on('update_status', function(faction, phase){
	document.getElementById("draft_status").innerHTML = `Status: ${faction} ${phase}`;
});

initialState()

//Helper funcs - move to some other file later
function startTimer(id, string, initialVal){
	var timerId = setInterval(function(){
	  if(initialVal <= 0){
		clearInterval(timerId);
	  }
	  document.getElementById(id).innerHTML = string + initialVal;
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
	
	var h2 = document.createElement('h4');
    h2.innerHTML= "Available heroes" ;
	document.getElementById("available_heroes").appendChild(h2);
	
	h2 = document.createElement('h4');
    h2.innerHTML= "Radiant bans" ;
	document.getElementById("radiant_ban").appendChild(h2);
	
	h2 = document.createElement('h4');
    h2.innerHTML= "Radiant picks";
	document.getElementById("radiant_pick").appendChild(h2);
	
	h2 = document.createElement('h4');
    h2.innerHTML= "Dire bans" ;
	document.getElementById("dire_ban").appendChild(h2);
	
	h2 = document.createElement('h4');
    h2.innerHTML= "Dire picks" ;
	document.getElementById("dire_pick").appendChild(h2);
}

function resetState(){
	
	document.getElementById("available_heroes").replaceChildren();
	document.getElementById("radiant_ban").replaceChildren();
	document.getElementById("radiant_pick").replaceChildren();
	document.getElementById("dire_ban").replaceChildren();
	document.getElementById("dire_pick").replaceChildren();
	document.getElementById("radiant_captain").innerHTML = "Captain: none";
	document.getElementById("dire_captain").innerHTML = "Captain: none";
	document.getElementById("draft_status").innerHTML = "Status: waiting to start";
	document.getElementById("radiant_timer").innerHTML = "Time:";
	document.getElementById("dire_timer").innerHTML = "Time:";
	document.getElementById("radiant_reserve").innerHTML = "Reserve:";
	document.getElementById("dire_reserve").innerHTML = "Reserve:";
	
	initialState()
}
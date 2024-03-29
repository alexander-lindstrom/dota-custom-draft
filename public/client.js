var socket = io();
var radiantTimer;
var direTimer;
var radiantReserveTimer;
var direReserveTimer;
var currHLParent;

//Buttons
var startButton = document.getElementById('start');
startButton.addEventListener('click', function(e){
	socket.emit('start');
});

var resetButton = document.getElementById('reset');
resetButton.addEventListener('click', function(e){
	socket.emit('reset');
});

var captainButton = document.getElementById('save_captain_button');
captainButton.addEventListener('click', function(e){
	var userName = document.getElementById("captain_name").value;
	var faction = document.getElementById("captain_faction").value;
	socket.emit('become_captain', userName, faction);
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

var selectHeroButton = document.getElementById('select_hero_button');
selectHeroButton.addEventListener('click', function(e){
	if(currHLParent){
		let heroId = document.getElementById(currHLParent).childNodes[0].id.split(':')[1];
		sendPickEvent(heroId);
	}
});

function getDraftString(){
	
	const dire = document.getElementById("dire_pick").getElementsByTagName('*');
	const radiant = document.getElementById("radiant_pick").getElementsByTagName('*');
	
	var str = "Radiant: ";
	//Indexing needs to be like this for some reason
	for (var i = 1; i < radiant.length; i+=2){
		str = str + radiant[i].id + ", ";
    }
	
	str = str + "\nDire: "
	for (var i = 1; i < dire.length; i+=2){
		str = str + dire[i].id + ", ";
    }
	return str.replace(/,(?=[^,]*$)/, '');
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

function sendPickEvent(id){
	socket.emit('pick', id);
}

//Event handling
socket.on('start', function(heroes, order, settings){
	setImages(heroes[0], heroes[1], heroes[2], heroes[3]);
	currHLParent = getHLP(order, settings, 0);
	setTimeline(order.turn, settings.numBans);
	setReserve(settings.radiantReserve, settings.direReserve);
});

socket.on('reset', function(settings){
	resetState(settings);
});
		
socket.on('pick', function(order, settings, heroId){
	pick(order, settings, heroId);
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

socket.on('radiant_reserve_stop', function(){
	clearInterval(radiantReserveTimer); 
});

socket.on('dire_reserve_start', function(initialValue){
	direReserveTimer = startTimer("dire_reserve", "Reserve: ", initialValue);
});

socket.on('dire_reserve_stop', function(){
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

socket.on('settings_update', function(settings){
	updateSettingsModal(settings);
	updateBanPlaceholders(settings.numBans);
	setReserve(settings.radiantReserve, settings.direReserve);
});

socket.on('current_state', function(order, state, settings, timeLeft){
	setupState(order, state, settings, timeLeft);
	setTimeline(order.turn, settings.numBans);
	setReserve(settings.radiantReserve, settings.direReserve);
});

socket.on('update_status', function(faction, phase){
	document.getElementById("draft_status").innerHTML = `Status: ${faction} ${phase}`;
});

initialState()

function pick(order, settings, heroId){

	var childElement = document.getElementById(heroId);
	childElement.onclick = null;
	document.getElementById(currHLParent).replaceChildren(childElement);
	currHLParent = getHLP(order, settings, 1);
}

function setReserve(radiantReserve, direReserve){

	document.getElementById("radiant_reserve").innerHTML = "Reserve: " + radiantReserve;
	document.getElementById("dire_reserve").innerHTML = "Reserve: " + direReserve;
}

function getHLP(order, settings, increment){

	if(!order || !order.turn || !order.phase){
		return null;
	}
	let index = order.index + increment;
	if(index >= 5*2 + settings.numBans * 2){
		return null;
	}
	let phase = order.phase[index];
	let faction = order.turn[index];
	if(phase === 'pick'){
		index -= 2*settings.numBans;
	}
	let id = Math.floor(index/2);
	return `${faction}_${phase}_${id}`;
}

// When a new user connects for example
function setupPick(faction, phase, heroId, index, numBans){

	const parentId = faction + '_' + phase + '_' + index;
	var elem = document.createElement("img");
	elem.src = '/assets/images/' + heroId + '.webp';
	elem.id = heroId;
	document.getElementById(parentId).appendChild(elem);
}

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

function updateHighlightedHero(heroId){

	var newChild = document.createElement("img");		
	newChild.src = '/assets/images/' + heroId + '.webp';
	newChild.id = "highlighted:" + heroId;
	newChild.setAttribute("class", "highlight");
	currHighlightId = newChild.id;

	var parent = document.getElementById(currHLParent);
	if(parent){
		parent.replaceChildren(newChild);
	}
}
function setTimeline(myOrder, bans){
	if(!myOrder){
		return;
	}
	document.getElementById("timeline").innerHTML  = "";
	myOrder.forEach(function(side, i){
		var elem = document.createElement("div");
		var elemR = document.createElement("span");
		elem.className = ((i+1) > (bans * 2 ) ? side : side + " ban_box");
		elem.appendChild(elemR);
		document.getElementById("timeline").appendChild(elem);
	})
}
function setImages(strHeroes, agiHeroes, intHeroes, uniHeroes){
	
	strHeroes.forEach(function(e){
		var elem = document.createElement("img");		
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			updateHighlightedHero(elem.id);
		}
		document.getElementById("available_heroes_str").appendChild(elem);
	});
			
	agiHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			updateHighlightedHero(elem.id);
		}
		document.getElementById("available_heroes_agi").appendChild(elem);
	});
	
	intHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			updateHighlightedHero(elem.id);
		}
		document.getElementById("available_heroes_int").appendChild(elem);
	});
	
	uniHeroes.forEach(function(e){
		var elem = document.createElement("img");
		elem.src = '/assets/images/' + e + '.webp';
		elem.id = e;
		elem.onclick = function(a){
			updateHighlightedHero(elem.id);
		}
		document.getElementById("available_heroes_uni").appendChild(elem);
	});
}

function updateSettingsModal(settings){
	document.getElementById("settings_heroes_per_attribute").value = settings.heroesPerType;
	document.getElementById("settings_num_bans").value = settings.numBans;
	document.getElementById("settings_starting_faction").value = settings.startingFaction;
	document.getElementById("settings_reserve_time").value = settings.radiantReserve;
	document.getElementById("settings_increment").value = settings.pickTime;
}

function updateBanPlaceholders(numBans){

	let radiant = document.getElementById("radiant_ban");
	radiant.replaceChildren();
	let dire = document.getElementById("dire_ban");
	dire.replaceChildren();

	for(let i = 0; i < numBans; i++) {
		let ri = document.createElement("div");
		ri.setAttribute("class", "img_holder_ban");
		ri.setAttribute("id", "radiant_ban_" + i);
		radiant.appendChild(ri);

		let di = document.createElement("div");
		di.setAttribute("class", "img_holder_ban");
		di.setAttribute("id", "dire_ban_" + i);
		dire.appendChild(di);
	}
}

function setupState(order, state, settings, timeLeft){

	if(state.availableHeroes){
		setImages(state.availableHeroes[0], state.availableHeroes[1], 
			state.availableHeroes[2], state.availableHeroes[3]);
	}

	updateBanPlaceholders(settings.numBans);
	currHLParent = getHLP(order, settings, 0);

	if(order.turn && order.phase){
		var faction = order.turn[order.index];
		var phase = order.phase[order.index];
		if(!faction || !phase){
			document.getElementById("draft_status").innerHTML = "Status: draft ended";
		}
		else{
			document.getElementById("draft_status").innerHTML = `Status: ${faction} ${phase}`;
		}

		for(let i = 0; i < state.radiantPicks.length; i++){
			setupPick('radiant', 'pick', state.radiantPicks[i], i, settings.numBans);
		}
		for(let i = 0; i < state.radiantBans.length; i++){
			setupPick('radiant', 'ban', state.radiantBans[i], i, settings.numBans);
		}
		for(let i = 0; i < state.direPicks.length; i++){
			setupPick('dire', 'pick', state.direPicks[i], i, settings.numBans);
		}
		for(let i = 0; i < state.direBans.length; i++){
			setupPick('dire', 'ban', state.direBans[i], i, settings.numBans);
		}
	}

	updateSettingsModal(settings);

	if(state.radiantCaptainName){
		document.getElementById("radiant_captain").innerHTML = "Captain: " +
			state.radiantCaptainName;
	}
	if(state.direCaptainName){
		document.getElementById("dire_captain").innerHTML = "Captain: " +
			state.direCaptainName;
	}
	
	switch(state.timer){
		case 'not_started':
			//No need
			break;
		case 'radiant_pick':
			radiantTimer = startTimer("radiant_timer", "Timer: ", timeLeft);
			break;
		case 'radiant_reserve':
			radiantReserveTimer = startTimer("radiant_reserve", "Timer: ", timeLeft);
			break;
		case 'dire_pick':
			direTimer = startTimer("dire_timer", "Timer: ", timeLeft);
			break;
		case 'dire_reserve':
			direReserveTimer = startTimer("dire_reserve", "Timer: ", timeLeft);
			break;
		default:
			console.log("Invalid timer state!");
	}
}

function setPickPlaceHolders(){

	let radiant = document.getElementById("radiant_pick");
	radiant.replaceChildren();
	let dire = document.getElementById("dire_pick");
	dire.replaceChildren();

	for(let i = 0; i < 5; i++) {
		let ri = document.createElement("div");
		ri.setAttribute("class", "img_holder_pick");
		ri.setAttribute("id", "radiant_pick_" + i);
		radiant.appendChild(ri);

		let di = document.createElement("div");
		di.setAttribute("class", "img_holder_pick");
		di.setAttribute("id", "dire_pick_" + i);
		dire.appendChild(di);
	}
}

function initialState(){
	
	var h2 = document.createElement('h6');
	h2.innerHTML= "Strength";
	document.getElementById("available_heroes_str").appendChild(h2);
	h2 = document.createElement('h6');
	h2.innerHTML= "Agility";
	document.getElementById("available_heroes_agi").appendChild(h2);
	h2 = document.createElement('h6');
	h2.innerHTML= "Intelligence";
	document.getElementById("available_heroes_int").appendChild(h2);
	h2 = document.createElement('h6');
	h2.innerHTML= "Universal";
	document.getElementById("available_heroes_uni").appendChild(h2);

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

	let numBans = document.getElementById("settings_num_bans").value;
	updateBanPlaceholders(numBans);
	setPickPlaceHolders();
}

function resetState(settings){

	document.getElementById("available_heroes_str").replaceChildren();
	document.getElementById("available_heroes_agi").replaceChildren();
	document.getElementById("available_heroes_int").replaceChildren();
	document.getElementById("available_heroes_uni").replaceChildren();
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
	document.getElementById("timeline").innerHTML  = "";
	updateSettingsModal(settings)
	
	initialState()
}
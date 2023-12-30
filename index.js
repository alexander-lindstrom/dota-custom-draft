const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const port = process.env.PORT || 3000;
const fs = require('fs');

const dir = path.join(__dirname, '/public');
app.use(express.static(dir));

let turnOrder;
let phaseOrder;
let index = 0;

//Default values
const defaultStartingFaction = 'Random';
const defaultPickTime = 30;
const defaultReserveTime = 130;
const defaultHeroesPerType = 7;
const defaultNumBans = 3;

//Values that may be updated by using the settings modal
let startingFaction = defaultStartingFaction;
let pickTime = defaultPickTime;
let radiantReserve = defaultReserveTime;
let direReserve = defaultReserveTime;
let heroesPerType = defaultHeroesPerType;
let numBans = defaultNumBans;

const gracePeriod = 1;
var timer;
var availableHeroes;
var timerState = "not_started";
var radiantCaptain;
var direCaptain;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

function resetState(){
	
	index = 0;
	clearTimeout(timer);
	availableHeroes = undefined;
	radiantReserve = defaultReserveTime;
	direReserve = defaultReserveTime;
	timerState = "not_started";
	radiantCaptain = undefined;
	direCaptain = undefined;
	startingFaction = defaultStartingFaction;
	pickTime = defaultPickTime;
	heroesPerType = defaultHeroesPerType;
	numBans = defaultNumBans;
	stopAllTimers()
}

io.on('connection', (socket) => {
	
  socket.on('start', ()  => {
	
	if(radiantCaptain === undefined || direCaptain === undefined || timerState !== "not_started"){
		return;
	}
	availableHeroes = selectHeroes(heroesPerType);
	turnOrder = getTurnOrder(startingFaction, numBans);
	phaseOrder = getPhaseOrder(numBans);
	io.emit('start', availableHeroes);
	if(turnOrder[index] === 'radiant'){
		io.emit('radiant_timer_start', pickTime);
		timerState = "radiant_pick";
	}
	else{
		io.emit('dire_timer_start', pickTime);
		timerState = "dire_pick";
	}
	io.emit('update_status', turnOrder[index], phaseOrder[index]);
	timer = setTimeout(timerExpiration, (pickTime+gracePeriod)*1000, availableHeroes);
	
  });
  
  socket.on('reset', (user_id)  => {
	handleReset()
	io.emit('reset');
	
  });
  
  socket.on('pick', (user_id, id)  => {
	handlePickEvent(user_id, id)
  });
  
  socket.on('become_captain', (user_id)  => {
	handleCaptainReq(user_id)
  });

  socket.on('settings_req', (user_id, num_heroes, num_bans, 
		starting_faction, reserve_time, increment)  => {
	handleSettingsReq(user_id, num_heroes, num_bans, starting_faction,
		reserve_time, increment);
  });
  
  socket.on('reset', (user_id)  => {
	handleReset(user_id)
  });
  
});

function handlePickEvent(user_id, hero_id){
	
	if (!validPick(user_id) || draftEnded() === true){
		return;
	}
	stopCurrentTimer()
	clearTimeout(timer);
	processPick(hero_id);
	if (draftEnded() === false){
		startNewTimer();
	}
}

function handleCaptainReq(user_id){
	
	if (radiantCaptain === undefined){
		radiantCaptain = user_id;
		io.emit('update_radiant_captain', user_id);
	}
	else if(direCaptain === undefined && user_id !== radiantCaptain){
		direCaptain = user_id;
		io.emit('update_dire_captain', user_id);
	}
	else{
		console.log("Captain req not accepted");
	}
}

function handleSettingsReq(user_id, num_heroes, num_bans, starting_side,
		reserve_time, increment){
	if(timerState !== "not_started"){
		return;
	}
	if(radiantCaptain !== user_id && direCaptain !== user_id){
		return;
	}

	heroesPerType = parseInt(num_heroes);
	numBans = parseInt(num_bans);
	startingFaction = starting_side;
	radiantReserve = parseInt(reserve_time);
	direReserve = parseInt(reserve_time);
	pickTime = parseInt(increment);
}

//Only allowing captains to reset would lead to the page getting stuck all the time. 
//For now let anyone.
function handleReset(user_id){
	resetState()
}

function timerExpiration(availableHeroes) {
	
	switch(timerState){
	case 'radiant_pick': 
		if (radiantReserve > 0){
			timerState = "radiant_reserve";
			io.emit('radiant_timer_stop');
			io.emit('radiant_reserve_start', radiantReserve);
			timer = setTimeout(timerExpiration, (radiantReserve+gracePeriod)*1000, availableHeroes);
			return
		}
		else{
			fullTimeout();
		}
		break;
	case 'dire_pick':
		if (direReserve > 0){
			timerState = "dire_reserve";
			io.emit('dire_timer_stop');
			io.emit('dire_reserve_start', direReserve);
			timer = setTimeout(timerExpiration, (direReserve+gracePeriod)*1000, availableHeroes);
			return;
		}
		else{
			fullTimeout();
		}
		break;
	case 'radiant_reserve':
		radiantReserve = 0;
		fullTimeout();
		break;
	case 'dire_reserve':
		
		direReserve = 0;
		fullTimeout();
		break;
	case 'draft_ended':
		stopAllTimers();
		break;
		
	default:
		console.log(timerState)
	}
}

function fullTimeout(){
	
	processPick(getRandom(availableHeroes.flat(), 1)[0])
	stopAllTimers();
	if (draftEnded() === false){
		startNewTimer();
	}
}

function startNewTimer(){
	
	if (turnOrder[index] === 'radiant'){
		io.emit('radiant_timer_start', pickTime);
		timerState = "radiant_pick";
	}
	else{
		io.emit('dire_timer_start', pickTime);
		timerState = "dire_pick";
	}
	timer = setTimeout(timerExpiration, (pickTime+gracePeriod)*1000, availableHeroes);
}

function stopCurrentTimer(){
	
	if (turnOrder[index] === 'radiant' && timerState === "radiant_pick"){
		io.emit('radiant_timer_stop');
	}
	else if (turnOrder[index] === 'radiant' && timerState === "radiant_reserve"){
		io.emit('radiant_reserve_stop');
	}
	else if (turnOrder[index] === 'dire' && timerState === "dire_pick"){
		io.emit('dire_timer_stop');
	}
	else if (turnOrder[index] === 'dire' && timerState === "dire_reserve"){
		io.emit('dire_reserve_stop');
	}
}

function stopAllTimers(){
	io.emit('dire_reserve_stop');
	io.emit('radiant_reserve_stop');
	io.emit('dire_timer_stop');
	io.emit('radiant_timer_stop');
}

function processPick(id){
	
	const phase = phaseOrder[index];
	const faction = turnOrder[index];
	
	updateHeroList(id);
	io.emit('pick', phase, faction, id);
	index++;
	if (draftEnded()){
		timerState = "draft_ended";
		console.log("The draft has ended");
		clearTimeout(timer);
		stopAllTimers()
	}
	else{
		io.emit('update_status', turnOrder[index], phaseOrder[index]);
	}
}

function draftEnded(){
	return index === phaseOrder.length;
}


function updateHeroList(id){
	
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < availableHeroes[i].length; j++){
			if (availableHeroes[i][j] === id){
				availableHeroes[i].splice(j,1);
				return;
			}
		}
	}
	console.log("Hero not found when updating the list - something is wrong")
}

function validPick(user_id){
	
	const turn = turnOrder[index];
	if (turn === 'radiant'){
		return user_id === radiantCaptain;
	}
	else{
		return user_id === direCaptain;
	}
}

function getTurnOrder(startingFaction, numBans){
	var radiantPickOrder = ['radiant', 'dire', 'dire', 'radiant', 'radiant', 
		'dire', 'dire', 'radiant', 'radiant', 'dire'];
	var direPickOrder = ['dire', 'radiant', 'radiant', 'dire', 'dire', 'radiant', 
		'radiant', 'dire', 'dire', 'radiant'];
	var radiantBanOrder = "radiant,dire,".repeat(numBans).replace(/,(?=[^,]*$)/, '').split(',');
	var direBanOrder = "dire,radiant,".repeat(numBans).replace(/,(?=[^,]*$)/, '').split(',');
	switch(startingFaction){
		case 'Radiant':
			return radiantBanOrder.concat(radiantPickOrder);
		case 'Dire':
			return direBanOrder.concat(direPickOrder);
		case 'Random':
			if(Math.round(Math.random())){
				return direBanOrder.concat(direPickOrder);
			}
			else{
				return radiantBanOrder.concat(radiantPickOrder);
			}
	}
}

function getPhaseOrder(numBans){
	var pickOrder = "pick,".repeat(10).replace(/,(?=[^,]*$)/, '').split(',');
	var banOrder = "ban,".repeat(2*numBans).replace(/,(?=[^,]*$)/, '').split(',');
	return banOrder.concat(pickOrder);
}

function selectHeroes(numPerType){

	strHeroes = selectHeroesOfType('strength', numPerType);
	agiHeroes = selectHeroesOfType('agility', numPerType);
	intHeroes = selectHeroesOfType('intelligence', numPerType);
	uniHeroes = selectHeroesOfType('universal', numPerType);
	
	return [strHeroes, agiHeroes, intHeroes, uniHeroes]
}

function selectHeroesOfType(type, numPerType){
	const path = 'public/assets/' + type + '.csv';
	const csv = fs.readFileSync(path).toString().trim().replace(/\s+/g, '');
	var arr = csv.split(',');
	return getRandom(arr, numPerType)
}

function getRandom(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});

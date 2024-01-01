const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const port = process.env.PORT || 3000;
const fs = require('fs');
const dir = path.join(__dirname, '/public');
app.use(express.static(dir));

const defaultOrder = {turn: undefined, phase: undefined, index: 0};
let order = structuredClone(defaultOrder);

const defaultSettings = {startingFaction: 'Random', pickTime: 30, radiantReserve: 130,
	direReserve: 130, heroesPerType: 7, numBans: 3};
let settings = structuredClone(defaultSettings);

const initialState = {availableHeroes: undefined, timer: 'not_started', 
	radiantCaptain: undefined, radiantCaptainName: undefined, direCaptain: undefined, 
	direCaptainName: undefined, radiantPicks: [], radiantBans: [], direPicks: [],
	direBans: []};
let state = structuredClone(initialState);

const gracePeriod = 1;
var timer;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

function resetState(){
	order = structuredClone(defaultOrder);
	state = structuredClone(initialState);
	settings = structuredClone(defaultSettings);
	clearTimeout(timer);
	stopAllTimers()
}

function sendState(userId){
	var timeLeft = getTimeLeft(timer);
	io.to(userId).emit('current_state', order, state, settings, timeLeft);
}

io.on('connection', (socket) => {

	sendState(socket.id);
	socket.on('start', ()  => {
		if(state.radiantCaptain === undefined || state.direCaptain === undefined 
			|| state.timer !== "not_started"){
			return;
		}
		state.availableHeroes = selectHeroes(settings.heroesPerType);
		order.turn = getTurnOrder(settings.startingFaction, settings.numBans);
		order.phase = getPhaseOrder(settings.numBans);
		io.emit('start', state.availableHeroes);
		if(order.turn[order.index] === 'radiant'){
			io.emit('radiant_timer_start', settings.pickTime);
			state.timer = "radiant_pick";
		}
		else{
			io.emit('dire_timer_start', settings.pickTime);
			state.timer = "dire_pick";
		}
		io.emit('update_status', order.turn[order.index], order.phase[order.index]);
		timer = setTimeout(timerExpiration, (settings.pickTime+gracePeriod)*1000, 
			state.availableHeroes);
	});
	
	socket.on('reset', ()  => {
		handleReset(socket.id)
		io.emit('reset');
	});
	
	socket.on('pick', (id)  => {
		handlePickEvent(socket.id, id)
	});
	
	socket.on('become_captain', (userName, faction)  => {
		handleCaptainReq(socket.id, userName, faction)
	});

	socket.on('settings_req', (num_heroes, num_bans, 
			starting_faction, reserve_time, increment)  => {
		handleSettingsReq(socket.id, num_heroes, num_bans, starting_faction,
			reserve_time, increment);
	});
	
	socket.on('reset', ()  => {
		handleReset(socket.id)
	});

	socket.on('disconnect', ()  => {
		if(socket.id === state.radiantCaptain){
			state.radiantCaptain = undefined;
			state.radiantCaptainName = undefined;
			io.emit('update_radiant_captain', '');
		}
		//When debugging it can be useful to be captain for both teams. So check dire
		//even if radiant was already a match.
		if(socket.id === state.direCaptain){
			state.direCaptain = undefined;
			state.direCaptainName = undefined;
			io.emit('update_dire_captain', '');
		}
	});
});

function handlePickEvent(user_id, hero_id){
	
	if (!validPick(user_id) || draftEnded() === true){
		return;
	}
	stopCurrentTimer()
	clearTimeout(timer);
	processPick(hero_id);
	if (!draftEnded()){
		startNewTimer();
	}
}

function handleCaptainReq(userId, userName, faction){
	
	switch (faction){
	case 'Radiant':
		if(state.radiantCaptain){
			console.log("Radiant already has a captain!");
			return;
		}
		state.radiantCaptain = userId;
		state.radiantCaptainName = userName;
		io.emit('update_radiant_captain', userName);
		break;
	case 'Dire':
		if(state.direCaptain){
			console.log("Dire already has a captain!");
			return;
		}
		state.direCaptain = userId;
		state.direCaptainName = userName;
		io.emit('update_dire_captain', userName);
		break;
	default:
		console.log("Invalid captain req!");
		return;
	}
}

function handleSettingsReq(user_id, num_heroes, num_bans, starting_side,
		reserve_time, increment){
	if(state.timer !== "not_started"){
		return;
	}
	if(state.radiantCaptain !== user_id && state.direCaptain !== user_id){
		return;
	}

	settings.heroesPerType = parseInt(num_heroes);
	settings.numBans = parseInt(num_bans);
	settings.startingFaction = starting_side;
	settings.radiantReserve = parseInt(reserve_time);
	settings.direReserve = parseInt(reserve_time);
	settings.pickTime = parseInt(increment);
}

//Only allowing captains to reset would lead to the page getting stuck all the time. 
//For now let anyone.
function handleReset(user_id){
	resetState()
}

function getTimeLeft(timeout){
	if(!timeout){
		return false;
	}
	return Math.ceil((timeout._idleStart + timeout._idleTimeout)/1000 - process.uptime());
}

function timerExpiration(availableHeroes) {
	
	switch(state.timer){
	case 'radiant_pick': 
		if (settings.radiantReserve > 0){
			state.timer = "radiant_reserve";
			io.emit('radiant_timer_stop');
			io.emit('radiant_reserve_start', settings.radiantReserve);
			timer = setTimeout(timerExpiration, (settings.radiantReserve+gracePeriod)*1000,
				availableHeroes);
			return
		}
		else{
			fullTimeout();
		}
		break;
	case 'dire_pick':
		if (settings.direReserve > 0){
			state.timer = "dire_reserve";
			io.emit('dire_timer_stop');
			io.emit('dire_reserve_start', settings.direReserve);
			timer = setTimeout(timerExpiration, (settings.direReserve+gracePeriod)*1000,
				availableHeroes);
			return;
		}
		else{
			fullTimeout();
		}
		break;
	case 'radiant_reserve':
		settings.radiantReserve = 0;
		fullTimeout();
		break;
	case 'dire_reserve':
		settings.direReserve = 0;
		fullTimeout();
		break;
	case 'draft_ended':
		stopAllTimers();
		break;
	default:
		console.log("Invalid state!")
	}
}

function fullTimeout(){
	
	processPick(getRandom(state.availableHeroes.flat(), 1)[0])
	stopAllTimers();
	if (draftEnded() === false){
		startNewTimer();
	}
}

function startNewTimer(){
	
	if (order.turn[order.index] === 'radiant'){
		io.emit('radiant_timer_start', settings.pickTime);
		state.timer = "radiant_pick";
	}
	else{
		io.emit('dire_timer_start', settings.pickTime);
		state.timer = "dire_pick";
	}
	timer = setTimeout(timerExpiration, (settings.pickTime+gracePeriod)*1000, 
		state.availableHeroes);
}

function stopCurrentTimer(){
	
	if (order.turn[order.index] === 'radiant' && state.timer === "radiant_pick"){
		io.emit('radiant_timer_stop');
	}
	else if (order.turn[order.index] === 'radiant' && state.timer === "radiant_reserve"){
		io.emit('radiant_reserve_stop');
	}
	else if (order.turn[order.index] === 'dire' && state.timer === "dire_pick"){
		io.emit('dire_timer_stop');
	}
	else if (order.turn[order.index] === 'dire' && state.timer === "dire_reserve"){
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
	
	const phase = order.phase[order.index];
	const faction = order.turn[order.index];
	
	updateHeroList(id);
	updatePicks(id, faction, phase);
	io.emit('pick', phase, faction, id);
	order.index++;
	if (draftEnded()){
		state.timer = "draft_ended";
		console.log("The draft has ended");
		clearTimeout(timer);
		stopAllTimers()
	}
	else{
		io.emit('update_status', order.turn[order.index], order.phase[order.index]);
	}
}

function updatePicks(id, faction, phase){
	if(faction === 'radiant'){
		if(phase === 'pick'){
			state.radiantPicks.push(id);
		}
		else{
			state.radiantBans.push(id);
		}
	}
	else{
		if(phase === 'pick'){
			state.direPicks.push(id);
		}
		else{
			state.direBans.push(id);
		}
	}
}

function draftEnded(){
	return order.index === order.phase.length;
}

function updateHeroList(id){
	
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < state.availableHeroes[i].length; j++){
			if (state.availableHeroes[i][j] === id){
				state.availableHeroes[i].splice(j,1);
				return;
			}
		}
	}
	console.log("Hero not found when updating the list - something is wrong")
}

function validPick(user_id){
	const turn = order.turn[order.index];
	if (turn === 'radiant'){
		return user_id === state.radiantCaptain;
	}
	else{
		return user_id === state.direCaptain;
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

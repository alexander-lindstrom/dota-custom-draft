const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const port = process.env.PORT || 3000;
const csv = require('jquery-csv');
const fs = require('fs');

const dir = path.join(__dirname, '/public');
app.use(express.static(dir));
const heroesPerType = 7;
const turnOrder = getTurnOrder('radiant');
const phaseOrder = getPhaseOrder();
var index = 0;
const startingFaction = 'radiant';
const pickTime = 30;
const reserveTime = 60;
const gracePeriod = 2; // Easy way to handle sync/delay issues.
var timer;
var availableHeroes;
var radiantReserve = reserveTime;
var direReserve = reserveTime;
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
	radiantReserve = reserveTime;
	direReserve = reserveTime;
	timerState = "not_started";
	radiantCaptain = undefined;
	direCaptain = undefined;
	stopAllTimers()
}

io.on('connection', (socket) => {
	
  socket.on('start', ()  => {
	
	if(radiantCaptain === undefined || direCaptain === undefined){
		return;
	}
	availableHeroes = selectHeroes(heroesPerType);
    io.emit('start', availableHeroes);
	io.emit('radiant_timer_start', pickTime); //todo: radiant shouldn't always start
	io.emit('update_radiant_status', 'active');
	timer = setTimeout(timerExpiration, (pickTime+gracePeriod)*1000, availableHeroes);
	timerState = "radiant_pick";
  });
  
  socket.on('reset', (user_id)  => {
	handleReset()
	io.emit('reset');
	
  });
  
  socket.on('pick', (id, user_id)  => {
	handlePickEvent(id, user_id)
  });
  
  socket.on('become_captain', (user_id)  => {
	handleCaptainReq(user_id)
  });
  
  socket.on('reset', (user_id)  => {
	handleReset(user_id)
  });
  
});

function handlePickEvent(hero_id, user_id){
	
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

//Only allowing captains to reset would lead to the page getting stuck all the time. For now let anyone.
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
			return
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
	updateStatus(turnOrder[index]);
}

function draftEnded(){
	return index === phaseOrder.length;
}

function updateStatus(faction){
	
	if (faction === 'radiant'){
		io.emit('update_radiant_status', 'active');
		io.emit('update_dire_status', 'waiting');
	}
	else{
		io.emit('update_dire_status', 'active');
		io.emit('update_radiant_status', 'waiting');
	}
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
	return true;
}

function getTurnOrder(startingFaction){
	
	var turnOrder = ['radiant', 'dire', 'radiant', 'dire', 'radiant', 'dire', 'radiant', 'dire',
		'dire', 'radiant', 'radiant', 'dire', 'dire', 'radiant', 'radiant', 'dire'];
	if (startingFaction === 'dire'){
		//Flip order
		turnOrder.map(x => x = (x==='radiant') ? 'dire' : 'radiant'); // this doesn't seem to work
	}
	return turnOrder
}

function getPhaseOrder(){
	return ['ban', 'ban', 'ban', 'ban', 'ban', 'ban', 'pick', 'pick', 'pick', 'pick',
		'pick', 'pick', 'pick', 'pick', 'pick', 'pick'];
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

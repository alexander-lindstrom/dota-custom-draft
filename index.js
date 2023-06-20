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
var index = 0;
const startingFaction = 'radiant';
const pickTime = 10;
const reserveTime = 10;
var timer;
var availableHeroes;
var radiantReserve = reserveTime;
var direReserve = reserveTime;
var timerState = "not_started";

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
	
  socket.on('start', ()  => {
	availableHeroes = selectHeroes(heroesPerType);
    io.emit('start', availableHeroes);
	io.emit('radiant_timer_start', pickTime); //todo: radiant shouldn't always start
	timer = setTimeout(timerExpiration, pickTime*1000, availableHeroes);
	timerState = "radiant_pick";
  });
  
  socket.on('stop', ()  => {
    io.emit('stop');
	io.emit('radiant_timer_stop');
	io.emit('dire_timer_stop');
	io.emit('radiant_reserve_stop');
	io.emit('dire_reserve_stop');
  });
  
  socket.on('pick', (id)  => {
	processPick(id)
  });
  
});

function timerExpiration(availableHeroes) {
  
	switch(timerState){
	case 'radiant_pick': 
		if (radiantReserve > 0){
			timerState = "radiant_reserve";
			io.emit('radiant_timer_stop');
			io.emit('radiant_reserve_timer_start', radiantReserve);
			timer = setTimeout(timerExpiration, radiantReserve*1000, availableHeroes);
			return
		}
		else{
			fullTimeout();
		}
		break;
	case 'dire_pick':
		console.log(direReserve)
		if (direReserve > 0){
			timerState = "dire_reserve";
			io.emit('dire_timer_stop');
			io.emit('dire_reserve_timer_start', direReserve);
			timer = setTimeout(timerExpiration, direReserve*1000, availableHeroes);
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
	
	processPick(getRandom(availableHeroes.flat(), 1))
	stopAllTimers();
	
	if (turnOrder[index] === 'radiant'){
		io.emit('radiant_timer_start', pickTime);
		timerState = "radiant_pick";
	}
	else{
		io.emit('dire_timer_start', pickTime);
		timerState = "dire_pick";
	}
	timer = setTimeout(timerExpiration, pickTime*1000, availableHeroes);
}

function stopAllTimers(){
	io.emit('dire_reserve_timer_stop');
	io.emit('radiant_reserve_timer_stop');
	io.emit('dire_timer_stop');
	io.emit('radiant_timer_stop');
}


function processPick(id){
	if (!validPick()){
		return 
	}
	const phaseOrder = getPhaseOrder();
	const turnOrder = getTurnOrder(startingFaction);
	
	const phase = phaseOrder[index];
	const faction = turnOrder[index];
	
	updateHeroList(id);

	io.emit('pick', phase, faction, id);
	
	index++;
	if (index === phaseOrder.length){
		timerState = "draft_ended";
		console.log("The draft has ended");
	}
}

function updateHeroList(id){
	
	for(var i = 0; i < 4; i++){
		for(var j = 0; j < heroesPerType; j++){
			if (availableHeroes[i][j] === id){
				availableHeroes[i].splice(j,1);
				return
			}
		}
	}
}

// at some point make it so only designated drafters are allowed to pick
function validPick(){
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

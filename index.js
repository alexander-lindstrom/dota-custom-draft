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
const heroesPerType = 5;
const turnOrder = getTurnOrder('radiant');
var index = 0;
const startingFaction = 'radiant';

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
	
  socket.on('start', ()  => {
	heroes = selectHeroes(heroesPerType);
    io.emit('start', heroes);
  });
  
  socket.on('stop', ()  => {
    io.emit('stop');
  });
  
  socket.on('pick', (id)  => {
	processPick(id)
  });
  
});

//Todo: 
//Add timer
//If the time runs out a hero is randomly selected and the change of state propagated to users.

function processPick(id){
	if (!validPick()){
		return 
	}
	const phaseOrder = getPhaseOrder();
	const turnOrder = getTurnOrder(startingFaction);
	
	const phase = phaseOrder[index];
	const faction = turnOrder[index];

	io.emit('pick', phase, faction, id);
	index++;
}

//do nothing unless the click is from the captain of the currently active team.
//also the draft is not over
function validPick(){
	return true;
}

function getTurnOrder(startingFaction){
	
	var turnOrder = ['radiant', 'dire', 'radiant', 'dire', 'radiant', 'dire', 'radiant', 'dire',
		'dire', 'radiant', 'radiant', 'dire', 'dire', 'radiant', 'radiant', 'dire'];
	if (startingFaction === 'dire'){
		//Flip order
		turnOrder.map(x => x = (x==='radiant') ? 'dire' : 'radiant'); //Not working properly it seems
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
	
	return [strHeroes, agiHeroes, intHeroes]
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

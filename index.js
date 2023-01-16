const app = require('express')();
const http = require('http').Server(app);
const csv = require('jquery-csv');
const fs = require('fs');
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

//If the time runs out a hero is randomly selected and the change of state propagated to users.

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  socket.on('start', ()  => {
	heroes = selectHeroes(9); //This value should be configurable
    io.emit('start', heroes);
  });
});

function selectHeroes(numPerType){

	strHeroes = selectHeroesOfType('strength', numPerType);
	agiHeroes = selectHeroesOfType('agility', numPerType);
	intHeroes = selectHeroesOfType('intelligence', numPerType);
	
	return [strHeroes, agiHeroes, intHeroes]
	
}

function selectHeroesOfType(type, numPerType){
	const path = 'data/heroes/' + type + '.csv';
	const csv = fs.readFileSync(path).toString().trim();
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

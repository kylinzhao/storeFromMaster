# how to use

let store = require('storeFromMaster');

## get

store.get('key').then((value) => {
    console.log(value)
})

## set

store.set('key', 'value').then((value) => {
    console.log(value)
})

# binding store in main process

var workers = {}

if( Cluster.isMaster ){

    for (var i = 0; i < numCPUs; i++) {
        var worker = Cluster.fork();
        workers[worker.process.pid] = worker;
    }

    require('storeFromMaster')['init'](workers);
}

let promiseList = {};

process.on('message', (msg)=> {
    if(msg && msg.key === 'storeFromMaster-callback' && msg.bizKey){
        promiseList[msg.bizKey] && promiseList[msg.bizKey].resolve(msg.data);
        delete promiseList[msg.bizKey];
    }
})

let _masterSendToWorker = (worker, type, data, params, ret, error) => {
    try{
        worker.send({
            key : 'storeFromMaster-callback',
            type : type,
            ret : ret || 'success',
            data : data,
            bizKey : params["bizKey"],
            error : null
        })
    }catch(e){
        _send(worker, type, data, params, 'fail', e)
    }
}

let _workerSendToMaster = (type, data) => new Promise((resolve,reject) => {
    let bizKey = `${data.key}-${type}-${Math.random()}`
    process.send({
        key : 'storeFromMaster',
        type : type,
        data : data,
        bizKey : bizKey
    })
    promiseList[bizKey] = {
        resolve : resolve,
        reject : reject
    }
})

module.exports = {
    init : (works) => {
        let store = {};

        var LRU = require("lru-cache"),
            options = {
                max: 1000,
                maxAge: 1000 * 60 * 60 * 24
            },
            cache = LRU(options);

        let worksList = (()=>{
            let key, list = [];
            for(key in works){
                list.push(works[key])
            }
            return list;
        })()
        worksList.forEach((worker)=>{
            // 为每一个子进程监听信息
            worker.on('message', (data)=>{
                if(data && data.key ==='storeFromMaster'){
                    if(data.type === 'set'){
                        cache.set(data.data['key'], data.data['value'])
                        _masterSendToWorker(worker, 'set', data.data, data)
                    }
                    if(data.type === 'get'){
                        _masterSendToWorker(worker, 'get', cache.get(data.data['key']) || '' , data)
                    }
                    if(data.type === 'remove'){
                        if(cache.has([data.data['key']])){
                            cache.del(store[data.data['key']])
                        }
                        _masterSendToWorker(worker, 'remove', data.data["key"], data)
                    }
                    if(data.type === 'getAll'){
                        _masterSendToWorker(worker, 'getAll', [cache.keys(), cache.values()] , data)
                    }
                }
            })

        })
    },
    set : (key, value) => _workerSendToMaster('set', {
        key : key,
        value : value
    }),
    get : (key) => _workerSendToMaster('get', {
        key : key
    }),
    remove : (key) => {
        return _workerSendToMaster('remove', {
            key : key
        })
    },
    getAll : () => {
        return _workerSendToMaster('getAll', {
            key : '__getAll__'
        })
    }
};

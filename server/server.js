const express = require('express');const http = require('http');
const webSocketServer = require('websocket').server;

const app = express();
app.get('/', function(req, res){
      res.send('hello world');
});
var server = http.createServer(app).listen(4000, function() {
      console.log('Express server listening');
});

var wsServer = new webSocketServer({  
    httpServer : server,
    // autoAcceptConnections : true
});

const WSSessionList = [];
let pageList = [];
let pageSeq = 1;
let pageBlockList = {};

wsServer.on('request', (request)=>{
    console.log('received request');
    let connection = request.accept();
    
    connection.on('message', function(message){ // id login 하고 난 후에 세션에 참여
        if(message.type === 'utf8'){
            const mdata = JSON.parse(message.utf8Data);
            const method = mdata.method;
            switch (method) {
                case 'login':
                    loginWSSession(connection, mdata.data);
                    break;
                case 'action' : 
                    receiveAction(connection, mdata);
                    break;
                case 'addPage' :
                    addPage();
                    break;
                case 'request_page':
                    sendPage(connection, mdata.data);
                    break;
                default:
                    break;
            }
        }
    });

    connection.on('close', function(){
        console.log('good bye.. ' +connection.sessionId);
        exitWSSession(connection.sessionId);
    });
});

function loginWSSession(connection,id){
    connection.sessionId = id;
    WSSessionList.push(connection);
    console.log(`${id} has login`);
    console.log(WSSessionList.length);
    const pageInit = {
        method : 'pageList',
        data : pageList
    };
    sendMessageToId(JSON.stringify(pageInit),id);
}

function addPage(){
    const newPageId = uid();
    const PageInfo = {
        id : newPageId,
        text : '페이지'+pageSeq++,
    }
    pageList.push(PageInfo);
    pageBlockList[newPageId] = [{
        id : uid(),
        text : '',
        isFocus : false
    }]
    const pageInit = {
        method : 'pageList',
        data : pageList
    };
    sendMessageAll(JSON.stringify(pageInit));
}

function sendPage(connection, pageId){
    const message = {
        method : 'response_page',
        data : pageBlockList[pageId]
    }
    console.log(pageBlockList[pageId]);
    connection.send(JSON.stringify(message));
};

function exitWSSession(id){
    WSSessionList.forEach((conn,i)=>{
        if(conn.sessionId == id){
            WSSessionList.splice(i,1);
            return;
        }
    });
    if(WSSessionList.length === 0) {
        reset();
    };
}

function sendMessageAll(message){
    console.log(message);
    WSSessionList.forEach((conn)=>{
        conn.sendUTF(message);
    })
}

function sendMessageExcId(message, id){
    console.log(message);
    WSSessionList.forEach((conn)=>{
        if(conn.sessionId !== id){
            conn.sendUTF(message);
        }
    })
}

function sendMessageToId(message, id){
    console.log(message);
    WSSessionList.forEach((conn)=>{
        if(conn.sessionId === id){
            conn.sendUTF(message);
        }
    })
}

function receiveAction(connection, mdata){
    // console.log(connection.sessionId)
    // console.log(action);
    doAction(mdata.pageId,mdata.data);
    sendMessageExcId(JSON.stringify(mdata), connection.sessionId);
    
}

function doAction(pageId,actionList){
    actionList.forEach((action)=>{
        switch (action.type) {
            case "insert":
                fnInsertAction(pageId, action);
                break;
            case "delete":
                fnDeleteAction(pageId, action);
                break;
            case "update":
                fnUpdateAction(pageId, action);
                break;
            default:
                break;
        }
    });
    console.log(pageBlockList[pageId]);
}

function fnInsertAction(pageId, action){
    fnCreateNewBlock(pageId, action.id, action.data);
}
function fnDeleteAction(pageId, action){
    fnDeleteBlock(pageId, action.id);
}
function fnUpdateAction(pageId, action){
    fnUpdateBlock(pageId, action.id, action.data);
}

function fnUpdateBlock(pageId, id, data){
    const orgBlcok = pageBlockList[pageId].find(block=> block.id === id ? true : false);
    orgBlcok.text = data.text ? data.text.replace('<br>','') : '';
}

function fnDeleteBlock(pageId,id){
    const idx = pageBlockList[pageId].findIndex(block=> block.id === id ? true : false);
    pageBlockList[pageId].splice(idx,1);
}

function fnCreateNewBlock(pageId,id, data ){
    const newBlock = {
        id : data.id,
        text : data.text ? data.text : '',
        isFocus : true
    }
    const idx = pageBlockList[pageId].findIndex(block=> block.id === id ? true : false);
    pageBlockList[pageId].splice(idx+1,0,newBlock);
}

function uid(){
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

function reset(){
    pageList = [];
    pageBlockList = {};
    pageSeq = 1;
}
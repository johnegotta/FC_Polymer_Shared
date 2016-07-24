importScripts("..../bower_components/firebase/firebase.js");

var kalamazoo = "mi";

class DataManager
{
 constructor()
 {
  this.fb = null;
  this.initialized = false;
  this.request = null;
  this.dataArrays=[];
 }
 initialize()
 {
   this.fb = new Firebase("https://focused0ne.firebaseio.com/events");
    setTimeout(()=>{this.createIndex("indexOfDatabases", 1, false, this.localDisplayedOfDBIndexSetter,this);},10);setTimeout(()=>{this.makeGrids(this.dataArraysCallBackSetter,this);},250);
   this.initialized = true;
 }
 ping(argRequest)
 {
  console.log("Data Manager Worker received ping");
  console.log("Data Manager Worker ping arg = " + argRequest.data.data);
  argRequest.data.data = "pinged";
  argRequest.data.status = "complete";
 }
 pong(argRequest)
 {
  console.log("Data Manager Worker received pong");
   console.log("Data Manager Worker pong arg = " + argRequest.data.data);
  argRequest.data.data = "ponged";
  argRequest.data.status = "complete";
 }
 getAllEvents(argRequest)
 {
  console.log("Data Manager Worker received getAllEvents");
  this.request = argRequest;
  this.fb.once("value", this.handleEvents, this);
 }
 handleEvents(argSnapshot)
 {
  console.log("Data Manager Worker", argSnapshot.val());
  this.request.data.data = argSnapshot.val();
  this.request.data.status = "complete";
  postMessage(this.request.data);
 }
createColumnsAndRows(cells){          
                     var topArray=[];
                     var lastVal=cells.length-1;
                     var grid =cells.reduce((pre, val, i, arr)=>{
                       var valKeys=val.id.split("_"); 
                        if(pre.length==0)
                          {
                            pre.push(val); 
                            return pre;
                            }
                        else {  
                                var last=pre.length-1;
                                var keys=pre[last].id.split("_");
                                var valKeys=val.id.split("_");
                                }
                                if(keys[1]==valKeys[1]&&i!==(lastVal))
                                { 
                                  pre.push(val); return pre;
                                }
                                else if(keys[1]!=valKeys[1]){
                                  topArray.push(pre); 
                                  var newArr=[];
                                  newArr.push(val);
                                  return newArr;
                                }
                                else if(i==(lastVal)&&keys[1]==valKeys[1]){
                                  pre.push(val);
                                  topArray.push(pre);
                                  return topArray;
                                }
                                else if(i==(lastVal)&&keys[1]!=valKeys[1]){
                                  topArray.push(pre); 
                                  var newArr=[];
                                  newArr.push(val);
                                  topArray.push(newArr);
                                  return topArray;
                                }         
                          }, []);
                     return grid;
      }
    getObjectStore(name,version, asGrid, callbackSetter){
        var query;
        var request;
        
        if(version){
        request = indexedDB.open(name, version);
        }
        else{
          request = indexedDB.open(name, undefined);
        }
        request.onerror = function(e){
            console.log("Unable to retrieve data from database!, will tryAgain");
            request= indexedDB.open(name, undefined);

            request.onerror = function(e){
                console.log("SECOND FAILURE ON DATABASE", name, "WE WILL NOT ATTEMPT TO RETRIEVE DATA AGAIN VIA THIS QUERRY");
            };
            request.onsuccess = function(event){
                 
                console.log("success");
                var db = event.target.result;
                var transaction = db.transaction("cell", "readonly");
                var objectStore = transaction.objectStore("cell");
                query = objectStore.getAll();
                
                query.onerror=function(quev){
                    console.log("After initially opening the database, we have failed to query the object store.  Please try again later");
                };
                query.onsuccess = function(queryEvent){
                  if(asGrid===true){
                   
                   var cells = queryEvent.target.result;
                    this[name]=this.createColumnsAndRows(cells);
                    callbackSetter(this[name],this);
                  }
                  else{
                       
                        this[name]=queryEvent.target.result;
                        callbackSetter(this[name], this);
                      }
                }.bind(this);
            }.bind(this);
          }.bind(this);
        request.onsuccess = function(event){
            var db = event.target.result;
            var transaction = db.transaction("cell", "readonly");
            var objectStore = transaction.objectStore("cell");
            query = objectStore.getAll();
            
            query.onsuccess = function(queryEvent){
               if(asGrid===true){
                   var cells = queryEvent.target.result;
                  
                    this[name] =this.createColumnsAndRows(cells);
                    callbackSetter(this[name], this);
                    console.log(this[name],"this shit is the grid");
                  }
                  else{ 
                        this[name]=queryEvent.target.result;
                       callbackSetter(this[name], this);
                      }
            }.bind(this);
        }.bind(this);
      }
    createIndex(indexName,indexVersion){
      this.getObjectStore("indexOfDatabases",1, false, this.localDisplayedOfDBIndexSetter);   
      }
    makeGrids(setter, context){
      console.log(context,"this", this);
      var index=(this.indexOfDatabases&&this.indexOfDatabases.length>0)?this.indexOfDatabases:context.indexOfDatabases;
      console.log("index", index);
        for(var i=0;i<index.length;i++){
        var name=index[i].name;
        var version=index[i].version;
        this.getObjectStore(name, version, true,setter,context); 
        }
      }
    dataArraysCallBackSetter(query, context){context.dataArrays.push(query);}
    localDisplayedOfDBIndexSetter(query, context){
            var databases=[];
            console.log(query);
            var databasesIndex=query.map(function(val,i){
                  var version =(val.version!=undefined)?val.version:undefined;
                  var flag=false;
                  var databases={
                    "name": val.name,
                    "version": version, 
                    "columns": val.columns,
                    "rows": val.rows,
                    "size": val.size,
                    "value": val.value,
                    "key": val.key,
                    "time": 0,
                    "changeFlag":flag
                  };
                  return databases;
                });
          
            context.indexOfDatabases=databasesIndex;
            console.log(context.indexOfDatabases);
      }
    createGridOfDataArrays(){



    }
    createObjectStoresForDataArrays(){


    }
    updateObjectStoreByPuttingNewObjects(name, version,replacementArray){
      var request=indexedDB.open(name, version);
      request.onerror = (e)=>{
                  console.log("Unable to retrieve data from database. We have stopped propogation of events, but will attempt again to access the newest version of the requested database!");
                  e.stopPropogation();
                  var request=indexedDB.open(name, undefined);
                  request.onerror = (ev)=>{ 
                          console.log("This is the second failed ATTEMPT.  NO MORE ATTEMPTS WILL BE MADE AT THIS TIME. Please attempt to access your data at a later time.");e.stopPropogation();
                  };
                  request.onsuccess =(event)=>{
                          var db = event.target.result;
                          var transaction = db.transaction("cell", "readwrite");
                          var objectStore = transaction.objectStore("cell");
                          replacementArray.forEach(function(ref){
                                  objectStore.put(ref);
                            });
                          console.log("SUCCESS!!");
                  };
      },
      request.onsuccess =(event)=>{
            var db = event.target.result;
            var transaction = db.transaction("cell", "readwrite");
            var objectStore = transaction.objectStore("cell");
            replacementArray.forEach(function(ref){
                    objectStore.put(ref);
              });
            console.log("SUCCESS!! FIRST TRY!!");
        };
    }
    deleteObjectStore(name, version){    
      var vers=(name.indexOf("__")<0)?undefined:version;
      var openRequest=indexedDB.open(name, undefined);
      openRequest.onupgradeneeded = function(event) {
            var db = event.target.result;
      db.onerror = function(event){
          console.log("this function already assumes an undefined version. As a result we will not try a second time to retrieve your data. FAILURE!");
        };
      db.deleteObjectStore(name);
    };

  }
}

var dm = new DataManager();

//handler for all incoming requests from main thread
//expecting request to have this format:
//   {
//  data: {
//   data: somePayload,
//   requestType: typeOfRequestString
//  }
//  }
//
//response to request will have this format:
//   {
//  data: {
//   data: resultsObject,
//   requestType: sameTypeAsRequested
//   status: "complete" | "received" | "failed" | "badType"
//  }
//  }
onmessage = function(argRequest){ 
 if(!dm.initialized)
 {
  dm.initialize()
 }
 console.log("received Worker request", argRequest);
 var req = argRequest;
 if(dm[req.data.requestType])
 {
  req.data.status = "received";
  //send a 'received' status unless synchronous call above completed request
  dm[req.data.requestType](req);
 }
 else
 {
  req.data.status = "badType";
  console.log("Data Manager Worker does not handle " + req.data.requestType + " requests");
 }
 postMessage(req.data);
};
function dora_query_object(){
    this.type; //list, range, boolean, exist
    this.name;
    this.values = [];
    this.enabled = false;//only query on this if enabled
}

function dora_database_query(doradb){
    this.cdb = doradb;
    this.last_results = {}; //results from previous query
    
    this.dora_object_ids = []; //the dora object ids to query on
    
    //default callback if call specific callback not set
    this.default_callback= function(docs){console.log(docs);}
    this.attributes = []; //list of query objects for attributes
    this.stats = []; //list of query objects for stats
    
    this.clust_type; //current cluster type
    this.clusters = []; //list of query objects by cluster type
    
    this.parameters_updated = false;
    this.paramquery_started = false; //acts as a simplex so we don't call query to many times
                                    //if the parameters are changing a lot
}

//returns all dora_objects in database
dora_database_query.prototype.all = function(callback){
    parent = this;
    //make index
    this.cdb.db.createIndex({index: {fields: ["dora_object"]}}, function(err,res){
        if(err) console.log(err)
        else{
            sel = {"dora_object": {$eq: "true"}};
            parent.cdb.db.find({selector: sel},function(err,res){
                if(err){
                    console.log("Error in query all:")
                    console.log(err);
                }else{
                    parent.last_results = res.docs;
                    if(typeof(callback)==='function')
                        callback(res.docs)
                    else
                        parent.default_callback(res.docs)
                }
            });
        }
    });
    
    
}

//returns all dora_objects in database of type filetype
//sorted by object_index
dora_database_query.prototype.all_type = function(filetype,callback){
    parent = this;
    //make index
    this.cdb.db.createIndex({index: {fields: ["objind","file_type"]}}, function(err,res){
        if(err) console.log(err)
        else{
            sel = {"objind": {$gte: 0},"file_type": {$eq: filetype}};
            parent.cdb.db.find({selector: sel},function(err,res){
                if(err){
                    console.log("Error in query all:")
                    console.log(err);
                }else{
                    parent.last_results = res.docs;
                    if(typeof(callback)==='function')
                        callback(res.docs)
                    else
                        parent.default_callback(res.docs)
                }
            });
        }
    });
}


dora_database_query.prototype.parameter_query = function(callback){
    if(this.paramquery_started || this.dora_object_ids.length <= 0){
        return; //parameter query already started
                //if parameters have changed, this function
                //will get re-called after the query returns
    }
    var parent = this
    var docs = []
    this.parameters_updated=false; //taking care of these parameters now
    this.paramquery_started=true;
    var obj_list = this.dora_object_ids.slice(0);
    
    var accum_res = function(res){
        //check if parameters have been updated and we need to restart query
        if(parent.parameters_updated){
            parent.paramquery_started = false;
            //parameters have changed re call this
            return parent.parameter_query(callback);
        }
        //accumulate docs
        docs = docs.concat(res);
        
        if(obj_list.length <= 0){
            parent.paramquery_started = false;
            parent.last_results = docs
            if(typeof(callback)==='function')
                return callback(docs)
            else
                return parent.default_callback(docs)
        }else
            parent.dora_object_parameter_query(obj_list.pop(),accum_res)
    }
    
    
    this.dora_object_parameter_query(obj_list.pop(),accum_res);
    
    
}

dora_database_query.prototype.dora_object_parameter_query = function(obj_id, callback){
    var parent = this;
    //make index start with parameters
    var inds =  ["file_type"].concat(this.attributes.filter(function(p){return p.enabled}).map(function(p){
       if(p.enabled) 
           return "attributes."+p.name;
    }));
    inds = inds.concat(this.stats.filter(function(a){return a.enabled}).map(function(a){return "stats."+a.name;}));
    
    var query = [{"file_type": {$eq: parent.cdb.dora_objects[obj_id].type}}]
    var prep = "attributes.";
    query = query.concat(this.attributes.filter(function(p){
                return p.enabled && parent.cdb.dora_objects[obj_id].attributes.indexOf(p.name)>=0;
            }).map(qo2sel));
    
    prep = "stats."
    query = query.concat(this.stats.filter(function(p){return p.enabled}).map(qo2sel));
    var sel = {$and: query};
    
    
    this.cdb.db.createIndex({index: {fields: inds}}, function(err,res){
        if(err) console.log(err)
        else{
            parent.cdb.db.find({selector: sel},function(err,res){
                if(err){
                    console.log("Error in query all:")
                    console.log(err);
                }else{
                    parent.last_results = res.docs;
                    if(typeof(callback)==='function')
                        callback(res.docs)
                    else
                        parent.default_callback(res.docs)
                }
            });
        }
    });
    
    function qo2sel(qo){
        if(qo.enabled){
            switch(qo.type){
                case "list":
                    if(qo.values.length > 1){
                        return {$or: qo.values.map(function(v){var obj = {}; obj[prep + qo.name] = {$eq: v}; return obj; })};
                    }else{
                        obj = {};obj[prep+qo.name] = {$eq: qo.values[0]}; return obj;
                    }
                    break;
                case "range":
                    var obj = {};
                    if(qo.values.length<= 0 || qo.values.length >2)
                        console.log("range query has to many values",qo.values);
                    else if(qo.values.length === 2)
                        obj[prep+qo.name] = {$gte: qo.values[0], $lte: qo.values[1]};
                    else
                        obj[prep+qo.name] = {$eq:qo.values[0]}
                    return obj;
                case "boolean":
                    console.log("haven't implemented this yet, get on it")
                    break;
                default:
                    console.log("Shit unknown type in parameter query: ",qo.type);
                    
            }
        }
    }
}


/*dora_database_query.prototype.parameter_query = function(callback){
    if(this.paramquery_started)return; //parameter query already started
                                        //if parameters have changed, this function
                                        //will get re-called after the query returns
    var parent = this;
    this.parameters_updated=false; //taking care of these parameters now
    this.paramquery_started=true;
    //make index start with parameters
    var inds = this.attributes.filter(function(p){return p.enabled}).map(function(p){
       if(p.enabled) 
           return "attributes."+p.name;
    });
    inds = inds.concat(this.stats.filter(function(a){return a.enabled}).map(function(a){return "stats."+a.name;}));
    
    var prep = "attributes.";
    var query = this.attributes.filter(function(p){return p.enabled}).map(qo2sel);
    prep = "stats."
    query = query.concat(this.stats.filter(function(p){return p.enabled}).map(qo2sel));
    var sel = {$and: query};
    
    this.cdb.db.createIndex({index: {fields: inds}}, function(err,res){
        if(err) console.log(err)
        else{
            parent.cdb.db.find({selector: sel},function(err,res){
                parent.paramquery_started=false; //finished query
                if(parent.parameters_updated){
                    //parameters have changed re call this
                    return parent.parameter_query(callback);
                }
                if(err){
                    console.log("Error in query all:")
                    console.log(err);
                }else{
                    parent.last_results = res.docs;
                    if(typeof(callback)==='function')
                        callback(res.docs)
                    else
                        parent.default_callback(res.docs)
                }
            });
        }
    });
    
    function qo2sel(qo){
        if(qo.enabled){
            switch(qo.type){
                case "list":
                    if(qo.values.length > 1){
                        return {$or: qo.values.map(function(v){var obj = {}; obj[prep + qo.name] = {$eq: v}; return obj; })};
                    }else{
                        obj = {};obj[prep+qo.name] = {$eq: qo.values[0]}; return obj;
                    }
                    break;
                case "range":
                    var obj = {};
                    if(qo.values.length<= 0 || qo.values.length >2)
                        console.log("range query has to many values",qo.values);
                    else if(qo.values.length === 2)
                        obj[prep+qo.name] = {$gte: qo.values[0], $lte: qo.values[1]};
                    else
                        obj[prep+qo.name] = {$eq:qo.values[0]}
                    return obj;
                case "boolean":
                    console.log("haven't implemented this yet, get on it")
                    break;
                default:
                    console.log("Shit unknown type in parameter query: ",qo.type);
                    
            }
        }
    }
    
}
*/

dora_database_query.prototype.query = function(qo,callback){
    var parent = this; 
    var inds = [qo.name];
    var sel;
    switch(qo.type){
        case "list":
            sel = {$or: qo.values.map(function(v){var obj = {}; obj[prep + qo.name] = {$eq: v}; return obj; })};
            break;
        case "range":
            var obj = {};
            if(qo.values.length<= 0 || qo.values.length >2)
                console.log("range query has to many values",qo.values);
            else if(qo.values.length === 2)
                obj[qo.name] = {$gte: qo.values[0], $lte: qo.values[1]};
            else
                obj[qo.name] = {$eq:qo.values[0]}
            return obj;
        case "boolean":
            console.log("haven't implemented this yet, get on it")
            break;
        default:
            console.log("Shit unknown type in parameter query: ",qo.type);

    }
    
}

dora_database_query.prototype.query_id = function(id,callback){
    
}

dora_database_query.prototype.query_cluster_representative = function(doc,clust_type,callback){
    var id = doc.cluster[clust_type].id;
    var sel = {}  
    sel["cluster."+clust_type+".id"] = {$eq: id}
    sel["cluster."+clust_type+".representative"]={$eq: 1}
    parent.cdb.db.find({selector: sel},function(err,res){
        /*parent.paramquery_started=false; //finished query
        if(parent.parameters_updated){
            //parameters have changed re call this
            return parent.parameter_query(callback);
        }*/
        if(err){
            console.log("Error in query clust repr:")
            console.log(err);
        }else{
            parent.last_results = res.docs;
            if(typeof(callback)==='function')
                callback(res.docs)
            else
                parent.default_callback(res.docs)
        }
    });
}

dora_database_query.prototype.query_cluster_objectids = function(objids,callback){
    var sel = {}  
    sel["cluster.objectid"] = {$in: objids}
    parent.cdb.db.find({selector: sel},function(err,res){
        /*parent.paramquery_started=false; //finished query
        if(parent.parameters_updated){
            //parameters have changed re call this
            return parent.parameter_query(callback);
        }*/
        if(err){
            console.log("Error in query clust repr:")
            console.log(err);
        }else{
            parent.last_results = res.docs;
            if(typeof(callback)==='function')
                callback(res.docs)
            else
                parent.default_callback(res.docs)
        }
    });
}
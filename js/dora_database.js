function DORA_DB(){
    this.db = undefined; //pouch database contains all the documents
    this.object_types = []; //list of objects rendering types per object id
    this.object_ids = []; //list of unique object labels 
    //database contains attributes
    this.has_attrib = false;
    this.attrib_args = {}; //attributes with list of possible values
                           //can be numeric or strings 
    //database contains statistics
    this.has_stats = false;
    this.stat_args = {}; //stat list -> should be numeric
    //
    this.clust_args = {}; //cluster args;


    //old database for legacy operations
    this.old_format = undefined; 
}

DORA_DB.prototype.from_old_format = function(database){
    this.old_format = database;

    this.db = database.db;
    this.object_types = database.cinema_objects.filter(obj => obj.type);
    this.object_ids = database.cinema_objects.filter(obj => obj.label);
    this.attrib_args = database.cd.args;
    this.stat_args = database.stat_args;
    this.clust_args = this.clusters;

}





/** OLD STUFF BUT STILL USING IT FOR NOW**/


function dora_cluster(){
    this.type;
    this.cluster_ids = [];
    this.nneighbors = 0; //0 indicates none exist
    this.nsimilar = 0;  //0 indeicates none exist
    this.ndifferent = 0; //0 indicates none exist
    this.outlier_types = [];
}

function dora_database(cinema_dataset){
    this.cd = cinema_dataset;
    this.db = {};// pouch database
    this.cinema_objects = [] //list of object types, attributes, and label
    this.obj_types = []; //list of object types (for convenience)
    this.query = new dora_database_query(this);
    this.has_stats = false;
    this.stat_args = {}; //accumulated stat arguments
    this.has_clusters = false;
    this.clusters = {};// per type dora_clusters
}

dora_database.prototype.build_data_base = function(callback){
    var parent = this;
    
    if(this.cd.name === undefined)this.cd.name = "dora_explorer";
    //create database
    this.db = new PouchDB(this.cd.name,{size:500});
    
    
    //test if data base already exist
    //if not build database
    this.db.allDocs({include_docs: true},function(err,resp){
       if(err){//pdb hans't been created yet?
           console.log("error in alldocs???");
           console.log(err);
       }else{//clear pdb then create//we could test if its the same in the future but for now just rebuild
           console.log(resp);
            if(resp.total_rows!=0)
            {
                //database exist, ask if we should use it
                if(confirm("Use previous database?") == true) {
                    //set object types
                    for(obj of parent.cd.objects){
                        if(!(obj.type in parent.obj_types))
                            parent.obj_types.push(obj.type);
                    }
                    //set cinema objects
                    var argkeys;
                    for(objid in parent.cd.objects){
                        if(parent.cd.objects[objid].attributes)
                            argkeys = parent.cd.objects[objid].attributes;
                        else 
                            argkeys = Object.keys(parent.cd.args);
                        parent.cinema_objects.push({type: parent.cd.objects[objid].type, 
                                                label: parent.cd.objects[objid].label, 
                                                attributes: argkeys});
                    }
                    //accumulate stats if they exist
                    for(row of resp.rows){
                        if(row.doc.stats){
                            parent.has_stats = true;
                            accum_stats(row.doc.stats);
                        }
                        if(row.doc.cluster){
                            parent.has_clusters = true;
                            accum_clusters(row.doc.cluster);
                        }
                    }
                    if(parent.has_stats){ //just store the sorted unique values for each argument in stat_args
                        for(arg in parent.stat_args){
                            parent.stat_args[arg] = Array.from(new Set(parent.stat_args[arg])).sort(function(a, b){return a-b});
                        }
                    }
                    return callback(false);
                } else {
                    parent.destroy_db(function(){
                        parent.db = new PouchDB(parent.cd.name,{size:1000});
                        return build_db();
                    });
                    
                }
            }
           else{ //database is new/empty, just update it with docs
                return build_db();
           }
       }
    })
    
    //accumulate stats for ui later
    function accum_stats(stats){
        for(arg in stats){
            if(!(arg in parent.stat_args))
                parent.stat_args[arg] = [stats[arg]];
            else
                parent.stat_args[arg].push(stats[arg]);
        }
    }
    
    function accum_clusters(cluster){
        for(type in cluster){
            if(type === "objectid")
                continue;
            var cl = cluster[type];
            var ccl = parent.clusters[type];
            if(ccl === undefined){
               ccl = parent.clusters[type] = new dora_cluster();
               ccl.type = type;//this should be the same for all
            }
            //add cluster id
            if(ccl.cluster_ids.indexOf(cl.id) < 0)
                ccl.cluster_ids.push(cl.id)
            //max neighbors,similar,different
            if(cl.neighbors)
                ccl.nneighbors = Math.max(ccl.nneighbors,cl.neighbors.length);
            if(cl.similar)
                ccl.nsimilar = Math.max(ccl.nsimilar,cl.similar.length);
            if(cl.different)
                ccl.ndifferent = Math.max(ccl.ndifferent,cl.different.length);
            //outlier types
            if(cl.isoutlier)
            {
              if(!cl.outlier)alert("error: isoutlier but no type")
              for(var ot of cl.outlier){
                if(ccl.outlier_types.indexOf(ot) < 0)
                  ccl.outlier_types.push(ot)
              }
            }
            
        }
        
    }
    
    function build_db()
    {
        //create cartesion product of all arguments
        //not including object arguments
        var argkeys;
        var argvals;
        //holds the database entries
        var cinemadocs = [];
        var pertypeids = {};
        var objid = 0;
        //create database entries for first object, 
        //called recursively for subsequent objects in cinema reader
        addobject(); 
        
        //calls read stats and creates database entries for 
        //each analysis products defined by the cinema objects
        //in the current cinema dataset
        function addobject(){
            if(objid < parent.cd.objects.length)
            {
                if(parent.cd.objects[objid].attributes)
                    argkeys = parent.cd.objects[objid].attributes;
                else 
                    argkeys = Object.keys(parent.cd.args);
                
                
                argvals = argkeys.map(function(arg){return parent.cd.args[arg].values},this);
                argvals = cartesion(argvals);
                
                //Get rid of this
                //add object type to list if not already in there
                if(!(parent.cd.objects[objid].type in parent.obj_types)){
                    parent.obj_types.push(parent.cd.objects[objid].type);
                }
                
                //add to cinema object types
                parent.cinema_objects.push({type: parent.cd.objects[objid].type, 
                                            label: parent.cd.objects[objid].label, 
                                            attributes: argkeys});
                
                read_stats(parent.cd.objects[objid],0);
            }
            else{
                updatedb();
            }
        }
        //check if stats file exist
        function read_stats(obj, i){
            if(obj.stats_name_pattern){
                jQuery.getJSON(parent.cd.basedir+ cinema_replace_args(obj.stats_name_pattern, argkeys,argvals[i]), function(json){read_clusters(obj,i,json);})
                parent.has_stats = true;
            }else{
                read_clusters(obj,i)                        
            }
        }
        function read_clusters(obj, i, stats_json){
            if(obj.clusters_name_pattern){
                jQuery.getJSON(parent.cd.basedir+ cinema_replace_args(obj.clusters_name_pattern, argkeys,argvals[i]), function(json){add_d(obj,i,stats_json,json);})
                parent.has_clusters = true;
            }else{
                add_d(obj,i,stats_json)
            }
        }
        //create database entry
        function add_d(obj,i,stats_json,clust_json){
            var dattr = {};
            argkeys.forEach(function(a,j){dattr[a]=argvals[i][j];});
            var doc = {
                _id: parent.cd.name+"_"+obj.type+"_"+argvals[i].toString(),
                cinema_object: "true",
                cinema_name: parent.cd.name,
                file_fmt: parent.cd.basedir+cinema_replace_args(obj.name_pattern,argkeys,argvals[i]),
                file_type: obj.type,
                attributes: dattr,
                objind: i,
                objtypeind: objid
            }
            if(stats_json){
                for(k in stats_json){
                    stats_json[k] = parseFloat(stats_json[k])
                }
                accum_stats(stats_json);
                doc["stats"]=stats_json;
            } 
            
            if(clust_json){
                accum_clusters(clust_json);
                doc["cluster"] = clust_json;
            } 
            
    
            cinemadocs.push(doc)
            if(i+1 < argvals.length){
                read_stats(obj,i+1);
            }else {
                objid+=1;
                addobject()
            }
        }
        function updatedb(){
            parent.db.bulkDocs(cinemadocs,function(err,resp){ 
                if(err){
                    console.log("error updating pdb with bulkdocs");
                    console.log(err);
                }else{//database created, call callback function
                    if(parent.has_stats){ //just store the sorted unique values for each argument in stat_args
                        for(arg in parent.stat_args){
                            parent.stat_args[arg] = Array.from(new Set(parent.stat_args[arg])).sort(function(a, b){return a-b});
                        }
                    }
                    return callback(true);
                }
            });
        }
        
    }
    
}


dora_database.prototype.destroy_db = function(callback){
    this.db.destroy(function(err,resp){ //destroy old database
        if(err){ //something went wrong
            console.log("error destorying old database, something is wrong!!");
            console.log(err);
        }else{ //remove all docs and compact, then update
            console.log("database destroyed!")
            if(typeof(callback)==='function')
                return callback();
        }
    })
}

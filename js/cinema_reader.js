/*
 * Replace with standard header file
 */

function cinemaobjecttype(){
    this.type = undefined; // image,composite_images,graph,plot,etc
    this.label; //unique label for object
    this.name_pattern; 
    this.stats_name_pattern;
    this.clusters_name_pattern;
    this.obj_args = {}; //list of object args <- these are for rendering the object, not the database
    //how does this get rendered, is there a ui, how do we compare two or more objects
    this.attributes; //if only some of the attributes are used then include them as a list here
                     //should only be useful for ensemble reader
}


function cinemareader(jsonfn, cinema_dir){
    this.jsonfn = jsonfn; //json file name for cinema database
    this.basedir = cinema_dir; //base directory where json file is
    this.cdj = {}; //holds the parsed json argument
    this.name; //database name
    this.args; //arguments each has default, values, type, and label
    this.objects = []; //list of cinema object types
}

cinemareader.prototype.parse = function(callback){
    //clear previous data 
    delete this.cdj;
    delete this.args;
    delete this.objects;
    
    var parent = this;
    jQuery.getJSON(this.basedir+this.jsonfn,function(json){
        parent.cdj = json;
        parent.name = json.metadata.name;
        if(parent.name)parent.name = "cinema_database";
        
        switch(json.metadata.spec){
            case null:
            case undefined:
                console.log("Warning: No 'spec' field in metadata, assuming spec a, goodluck!")
            case 'a':
            case 'A':
            //case whatever the spec is actually called?
                parent.parse_specA(callback);
                break;
            case 'ensemble':
                parent.parse_ensemble(callback);
                break;
            default:
                console.log("Error: Unkown cinema specification: "+json.metadata.spec);
                return;
        }
    }).fail(function(jqXHR, textStatus, errorThrown) { alert('getJSON request failed! ' + textStatus); });
}

cinemareader.prototype.parse_specA = function(callback){
    this.args = this.cdj.arguments;
    obj = new cinemaobjecttype();
    obj.type = "cinemaimage";
    obj.name_pattern = this.cdj.name_pattern;
    obj.stats_name_pattern = this.cdj.stats_name_pattern; //not strictly part of cinema spec a but fine if its not there
    obj.clusters_name_pattern = this.cdj.clusters_name_pattern; //also not part of spec
    obj.label = "cinema spec a image database"
    //remove phi, theta, time and put in obj_args
    obj.obj_args = {}
    if("phi" in this.args){
        obj.obj_args.phi = this.args.phi;
        delete this.args.phi;
    }
    if("theta" in this.args){
        obj.obj_args.theta = this.args.theta;
        delete this.args.theta;
    }
    if("time" in this.args){
        obj.obj_args.time = this.args.time;
        delete this.args.time;
    }
    this.objects = [];
    this.objects.push(obj);
    
    if(typeof(callback) === 'function')
        return callback();
}

cinemareader.prototype.parse_ensemble = function(callback){
    this.args = this.cdj.arguments;
    this.objects = [];
    for(o of this.cdj.objects){
        var obj= new cinemaobjecttype();
        obj.obj_args = o.arguments;
        obj.type = o.type;
        obj.name_pattern = o.name_pattern;
        obj.stats_name_pattern = o.stats_name_pattern;
        obj.clusters_name_pattern = o.clusters_name_pattern
        obj.attributes = o.attributes; //should be undefined if not included
        if(o.label)
            obj.label = o.label;
        else
            obj.label = obj.type;
        this.objects.push(obj);
        
    }
    
    if(typeof(callback) === 'function')
        return callback();
}


//returns a string, where str_fmt has all substrings in args
//replaced with vals
//str_fmt is a string
//args is a list of strings
//vals is a list of replacement values
function cinema_replace_args(str_fmt, args, vals){
    str = str_fmt
    for(ind in args){
        str = str.replace('{'+args[ind]+'}',vals[ind])
    }
    return str;
}
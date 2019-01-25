/*
  Lets redo how we handle ui, utilize threejs or something like that
  when we add a filter have it show the distribution and highlight the portion that
  will be shown by updating the slider.
*/


/*
 * Takes a jquery node pointing to a div container for the user interface.
 */
function DORA_UI(){
  //div container for the ui,
  this.uinode = undefined;

  //object user interface
  this.objnode = undefined;

  //query user interface, two modes:
  //  query database
  //  query selection 
  //  controlled by a check box or similar;
  this.querynode = undefined;

  
  //cluster user interface.
  //only used if database has cluster information
  this.clusternode = undefined;
  
  //link to the dora database
  this.ddb;
}


/*
 * ui_node should be a jquery node for the user interface
 * div container. Probably from the current DORA_LAYOUT
 * 
 * dora_db should be a DORA_DB database and is used to 
 * create the user interface
 */
DORA_UI.prototype.setup = function(ui_node, dora_db){
  //user interface container 
  this.uinode = ui_node;
  //dora database
  this.ddb = dora_db;


  //add div for object based user interface 
  this.objnode = $("<div class='uicontainer' id='objui'></div>");
  //add div for query interface
  this.querynode = $("<div class 'uicontainer' id='queryui'></div>");
  if(this.ddb.)
  //add div for cluster interface
  this.clusternode = $("<div class 'uicontainer' id='clustui'></div>");
  this.uinode.append(this.objnode,this.querynode,this.clusternode);

  

  //add query element button 
  var addelem = $("<span class='spanbutton' id='addelem'>+ query element</span>");
  this.quer
  //auto query 

  //database vs selection query (auto select all from current query)

  //

}

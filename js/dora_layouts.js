/*
 * Replace with standard file header comment
 *
 */

/*
    DORA_LAYOUT provides the methods for creating 
    different layouts of the viewer, user interface and 
    header. The basic layout creates a header on the top
    of the screen 
*/
function DORA_LAYOUT(wrapper_eid)
{
    //should be a full screen wrapper div
    this.parentnode = $("#"+wrapper_eid);
    //creates a header with a temporary title that can be updated
    this.headernode = undefined;
    //creates a user interface panel
    this.uinode = undefined;
    //the main dora viewer
    this.viewernode = undefined;
    //a modal div for the about me dialog
    //assumes there is a modal div with id #about_dora
    //already defined, otherwise no about me dialog
    this.aboutnode = undefined;
    this.aboutlogo = undefined;
    //flag to tell if ui is currently pinned
    this.uipinned = true; 

}

DORA_LAYOUT.prototype.initstandard = function()
{
    var parent = this;
    //create header, user inteface and viewer divs
    
    //give headernode a generic title that we can update as needed
    this.headernode = $("<div class='dora_std_header'> \
                         <h1 id='htitle'>DORA Ensemble Analysis Framework</h1>\
                         </div>");
    this.uinode = $("<div class='dora_std_ui'>")
    this.viewernode = $("<div class='dora_std_viewer'>");
    
    //attach them to the parent node, typically a full screen wrapper
    this.parentnode.append(this.headernode,this.uinode,this.viewernode);

    //create a button for un/pinning the ui panel
    //create an ? button that opens the dialog
    var spbutton = $("<span class='spanbuttonrt' id='uipinbutton'>x</span>");
    //have ui pinned to start with
    this.uipinned = true;
    //add to ui panel
    this.uinode.append(spbutton);
    spbutton.click(function(){
        //swap flag
        parent.uipinned = !parent.uipinned;
        if(parent.uipinned)spbutton.html("x");
        else spbutton.html("&equiv;")
        parent.std_ui_transition(!parent.uipinned);
    });

    //create about me button and setup dialog
    this.about_me_setup();
}


/*call back for standard ui transitions
  this slides the ui in and out if enable_flag is true
  if false then the ui is kept static 
*/
DORA_LAYOUT.prototype.std_ui_transition = function(enable_flag)
{
    var uiwidth = this.uinode.width();
    //create transition on ui panel, this assumes that it is
    //layed out as a verticle panel on the left side of the screen
    //we will slide the panel in and out as the user hovers and transition
    //from translucent to mostly opaque
    if(enable_flag){
        this.viewernode.stop().animate({marginLeft: 10},500);
        this.headernode.stop().animate({marginLeft: 0},500);
        this.uinode.hover(
            function(){
                $(this).stop().animate({left:"0px",opacity:.8}, 500);
            }, 
            function(){
                var width =uiwidth-10;
                $(this).stop().animate({left: - width,opacity:.2},500);
            }
        );
    }
    else{
        this.uinode.off('mouseenter mouseleave'); //turn off hover
        this.viewernode.stop().animate({marginLeft: uiwidth},500);
        this.headernode.stop().animate({marginLeft: uiwidth},500);
    }
}

DORA_LAYOUT.prototype.about_me_setup = function(){
    var parent = this;
    this.aboutnode = $("#about_dora");
    //test if no about me node
    if(this.aboutnode.length < 1){
        //we don't really need an about dora, so just ignore
        //and set the aboutnode to undefined
        this.aboutnode = undefined;
        console.log("No #about_dora div available, skipping about me dialog");
        return;
    }
    
    //create an ? button that opens the dialog
    var spbutton = $("<span class='spanbuttonrt' id='about_me_button'>?</span>");
    //add to ui panel
    this.uinode.append(spbutton);

    var showabout = function(){
        parent.aboutnode.css('display','block')
        //add an interactive logo
        if(parent.aboutlogo == undefined){
            parent.aboutlogo = new GLINTERACTIVELOGO("interactivelogo","resources/logo.jpg");
            parent.aboutlogo.initGL();
        }
        parent.aboutlogo.render();
    }; 

    spbutton.click(showabout);

    showabout();

    //close when we hit the x or click outside of the model dialog box
    $("#close_about_me").click(function(){
        parent.aboutnode.css('display','none');
    });
    this.aboutnode.click(function(){
        parent.aboutnode.css('display','none');
    });
    
}
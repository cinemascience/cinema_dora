/*
 * An extendable mouse handler for capturing different mouse events, 
 * but specifically handles mouse drag events.
 * Attaches to a document element, usually a div or canvas
 */
function MOUSE_DRAG(elem){
    //dom element
    this.elem = elem;

    //mouse information
    this.mx = -1; //last captured local mouse position x
    this.my = -1; //and y, given in pixels

    this.rmx = 0; //mx and my scaled between 0 and 1,
    this.rmy = 0; //given relative to the dom elements size

    this.gx = -1; //last captured global mouse positions
    this.gy = -1; // x and y 

    this.buttons = []; //current mouse buttons that are depressed
                       //0 - left, 1 - middle, 2 - right
    
    this.dx = 0;  //change in position for x and y
    this.dy = 0;  //during a drag, in pixels

    this.rdx = 0;   //change in relative position for x and y
    this.rdy = 0;   //during a drag, scaled between 0 and 1
                    //relative to the dom element size

    //each callback function is expected to take a single argument
    //which will point to "this" object
    this.presscb = undefined; //call back function for press event
    this.releasecb = undefined;// release event
    this.dragcb = undefined; // and drag event;


    //closures for setting and removing events
    //this is required so that "this" is passed corectly
    //when the event callbacks are called.
    var parent = this;
    //mouse press event
    this.mpe = function(evt){parent.mouse_press_event(evt);}
    //mouse release event
    this.mre = function(evt){parent.mouse_release_event(evt);}
    //mouse drag event
    this.mde = function(evt){parent.mouse_drag_event(evt);}
}

/*
 * Initializes the mouse handler and attaches it 
 * the dom element
 */
MOUSE_DRAG.prototype.attach = function()
{
    var parent = this;
    //clear previous button state
    this.buttons = [];
    //add the mouse press event
    //requires a closure to keep "this"
    this.elem.addEventListener("mousedown",this.mpe);
}

/*
 * Removes the mouse handler from the DOM element
 */
MOUSE_DRAG.prototype.dettach = function()
{
    var parent = this;
    //check if any buttons currently clicked
    if(this.buttons.length > 0){
        window.removeEventListener("mouseup",this.mre);
        this.elem.removeEventListener("mousemove",this.mde);
    }
    var works = this.elem.removeEventListener("mousedown",this.mpe);

}


MOUSE_DRAG.prototype.update_position = function(evt){
    //get x,y positions locally and globally
    this.mx = evt.clientX;
    this.my = evt.clientY;
    var bRect = this.elem.getBoundingClientRect();
    this.rmx = (this.mx - bRect.left)/bRect.width;
    this.rmy = (this.my - bRect.top)/bRect.height;
    this.gx = this.mx + bRect.left;
    this.gy = this.my + bRect.top;
}

/*
 * Mouse press event (down)
 */ 
MOUSE_DRAG.prototype.mouse_press_event = function(evt){
    this.update_position(evt);

    //clear deltas for new drag
    this.dx=0;
    this.dy=0;
    this.rdx = 0;
    this.rdy = 0;

    //add button to buttons list
    if(this.buttons.includes(evt.button)){
        Console.log("Weird same button generated multiple mouse press envents, button: "+evt.button);
        return;
    }
    this.buttons.push(evt.button);

    //If this is the firs mouse button to be pressed, set up the drag and release handlers
    if(this.buttons.length === 1){
        //add mouseup handler, this needs to happen for the whole windown in case we drag off
        //the dom element.
        window.addEventListener("mouseup",this.mre);
        //add drag handler, only update drag when mouse is on the element
        this.elem.addEventListener("mousemove",this.mde);
        //prevent mouse down from having an effect on the main browser window
        if (evt.preventDefault) {
            evt.preventDefault();
        }
    }
    //if there is a callback assigned, use it
    if(typeof this.presscb === 'function'){
        this.presscb(this);
    }
}

/*
 * Mouse release event (up)
 */ 
MOUSE_DRAG.prototype.mouse_release_event = function(evt){
    this.update_position(evt);

    //remove button from the list, if not there complain
    var bind = this.buttons.indexOf(evt.button);
    if(bind < 0){
        console.log("Weird same button generated multiple mouse press envents, button: "+evt.button)
    }
    this.buttons.splice(bind,1);

    //if no buttons being pressed
    if(this.buttons.length === 0){
        window.removeEventListener("mouseup",this.mre);
        this.elem.removeEventListener("mousemove",this.mde);
    }

    if(typeof this.releasecb === 'function'){
        this.releasecb(this);
    }
}

/*
 * Mouse drag event (Move with button pressed)
 */ 
MOUSE_DRAG.prototype.mouse_drag_event = function(evt){
    //store previous positions
    var _mx = this.mx;
    var _my = this.my;
    var _rmx = this.rmx;
    var _rmy = this.rmy;

    //update position and get deltas
    this.update_position(evt);
    this.dx = this.mx - _mx;
    this.dy = this.my - _my;
    this.rdx = this.rmx - _rmx;
    this.rdy = this.rmy - _rmy;

    if(typeof this.dragcb === 'function'){
        this.dragcb(this);
    }
}
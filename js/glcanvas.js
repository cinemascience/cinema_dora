

/*object for cretaing a webgl 1.0 canvas
  Utilizes the TWGL library and assumes 
  twgl-full[-min].js is already loaded
*/
function GLCANVAS(canvasid){

    this.canvas = document.getElementById(canvasid);
    this.gl = this.canvas.getContext("webgl");
    if(!this.gl){
        console.log("Error: Creating GL Context with webgl");
    }

    //list of shader programs, normally we will only
    //need one but for multipass algorithms having multiple
    //is preferable
    this.glprogs = [];//list of twgl programinfo object

    //contains a list of uniform objects, 1 per glprog
    //each object contains the shader uniforms and there values
    //which are passed to the shader before rendering
    this.gluniforms = [];

    //list of objects for rendering
    //each one should be an objedt with arrays for
    // postions normals texture coordinates and indices
    this.globjs = [];//list of twgl bufferinfo 

    //list of webgl textures
    this.gltexs = [];

    //color to clear the canvas to
    this.ccol = {r: 1.0, g: 1.0, b: 1.0, a: 1.0};

    //dirty flag === true implies we need to re render the scene
    //because something has changed.
    this.dirty = false;


    // the following may stay undefined depending on user configurations

    //if mouse interactions are needed, use new MOUSE_DRAG and set up
    //in initGL
    this.mouse = undefined;

    //set by addBlitProg if its used for blitting textures to a framebuffer
    this.blit_ind = undefined;

    //set by addDefaultTex if a default texture is needed 
    //this should usually be something like a simple checkerboard
    this.default_tex_ind = undefined;


    //set by addfullscreenquad this points to a full screen quad
    //object defined in clip space, useful for the blit shader 
    this.fsq_ind = undefined;
}

/*
 * Some convenience shaders for common tasks
 */ 


 /*
  * blit*s are a set of shaders for drawing a texture onto
  * the current framebuffer.  This is essentially the blit
  * operation that is missing from webgl 1.0
  * Assumes a quad defined in clip space (see addFullScreenQuad())
  */
GLCANVAS.prototype.blitvs = `
attribute vec4 position;
attribute vec2 texcoord;

varying vec2 uv;

void main()
{
  gl_Position = position;
  uv = texcoord;
}
`

GLCANVAS.prototype.blitfs = `

precision mediump float;

varying vec2 uv;

uniform sampler2D u_image;

void main() {
  vec4 tcol = texture2D(u_image, uv);
  gl_FragColor = tcol;
}
`

/*
 * Returns an error function that prints the error location
 * and an error message to the console.
 */
GLCANVAS.prototype.error_func = function(error_location_str){
    return function(err_msg){
        console.log("ERROR in " + error_location_str + err_msg);
    }
}

/*
 * Compiles a gl shader program from the vertex and fragment source,
 * and adds it to the list of glprogs.
 * On success prints the index of the compiled program in the glprogs.
 * Prints an error to console and returns undefined on failure to compile
 */
GLCANVAS.prototype.addGLProg = function(vert_source, frag_source){

    //compiles the program and prints an error on failure.
    var proginfo = twgl.createProgramInfo(this.gl,[vert_source,frag_source],
                    this.error_func("create program info"));

    if(proginfo){
        this.glprogs.push(proginfo);
        //add an empty uniform object for this program
        this.gluniforms.push({});
        return this.glprogs.length - 1;
    }
    else{
        return undefined;
    }

    this.dirty = true;

}

/*
 * Convenience function compiles the blit shaders for rendering
 * a texture to a full screen quad
 * Stores the index for this program in this.blit_ind
 */
GLCANVAS.prototype.addBlitProg = function(){
    //create a default texture if it doesn't exist 
    //this way we always have something to blit to the screen
    //if for example we are waiting for an asynchronous render
    //or an asynchronous image read to create the texture we
    //really want
    if(this.default_tex_ind === undefined){
        this.addDefaultTex()
    }

    //create a full screen quad in clip space
    //so we can map a texture to it, emulating the
    //blit operation
    if(this.fsq_ind === undefined){
        this.addFullScreenQuad();
    }

    //compile blit shader
    this.blit_ind = this.addGLProg(this.blitvs,this.blitfs);

    const uniforms = {
        u_image: this.gltexs[this.default_tex_ind]
    };
    this.setUniforms(uniforms,this.blit_ind);

    return this.blit_ind;
}



/*
 * Adds a gl object to render.
 * All arrays are flat (1D);
 * pos: list of vertex positions (3 vector)
 * norm: list of normals (3 vector)
 * texc: list of texture coordinates (2 vector)
 * inds: list of triangle indices (3 ints)
 * 
 * returns objects index in globjs
 */
GLCANVAS.prototype.addGLObj = function(pos,norm,texc,inds){
    var arrays = { 
        position: pos,
        normal: norm,
        texcoord: texc,
        indices: inds
    };

    var bufferinfo = twgl.createBufferInfoFromArrays(this.gl,arrays);

    var ind = this.globjs.length;

    this.globjs.push(bufferinfo);

    this.dirty = true;

    return ind;

}

/* 
 * Convenience function for creating a full screen quad
 * object, this assumes that no projecttions are used
 * and defines vertices in the clipping space (-1,-1,0)x(1,1,0)
 * 
 * Stores the object index for the full screen quad in 
 * this.fsq_ind;
 */
GLCANVAS.prototype.addFullScreenQuad = function(){

    //arrays for a full screen quad in clip space
    var position = [-1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0,  1.0, 0.0, -1.0,  1.0, 0.0,1.0, -1.0, 0.0, 1.0,  1.0, 0.0];
    var normal = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1]
    var texcoord = [0.0,0.0,1.0,0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0,1.0];
    var indices = [0,1,2,3,4,5];
    this.fsq_ind =  this.addGLObj(position,normal,texcoord,indices);   
    return this.fsq_ind;

}

/*
 * This function directly takes gl textures and adds them
 * to the gltex list, returning the index.
 * 
 * We don't create textures here as this often involves
 * asyncronously reading in a texture off the network, so
 * this function can be used in the callback for when the 
 * image is loaded.  Plus textures have lots of possible options
 * which it doesn't make sense to enumerate here.
 */
GLCANVAS.prototype.addTextures = function(gltex){
    this.gltexs.push(gltex);
    this.dirty = true;
    return this.gltexs.length -1;
}

/*
 * Creates a simple default texture which can be used
 * in place of an image texture while its being loaded
 * specifically this is a grey and white 2x2 checkerboard
 * 
 * stores texture index in this.default_tex_ind
 */
GLCANVAS.prototype.addDefaultTex = function(){
    var parent = this;
    const tex = twgl.createTexture(this.gl, {
        min: parent.gl.NEAREST,
        mag: parent.gl.NEAREST,
        src: [
            255, 255, 255, 255,
            192, 192, 192, 255,
            192, 192, 192, 255,
            255, 255, 255, 255,
        ],
    });
    this.default_tex_ind = this.addTextures(tex);
    this.dirty = true;
}

/*
 *  Sets ununiform objects 
 */
GLCANVAS.prototype.setUniforms = function(uniforms, progind = 0){
    //error, tried to set uniform for a program that hasn't been
    //created
    if(progind < 0 || progind >= this.gluniforms.length){
        return undefined;
    }
    
    this.gluniforms[progind] = uniforms;
    this.dirty = true;
    return progind;
}

/*
 *  Resizes the canvas size so that its pixel accurate wiht the actual
 *  width and height of the displayed canvas/div
 */
GLCANVAS.prototype.resizeGL = function(){
    if(twgl.resizeCanvasToDisplaySize(this.canvas,window.devicePixelRatio)){
        //resize the viewport to the entire canvas size
        this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
        this.dirty = true;
    }
}


GLCANVAS.prototype.clearColorGL = function(red, green, blue, alpha){
    this.ccol = {r:red,g:green,b:blue,a:alpha};

    this.clearColorGL();
}

GLCANVAS.prototype.clearColorGL = function(){
    this.gl.clearColor(this.ccol.r,this.ccol.g,this.ccol.b,this.ccol.a);
    this.dirty = true;
}

/*
 * Initialize GL, this should be mostely overwritten for 
 * specific applications.
 */
GLCANVAS.prototype.initGL = function(){
    this.clearColorGL();
    this.resizeGL();

    //dirty flag already set in clearColor and resize functions
}

/*
 * Convenience function, renders a texture to a full screen quad
 * This can be used to blit a texture onto the current framebuffer
 * since the blit funciton is missing from webgl 1.0
 * 
 * Takes an actual gl_texture object instead of an index
 * so that we can blit textures we don't necessarily store in
 * this.texs, for example a framebuffer texture 
 */
GLCANVAS.prototype.blittex = function(gl_tex){
    //if not blit program already compiled do so now
    if(this.blit_ind===undefined){
        this.addBlitProg();
    }

    //set blit program
    var proginfo = this.glprogs[this.blit_ind];
    this.gl.useProgram(proginfo.program);

    var uniforms = this.gluniforms[this.blit_ind];
    //send texture information as uniform to shader
    uniforms.u_image = gl_tex;
    twgl.setUniforms(proginfo, uniforms);

    //add full screen quad geometry
    var objbuff = this.globjs[this.fsq_ind];
    twgl.setBuffersAndAttributes(this.gl, proginfo, objbuff);

    this.gl.drawElements(this.gl.TRIANGLES, objbuff.numElements, this.gl.UNSIGNED_SHORT, 0);
    
}

/*
 * Render the scene, this should be overwritten for specific
 * applications, generally the "diry" flag is cleared after 
 * a render
 */
GLCANVAS.prototype.render = function(time) {
    this.dirty = false;
}


/*
 * Uses the window animation loop to animate the 
 * scene
 */
GLCANVAS.prototype.animate = function(){
    var parent = this;

    function render_animation(time){
        parent.render(time);
        parent.dirty = true;
        requestAnimationFrame(render_animation);
    }
    requestAnimationFrame(render_animation);

}



/*
 * Object for using webgl for image manipulation
 * Basically this will create a full canvas quad and apply
 * an image texture on it.  The shader functions can then be
 * used for manipulation etc.
 * 
 * inherits from GLCANVAS
 */
function GLIMAGECANVAS(canvasid, image_src){
    //calls the "constructor" of the GLCANVAS class
    GLCANVAS.call(this,canvasid);



    //list of images for manipulation in image canvas
    //originally this contains the base image, but we
    //can add multiple for things like compositting
    this.images = [];

    //need a default texture before adding images
    this.addDefaultTex();

    //create a texture from the image src
    this.addImage(image_src);

}

//GLIMAGECANVAS "inherites" the GLCANVAS prototype
GLIMAGECANVAS.prototype = Object.create(GLCANVAS.prototype);

/*
 *  Creates a texutre from the image source and adds
 *  it to the images and gltexs arrays. Returns the index
 *  into the images array which also links to the texture index.
 */
GLIMAGECANVAS.prototype.addImage = function(image_src){
    var parent = this;
    var img_ind = this.images.length;

    //create a new object add it tot he images array
    //at first this should point to a dummy texture
    //a callback should update the texture index after 
    //the image is loaded and the new texture is created
    this.images.push({src: image_src, texind: this.default_tex_ind}); 

    //creates image texture, this loads the image asynchonously
    //the callback function updates the image array, and marks the
    //state as dirty and asks for a re-render
    var imgtex = twgl.createTexture(this.gl, {
        min: parent.gl.LINEAR,
        mag: parent.gl.LINEAR,
        flipY: true,
        src: image_src
    },function(err,texture,image){
        if(err){
            console.log("Error loading texture for "+ parent.iamges[img_ind].src);
            return;
        }
        var ind = parent.addTextures(texture);
        parent.images[img_ind].texind = ind;
        parent.dirty = true;
        parent.render();
    });

}


GLIMAGECANVAS.prototype.initGL = function(){
    //compile shaders 
    this.addBlitProg();


    //set the image texture to display
    //if the images array is not empty, use that
    //texture 
    //(may be a default texture while image is being loaded)
    var texind = this.default_tex_ind;
    if(this.images.length > 0){
        texind = this.images[0].texind;
    }
    

    this.gl.clearColor(.8,.8,.8,.2);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.dirty = true;

    return true;

}

GLIMAGECANVAS.prototype.render = function(){
    
    //resize canvas if needed.
    this.resizeGL();
    
    this.gl.glClear();
    //get the last image added to the images list
    var texind = this.images[this.images.length-1].texind;
    var gl_tex = this.gltexs[texind];

    //blit texture to canvas
    this.blittex(gl_tex);    

    this.dirty = false;
}